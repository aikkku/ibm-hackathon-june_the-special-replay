"""
CV pipeline: YOLO pitch/player/ball detection + homography + TeamClassifier.
Mirrors sports/examples/soccer/main.py (RADAR mode) as closely as possible.

Key improvements over single-frame naive extraction:
  - Best-frame selection: scan ±3 frames from target, pick the one with the
    most confident pitch keypoints → more reliable homography
  - Confidence-filtered mask: only include keypoints above a confidence
    threshold → avoids biasing the homography with uncertain detections
  - Prewarm: TeamClassifier fitted on crops from the full video (two-pass
    approach matching the sports example), cached per video path
"""
import cv2
import numpy as np
from pathlib import Path
import base64

DATA_DIR = Path(__file__).parent / "data"

BALL_CLASS_ID       = 0
GOALKEEPER_CLASS_ID = 1
PLAYER_CLASS_ID     = 2
REFEREE_CLASS_ID    = 3

# ── Model cache ───────────────────────────────────────────────────────────────
_models: dict = {}

_MODEL_IDS = {
    "ball":   "1isw4wx-MK9h9LMr36VvIWlJD6ppUvw7V",
    "player": "17PXFNlx-jI7VjVo_vQnB1sONjRyvoB-q",
    "pitch":  "1Ma5Kt86tgpdjCTKfum79YMgNnSjcoOyf",
}

def _ensure_model(name: str, path: "Path") -> None:
    """Download model weight from Google Drive if not present."""
    if path.exists():
        return
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    file_id = _MODEL_IDS.get(name)
    if not file_id:
        raise FileNotFoundError(f"Unknown model '{name}' and no local file at {path}")
    print(f"[cv] downloading {name} model (~130 MB)…")
    import gdown
    gdown.download(f"https://drive.google.com/uc?id={file_id}", str(path), quiet=False)

def _get_model(name: str):
    if name in _models:
        return _models[name]
    from ultralytics import YOLO
    path = DATA_DIR / f"football-{name}-detection.pt"
    _ensure_model(name, path)
    _models[name] = YOLO(str(path))
    return _models[name]


# ── TeamClassifier cache (keyed by video path) ───────────────────────────────
_fitted_classifiers: dict = {}

def prewarm_classifier(video_path: str) -> None:
    """
    Fit TeamClassifier on crops from across the full video (mirrors sports
    example run_radar() first pass).  Called from /prewarm in a background
    thread — never blocks HTTP requests.
    """
    if video_path in _fitted_classifiers:
        return
    try:
        import supervision as sv
        from sports.common.team import TeamClassifier
    except ImportError:
        return

    player_model = _get_model("player")
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    n_samples = max(1, min(8, total_frames // 60))
    stride    = max(1, total_frames // n_samples)

    all_crops, sampled = [], 0
    for fi in range(0, total_frames, stride):
        cap.set(cv2.CAP_PROP_POS_FRAMES, fi)
        ret, sf = cap.read()
        if not ret:
            continue
        result = player_model(sf, imgsz=1280, verbose=False)[0]
        dets   = sv.Detections.from_ultralytics(result)
        p_dets = dets[dets.class_id == PLAYER_CLASS_ID]
        all_crops += [sv.crop_image(sf, xyxy) for xyxy in p_dets.xyxy]
        sampled += 1
        if len(all_crops) >= 100:
            break
    cap.release()

    print(f"[cv] prewarm: {len(all_crops)} crops from {sampled} frames")
    tc = TeamClassifier(device="cpu")
    if len(all_crops) >= 2:
        tc.fit(all_crops)
    _fitted_classifiers[video_path] = tc


# ── Best-frame selector ───────────────────────────────────────────────────────
def _best_pitch_frame(video_path: str, timestamp_ms: int, pitch_model, sv,
                      conf_thresh: float = 0.5):
    """
    Scan ±3 frames around timestamp_ms and return the frame + keypoints object
    that has the most keypoints with confidence ≥ conf_thresh.

    This gives a more stable homography than a single arbitrary frame — mirrors
    the sports example's temporal stability (they process every frame of the
    video, we find the locally best frame).
    """
    cap = cv2.VideoCapture(video_path)
    fps = max(1.0, cap.get(cv2.CAP_PROP_FPS))
    frame_ms = 1000.0 / fps

    best_frame, best_kp, best_n = None, None, -1

    for offset in [0, -1, 1, -2, 2, -3, 3]:
        t = max(0, timestamp_ms + offset * frame_ms)
        cap.set(cv2.CAP_PROP_POS_MSEC, t)
        ret, f = cap.read()
        if not ret or f is None:
            continue
        try:
            result = pitch_model(f, verbose=False)[0]
            kp = sv.KeyPoints.from_ultralytics(result)
            if kp.xy is None or len(kp.xy) == 0:
                continue
            xy   = kp.xy[0]           # (32, 2)
            conf_arr = (kp.keypoint_confidence[0]
                        if (kp.keypoint_confidence is not None and len(kp.keypoint_confidence) > 0)
                        else np.ones(len(xy)))
            pos_mask  = (xy[:, 0] > 1) & (xy[:, 1] > 1)
            conf_mask = conf_arr >= conf_thresh
            n = int((pos_mask & conf_mask).sum())
            if n > best_n:
                best_n, best_frame, best_kp = n, f, kp
        except Exception as e:
            print(f"[cv] frame offset {offset}: {e}")

    cap.release()
    print(f"[cv] best frame: {best_n} confident keypoints (conf≥{conf_thresh})")
    return best_frame, best_kp


# ── GK team resolution (identical to sports example) ─────────────────────────
def _resolve_gk_teams(players, players_team_id, goalkeepers, sv):
    if len(goalkeepers) == 0 or len(players) < 2:
        return np.zeros(len(goalkeepers), dtype=int)

    gk_xy      = goalkeepers.get_anchors_coordinates(sv.Position.BOTTOM_CENTER)
    players_xy = players.get_anchors_coordinates(sv.Position.BOTTOM_CENTER)

    t0 = players_xy[players_team_id == 0]
    t1 = players_xy[players_team_id == 1]
    if len(t0) == 0 or len(t1) == 0:
        return np.zeros(len(goalkeepers), dtype=int)

    c0, c1 = t0.mean(axis=0), t1.mean(axis=0)
    return np.array([0 if np.linalg.norm(g - c0) < np.linalg.norm(g - c1) else 1
                     for g in gk_xy])


# ── Color-based team classifier (KMeans fallback when sports lib unavailable) ─
def _color_team_classify(frame, player_detections, sv) -> np.ndarray:
    """
    Cluster players into 2 teams by jersey color using KMeans.
    Samples the central 50% of each crop (avoids pitch green at borders).
    """
    from sklearn.cluster import KMeans

    crops = [sv.crop_image(frame, xyxy) for xyxy in player_detections.xyxy]
    features = []
    for crop in crops:
        if crop is None or crop.size == 0:
            features.append([128.0, 128.0, 128.0])
            continue
        h, w = crop.shape[:2]
        y1, y2 = max(0, h // 4), min(h, 3 * h // 4)
        x1, x2 = max(0, w // 4), min(w, 3 * w // 4)
        jersey = crop[y1:y2, x1:x2]
        if jersey.size == 0:
            features.append([128.0, 128.0, 128.0])
            continue
        # Use HSV so color distance is perceptually meaningful
        hsv = cv2.cvtColor(jersey, cv2.COLOR_BGR2HSV)
        features.append(hsv.reshape(-1, 3).mean(axis=0).tolist())

    features = np.array(features, dtype=np.float32)
    try:
        labels = KMeans(n_clusters=2, n_init=10, random_state=42).fit_predict(features)
        print(f"[cv] color KMeans: team0={int((labels==0).sum())} team1={int((labels==1).sum())}")
        return labels.astype(int)
    except Exception as e:
        print(f"[cv] color KMeans failed: {e}")
        return np.zeros(len(crops), dtype=int)


# ── Main extraction function ──────────────────────────────────────────────────
def extract_frame_state(video_path: str, timestamp_ms: int) -> dict:
    """
    Run the full CV pipeline on the best frame near timestamp_ms.
    Returns player/ball positions in StatsBomb 120×80 coordinates plus
    a base64 radar image generated by the sports library's own renderer.
    """
    # ── 1. Import deps ────────────────────────────────────────────────────
    try:
        import supervision as sv
        from sports.configs.soccer import SoccerPitchConfiguration
        from sports.common.view import ViewTransformer
        from sports.annotators.soccer import draw_pitch, draw_points_on_pitch
        CONFIG = SoccerPitchConfiguration()
    except ImportError as e:
        return {
            "error": f"Missing dependency: {e}. Install ultralytics, supervision, and the sports library.",
            "players": [], "ball": None,
        }

    # ── 2. Pick the best frame near the target timestamp ──────────────────
    pitch_model = _get_model("pitch")
    frame, keypoints = _best_pitch_frame(video_path, timestamp_ms,
                                         pitch_model, sv, conf_thresh=0.5)
    if frame is None:
        return {"error": "Could not read any frame at that timestamp",
                "players": [], "ball": None}

    H, W = frame.shape[:2]

    # ── 3. Build confidence-filtered pitch mask + homography ──────────────
    kp_xy  = keypoints.xy[0]           # (32, 2) pixel coords
    conf   = (keypoints.keypoint_confidence[0]
              if (keypoints.keypoint_confidence is not None and len(keypoints.keypoint_confidence) > 0)
              else np.ones(len(kp_xy)))

    # Primary mask: well-positioned AND confident
    mask_strict = (kp_xy[:, 0] > 1) & (kp_xy[:, 1] > 1) & (conf >= 0.5)
    n_strict = int(mask_strict.sum())

    # Fall back to position-only if too few confident keypoints
    if n_strict < 4:
        mask = (kp_xy[:, 0] > 1) & (kp_xy[:, 1] > 1)
        print(f"[cv] strict mask gave {n_strict} kp — falling back to pos-only mask")
    else:
        mask = mask_strict

    n_kp     = int(mask.sum())
    pitch_ok = bool(n_kp >= 4)
    print(f"[cv] pitch keypoints used: {n_kp}/32  pitch_ok={pitch_ok}")

    # Log which config x-range the detected keypoints cover
    if n_kp > 0:
        config_pts = np.array(CONFIG.vertices)[mask]
        print(f"[cv] config coverage: x=[{config_pts[:,0].min():.0f},{config_pts[:,0].max():.0f}]"
              f"  y=[{config_pts[:,1].min():.0f},{config_pts[:,1].max():.0f}]  (full: 0-{CONFIG.length}, 0-{CONFIG.width})")

    transformer = None
    if pitch_ok:
        try:
            transformer = ViewTransformer(
                source=kp_xy[mask].astype(np.float32),
                target=np.array(CONFIG.vertices)[mask].astype(np.float32),
            )
            print(f"[cv] homography OK")
        except Exception as e:
            print(f"[cv] homography failed: {e}")

    def px_to_sb(pts_px: np.ndarray) -> np.ndarray:
        """Batch pixel → StatsBomb (120×80), same math as render_radar."""
        if transformer is not None and len(pts_px) > 0:
            try:
                cm   = transformer.transform_points(pts_px.astype(np.float32))
                sb_x = np.clip(cm[:, 0] / CONFIG.length * 120, -5.0, 125.0)
                sb_y = np.clip(cm[:, 1] / CONFIG.width  * 80,  -5.0,  85.0)
                return np.stack([sb_x, sb_y], axis=1)
            except Exception as e:
                print(f"[cv] batch transform failed: {e}")
        # No homography — linear fallback
        return np.stack([pts_px[:, 0] / W * 120, pts_px[:, 1] / H * 80], axis=1)

    # ── 4. Player detection ───────────────────────────────────────────────
    try:
        player_model  = _get_model("player")
        player_result = player_model(frame, imgsz=1280, verbose=False)[0]
        all_dets      = sv.Detections.from_ultralytics(player_result)
    except Exception as e:
        return {"error": f"Player detection failed: {e}", "players": [], "ball": None}

    players     = all_dets[all_dets.class_id == PLAYER_CLASS_ID]
    goalkeepers = all_dets[all_dets.class_id == GOALKEEPER_CLASS_ID]
    referees    = all_dets[all_dets.class_id == REFEREE_CLASS_ID]

    # ── 5. Ball detection ─────────────────────────────────────────────────
    ball_out = None
    try:
        ball_model = _get_model("ball")

        def _ball_cb(img_slice: np.ndarray) -> sv.Detections:
            return sv.Detections.from_ultralytics(
                ball_model(img_slice, imgsz=640, verbose=False)[0])

        slicer    = sv.InferenceSlicer(callback=_ball_cb,
                                       overlap_filter=sv.OverlapFilter.NONE,
                                       slice_wh=(640, 640))
        ball_dets = slicer(frame).with_nms(threshold=0.1)
        if len(ball_dets) > 0:
            bxy  = ball_dets.get_anchors_coordinates(sv.Position.CENTER)[:1]
            bsb  = px_to_sb(bxy)[0]
            ball_out = {
                "x": round(float(bsb[0]), 2), "y": round(float(bsb[1]), 2),
                "videoX": round(float(bxy[0, 0]) / W * 100, 1),
                "videoY": round(float(bxy[0, 1]) / H * 100, 1),
            }
    except Exception as e:
        print(f"[cv] ball detection failed: {e}")

    # ── 6. Team classification ────────────────────────────────────────────
    player_teams = np.zeros(len(players), dtype=int)
    if len(players) >= 2:
        try:
            from sports.common.team import TeamClassifier
            player_crops = [sv.crop_image(frame, xyxy) for xyxy in players.xyxy]
            if video_path in _fitted_classifiers:
                tc = _fitted_classifiers[video_path]
                print(f"[cv] using pre-warmed TeamClassifier")
            else:
                print(f"[cv] fitting on single frame ({len(player_crops)} crops)")
                tc = TeamClassifier(device="cpu")
                tc.fit(player_crops)
            player_teams = tc.predict(player_crops).astype(int)
        except Exception as e:
            print(f"[cv] TeamClassifier unavailable ({e}), using color KMeans fallback")
            player_teams = _color_team_classify(frame, players, sv)

    gk_teams = _resolve_gk_teams(players, player_teams, goalkeepers, sv)

    # ── 7. Batch-transform all pixel coords → StatsBomb ───────────────────
    p_xy   = players.get_anchors_coordinates(sv.Position.BOTTOM_CENTER)    if len(players)     > 0 else np.zeros((0, 2))
    gk_xy  = goalkeepers.get_anchors_coordinates(sv.Position.BOTTOM_CENTER) if len(goalkeepers) > 0 else np.zeros((0, 2))
    ref_xy = referees.get_anchors_coordinates(sv.Position.BOTTOM_CENTER)   if len(referees)    > 0 else np.zeros((0, 2))

    all_px = np.vstack([a for a in [p_xy, gk_xy, ref_xy] if len(a) > 0]) if (len(p_xy) + len(gk_xy) + len(ref_xy)) > 0 else np.zeros((0, 2))
    all_sb = px_to_sb(all_px) if len(all_px) > 0 else np.zeros((0, 2))

    # ── 8. Generate radar image via sports library's own renderer ─────────
    # This is EXACTLY what render_radar() in main.py does — ground truth view
    radar_b64 = None
    if transformer is not None and len(all_px) > 0:
        try:
            cm_all = transformer.transform_points(all_px.astype(np.float32))
            color_lookup = np.array(
                player_teams.tolist() +
                gk_teams.tolist() +
                [2] * len(ref_xy)
            )
            RADAR_COLORS = ['#FF1493', '#00BFFF', '#FF6347']
            radar = draw_pitch(config=CONFIG)
            for ti, hex_c in enumerate(RADAR_COLORS):
                pts = cm_all[color_lookup == ti]
                if len(pts) > 0:
                    radar = draw_points_on_pitch(config=CONFIG, xy=pts,
                                                 face_color=sv.Color.from_hex(hex_c),
                                                 radius=20, pitch=radar)
            _, buf = cv2.imencode('.png', radar)
            radar_b64 = "data:image/png;base64," + base64.b64encode(buf).decode()
        except Exception as e:
            print(f"[cv] radar render failed: {e}")

    # ── 9. Build output ───────────────────────────────────────────────────
    output, pid, idx = [], 1, 0

    for i in range(len(p_xy)):
        sb_x, sb_y = float(all_sb[idx, 0]), float(all_sb[idx, 1])
        output.append({
            "id": pid, "team": int(player_teams[i]),
            "x": round(sb_x, 2), "y": round(sb_y, 2),
            "label": "", "name": f"Player {pid}",
            "is_keeper": False, "is_referee": False,
            "videoX": round(float(p_xy[i, 0]) / W * 100, 1),
            "videoY": round(float(p_xy[i, 1]) / H * 100, 1),
        })
        pid += 1; idx += 1

    for i in range(len(gk_xy)):
        sb_x, sb_y = float(all_sb[idx, 0]), float(all_sb[idx, 1])
        output.append({
            "id": pid, "team": int(gk_teams[i]),
            "x": round(sb_x, 2), "y": round(sb_y, 2),
            "label": "GK", "name": "Goalkeeper",
            "is_keeper": True, "is_referee": False,
            "videoX": round(float(gk_xy[i, 0]) / W * 100, 1),
            "videoY": round(float(gk_xy[i, 1]) / H * 100, 1),
        })
        pid += 1; idx += 1

    for i in range(len(ref_xy)):
        sb_x, sb_y = float(all_sb[idx, 0]), float(all_sb[idx, 1])
        output.append({
            "id": pid, "team": None,
            "x": round(sb_x, 2), "y": round(sb_y, 2),
            "label": "REF", "name": "Referee",
            "is_keeper": False, "is_referee": True,
            "videoX": round(float(ref_xy[i, 0]) / W * 100, 1),
            "videoY": round(float(ref_xy[i, 1]) / H * 100, 1),
        })
        pid += 1; idx += 1

    if output:
        xs = [p["x"] for p in output]
        ys = [p["y"] for p in output]
        print(f"[cv] {len(output)} players  sb_x=[{min(xs):.1f},{max(xs):.1f}]  sb_y=[{min(ys):.1f},{max(ys):.1f}]")

    return {
        "players":        output,
        "ball":           ball_out,
        "pitch_detected": pitch_ok,
        "frame_size":     {"width": int(W), "height": int(H)},
        "radar_image":    radar_b64,          # sports-lib radar for ground-truth validation
    }
