import os
from dotenv import load_dotenv
load_dotenv()

# Must be set before any Numba/UMAP import.
os.environ.setdefault('NUMBA_NUM_THREADS', '1')
os.environ.setdefault('NUMBA_THREADING_LAYER', 'workqueue')

import asyncio
import uuid
import requests as _requests
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pathlib import Path
from typing import Optional

_prewarm_executor  = ThreadPoolExecutor(max_workers=1, thread_name_prefix="prewarm")
_download_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="yt-dlp")

from dotenv import load_dotenv
load_dotenv()

app = FastAPI(title="The Special Replay API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = Path(__file__).parent / "static"
CLIPS_DIR  = STATIC_DIR / "clips"
CLIPS_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

CLIP_LABELS = {
    "Argentina Jordan Offiside.mp4":                                        "🇦🇷 Argentina vs 🇯🇴 Jordan — Offside",
    "Argentina_vs_Austria_Extended_Highlights_2026_FIFA_JakdhltyECE.mp4":  "🇦🇷 Argentina vs 🇦🇹 Austria '26",
    "France Nirway Dembele 1st.mp4":                                        "🇫🇷 France vs 🇳🇴 Norway — Dembélé 1st",
    "France Norway 3-1.mp4":                                               "🇫🇷 France vs 🇳🇴 Norway — 3-1",
    "France Senegal Offside.mp4":                                           "🇫🇷 France vs 🇸🇳 Senegal — Offside",
    "NZL 1 Belgium 3 Corner.mp4":                                           "🇳🇿 NZ 1-3 🇧🇪 Belgium — Corner",
    "NZL Belgium 03.mp4":                                                   "🇳🇿 NZ vs 🇧🇪 Belgium",
}


# ─── Request models ───────────────────────────────────────────────────────────

class PrewarmRequest(BaseModel):
    clip_name: str

class ExtractRequest(BaseModel):
    clip_name: str
    timestamp_ms: int

class PredictRequest(BaseModel):
    players: list
    ball: Optional[dict] = None
    actor_id: int
    action: str                          # pass | shoot | carry | hold
    pass_target_id: Optional[int] = None
    shot_zone: Optional[str] = None      # 'left' | 'center' | 'right'
    pass_style: Optional[str] = None     # 'feet' | 'behind'
    goal_side: Optional[str] = None      # 'left' | 'right'
    player_assignments: Optional[dict] = None  # str(pitchPlayerId) → {name, position, rating, stats}

class YoutubeRequest(BaseModel):
    url: str

class ZlatanRequest(BaseModel):
    event: str                   # 'extraction' | 'adjustment' | 'prediction' | 'general'
    context: Optional[dict] = None

# ─── Football API (api-sports.io) ─────────────────────────────────────────────

FOOTBALL_API_KEY = os.getenv("API_SPORTS_KEY", "")
FOOTBALL_API_URL = "https://v3.football.api-sports.io"
_player_cache: dict = {}   # cache_key → list[player_obj], lives for process lifetime


@app.get("/players/search")
def player_search(q: str, league: int = 39, season: int = 2024):
    """Proxy /players search to api-sports with server-side caching (saves quota)."""
    q = q.strip()
    if len(q) < 4:
        raise HTTPException(400, detail="Query must be at least 4 characters")
    cache_key = f"{q.lower()}:{league}:{season}"
    if cache_key in _player_cache:
        print(f"[players] cache hit: {cache_key}")
        return _player_cache[cache_key]
    try:
        resp = _requests.get(
            f"{FOOTBALL_API_URL}/players",
            params={"search": q, "league": league, "season": season, "page": 1},
            headers={"x-apisports-key": FOOTBALL_API_KEY},
            timeout=12,
        )
        resp.raise_for_status()
        results = resp.json().get("response", [])
        _player_cache[cache_key] = results
        print(f"[players] search '{q}' league={league} season={season} → {len(results)} results")
        return results
    except Exception as e:
        print(f"[players] search error: {e}")
        raise HTTPException(502, detail=f"Player search failed: {e}")


@app.post("/zlatan/comment")
def zlatan_comment(req: ZlatanRequest):
    """Ask Zlatan Granitevic to comment on what just happened."""
    from granite_client import get_zlatan_comment
    comment = get_zlatan_comment(req.event, req.context or {})
    return {"comment": comment}


# ─── YouTube download state ───────────────────────────────────────────────────

# job_id → {"status": "downloading"|"done"|"error", "clip": {...}, "error": "..."}
_yt_jobs: dict = {}

def _sanitize(text: str, maxlen: int = 50) -> str:
    import re
    s = re.sub(r'[^\w\s-]', '', text).strip()
    s = re.sub(r'[\s_-]+', '_', s)
    return s[:maxlen] or "video"

def _do_yt_download(job_id: str, url: str):
    _yt_jobs[job_id] = {"status": "downloading"}
    try:
        import yt_dlp
    except ImportError:
        _yt_jobs[job_id] = {"status": "error", "error": "yt-dlp not installed on the server"}
        return

    try:
        # First, extract info to get title without downloading
        with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True}) as ydl:
            info = ydl.extract_info(url, download=False)
            title = _sanitize(info.get("title", "video"))
            vid_id = info.get("id", job_id[:8])

        out_name = f"{title}_{vid_id}.mp4"
        out_path = CLIPS_DIR / out_name

        ydl_opts = {
            "format": "best[height<=720][ext=mp4]/best[height<=720]/best[ext=mp4]/best",
            "outtmpl": str(out_path),
            "quiet": True,
            "no_warnings": True,
            "merge_output_format": "mp4",
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        # yt-dlp may add .mp4 extension even if already in the name
        if not out_path.exists():
            # try with extra .mp4
            alt = CLIPS_DIR / (out_name + ".mp4")
            if alt.exists():
                out_path = alt
                out_name = alt.name

        if not out_path.exists():
            # fall back: find the most recently modified mp4 in clips dir
            mp4s = sorted(CLIPS_DIR.glob("*.mp4"), key=lambda f: f.stat().st_mtime)
            if mp4s:
                out_path = mp4s[-1]
                out_name = out_path.name

        label = info.get("title", out_name)[:60]
        _yt_jobs[job_id] = {
            "status": "done",
            "clip": {
                "name": out_name,
                "label": label,
                "url": f"/static/clips/{out_name}",
            },
        }
        print(f"[yt] downloaded → {out_name}")
    except Exception as e:
        print(f"[yt] download failed: {e}")
        _yt_jobs[job_id] = {"status": "error", "error": str(e)}


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    import granite_client as gc
    cv_status = "unknown"
    cv_error  = None
    try:
        import cv2
        import ultralytics
        cv_status = f"ok (cv2 {cv2.__version__})"
    except Exception as e:
        cv_status = "unavailable"
        cv_error  = str(e)
    return {
        "status": "ok",
        "ai_backend": gc.active_backend(),
        "granite_error": gc._granite_error,
        "cv_status": cv_status,
        "cv_error":  cv_error,
    }


@app.get("/debug/env")
def debug_env():
    key = os.getenv("WATSONX_API_KEY", "")
    gem = os.getenv("GEMINI_API_KEY", "")
    return {
        "WATSONX_API_KEY":    f"{key[:12]}...{key[-4:]}" if len(key) > 16 else f"({len(key)} chars)",
        "WATSONX_PROJECT_ID": os.getenv("WATSONX_PROJECT_ID", "(not set)"),
        "WATSONX_URL":        os.getenv("WATSONX_URL", "(not set)"),
        "WATSONX_MODEL_ID":   os.getenv("WATSONX_MODEL_ID", "(not set)"),
        "GEMINI_API_KEY":     f"{gem[:8]}...{gem[-4:]}" if len(gem) > 12 else f"({len(gem)} chars)",
        "env_file":           str(Path(__file__).parent / ".env"),
    }


@app.get("/clips")
def list_clips():
    clips = []
    for i, f in enumerate(sorted(CLIPS_DIR.glob("*.mp4"))):
        clips.append({
            "id": i,
            "name": f.name,
            "label": CLIP_LABELS.get(f.name, f.stem.replace("_", " ").title()),
            "url": f"/static/clips/{f.name}",
        })
    return clips


@app.post("/prewarm")
async def prewarm(req: PrewarmRequest):
    video_path = CLIPS_DIR / req.clip_name
    if not video_path.exists():
        raise HTTPException(404, detail=f"Clip '{req.clip_name}' not found")
    try:
        from cv_pipeline import prewarm_classifier, _fitted_classifiers
    except ImportError:
        raise HTTPException(503, detail="Video processing unavailable in this deployment (CV dependencies not installed)")
    if str(video_path) in _fitted_classifiers:
        return {"status": "cached"}
    loop = asyncio.get_event_loop()
    loop.run_in_executor(_prewarm_executor, prewarm_classifier, str(video_path))
    return {"status": "warming"}


@app.post("/upload/youtube")
async def upload_youtube(req: YoutubeRequest):
    """Start a YouTube download in the background; returns job_id immediately."""
    url = req.url.strip()
    if not url:
        raise HTTPException(400, detail="URL is required")
    job_id = str(uuid.uuid4())[:8]
    loop = asyncio.get_event_loop()
    loop.run_in_executor(_download_executor, _do_yt_download, job_id, url)
    return {"job_id": job_id, "status": "downloading"}


@app.get("/upload/status/{job_id}")
def upload_status(job_id: str):
    """Poll the status of a YouTube download job."""
    job = _yt_jobs.get(job_id)
    if job is None:
        raise HTTPException(404, detail="Job not found")
    return job


@app.post("/extract")
def extract(req: ExtractRequest):
    video_path = CLIPS_DIR / req.clip_name
    if not video_path.exists():
        raise HTTPException(404, detail=f"Clip '{req.clip_name}' not found in {CLIPS_DIR}")
    try:
        from cv_pipeline import extract_frame_state
    except ImportError:
        raise HTTPException(503, detail="Video processing unavailable in this deployment (CV dependencies not installed)")
    result = extract_frame_state(str(video_path), req.timestamp_ms)
    if "error" in result:
        raise HTTPException(422, detail=result["error"])
    return result


@app.post("/predict")
def predict(req: PredictRequest):
    from granite_client import get_prediction
    return get_prediction(
        players=req.players,
        ball=req.ball,
        actor_id=req.actor_id,
        action=req.action,
        pass_target_id=req.pass_target_id,
        shot_zone=req.shot_zone,
        pass_style=req.pass_style,
        goal_side=req.goal_side,
        player_assignments=req.player_assignments,
    )
