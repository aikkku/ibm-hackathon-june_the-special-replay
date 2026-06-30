"""
IBM Granite (primary, via direct REST) → Gemini 2.5 Flash (fallback) → local engine.
Uses raw HTTP to bypass the ibm-watsonx-ai SDK's model-spec pre-flight check,
which fails on CPDaaS accounts even when the inference API itself works fine.
"""
import os
import json
import re
import time
import random
import requests
from dotenv import load_dotenv

load_dotenv()

WATSONX_API_KEY    = os.getenv("WATSONX_API_KEY", "")
WATSONX_PROJECT_ID = os.getenv("WATSONX_PROJECT_ID", "")
WATSONX_URL        = os.getenv("WATSONX_URL", "https://ca-tor.ml.cloud.ibm.com")
WATSONX_MODEL_ID   = os.getenv("WATSONX_MODEL_ID", "ibm/granite-4-h-small")
GEMINI_API_KEY     = os.getenv("GEMINI_API_KEY", "")

# IAM token cache
_iam_token: str | None = None
_iam_expiry: float = 0
_granite_error: str | None = None


def _get_iam_token() -> str | None:
    global _iam_token, _iam_expiry, _granite_error
    if _iam_token and time.time() < _iam_expiry - 60:
        return _iam_token
    if not WATSONX_API_KEY:
        return None
    try:
        resp = requests.post(
            "https://iam.cloud.ibm.com/identity/token",
            data={
                "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
                "apikey": WATSONX_API_KEY,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        _iam_token = data["access_token"]
        _iam_expiry = time.time() + data.get("expires_in", 3600)
        _granite_error = None
        return _iam_token
    except Exception as e:
        _granite_error = f"IAM token failed: {e}"
        print(f"[granite] {_granite_error}")
        return None


def _call_granite(prompt: str) -> str | None:
    if not WATSONX_API_KEY or not WATSONX_PROJECT_ID:
        return None
    token = _get_iam_token()
    if not token:
        return None
    try:
        url = f"{WATSONX_URL}/ml/v1/text/chat?version=2024-05-31"
        resp = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            json={
                "model_id": WATSONX_MODEL_ID,
                "project_id": WATSONX_PROJECT_ID,
                "messages": [{"role": "user", "content": prompt}],
                "parameters": {"max_new_tokens": 1024, "temperature": 0.7},
            },
            timeout=60,
        )
        if resp.status_code != 200:
            global _granite_error
            _granite_error = f"HTTP {resp.status_code}: {resp.text[:300]}"
            print(f"[granite] REST error: {_granite_error}")
            return None
        return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"[granite] REST call failed: {e}")
        return None


def active_backend() -> str:
    # Try to get an IAM token to verify the key works
    token = _get_iam_token()
    if token and WATSONX_PROJECT_ID:
        return f"granite/{WATSONX_MODEL_ID}"
    if GEMINI_API_KEY:
        return f"gemini/{GEMINI_MODEL}"
    return "local-deterministic"


GEMINI_MODEL = "gemini-2.5-flash"


def _call_gemini(prompt: str) -> str | None:
    if not GEMINI_API_KEY:
        return None
    try:
        import google.genai as genai
        client = genai.Client(api_key=GEMINI_API_KEY)
        resp = client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
        return resp.text.strip()
    except Exception as e:
        print(f"[gemini] failed: {e}")
        return None


def _build_prompt(
    players: list, ball: dict | None, actor_id: int, action: str,
    pass_target_id: int | None,
    shot_zone: str | None = None,
    pass_style: str | None = None,
    player_assignments: dict | None = None,
) -> str:
    assignments = player_assignments or {}
    team_a = [p for p in players if p.get("team") == 0]
    team_b = [p for p in players if p.get("team") == 1]
    actor = next((p for p in players if p["id"] == actor_id), None)
    target = next((p for p in players if p["id"] == pass_target_id), None) if pass_target_id else None

    def zone(x: float) -> str:
        return "attacking third" if x >= 80 else "middle third" if x >= 40 else "defensive third"

    def _player_label(p: dict) -> str:
        """Return enriched label if real player assigned, else fallback label."""
        pid = str(p["id"])
        a = assignments.get(pid)
        if not a:
            lbl = p.get("label") or ("GK" if p.get("is_keeper") else "REF" if p.get("is_referee") else "P")
            return lbl
        name = a.get("name", p.get("label", "P"))
        pos  = (a.get("position") or "")[:3].upper()
        r    = a.get("rating", "")
        st   = a.get("stats") or {}
        g    = st.get("goals_total", "")
        ast  = st.get("goals_assists", "")
        pa   = st.get("passes_accuracy", "")
        dr   = st.get("dribbles_success", "")
        parts = []
        if pos: parts.append(pos)
        if r:   parts.append(f"R:{r}")
        if g != "": parts.append(f"G:{g}")
        if ast != "": parts.append(f"A:{ast}")
        if pa != "": parts.append(f"PA:{pa}%")
        if dr != "": parts.append(f"DR:{dr}")
        return f"{name}[{','.join(parts)}]" if parts else name

    def fmt(ps: list) -> str:
        return ", ".join(f"{_player_label(p)}({p['x']:.0f},{p['y']:.0f})" for p in ps) or "none"

    # Build a player profiles section when real players are assigned
    profiles_lines = []
    for p in players:
        pid = str(p["id"])
        a = assignments.get(pid)
        if not a:
            continue
        st = a.get("stats") or {}
        team_label = "Team A" if p.get("team") == 0 else "Team B"
        profiles_lines.append(
            f"  {team_label} | {a.get('name')} ({a.get('position','?')}, {a.get('team','?')}):"
            f" Rating {a.get('rating','?')}, Goals {st.get('goals_total','?')},"
            f" Assists {st.get('goals_assists','?')}, ShotsOn {st.get('shots_on','?')},"
            f" PassAcc {st.get('passes_accuracy','?')}%, Dribbles {st.get('dribbles_success','?')}/{st.get('dribbles_attempts','?')}"
        )
    profiles_section = ""
    if profiles_lines:
        profiles_section = "\nREAL PLAYER PROFILES (factor these into your analysis):\n" + "\n".join(profiles_lines) + "\n"

    dist_to_ball = (
        ((actor['x'] - ball['x'])**2 + (actor['y'] - ball['y'])**2) ** 0.5
        if actor and ball else 0
    )
    run_note = (
        f" (must first run {dist_to_ball:.0f} units to reach the ball)"
        if dist_to_ball > 5 else " (has the ball)"
    )
    actor_str = f"{actor.get('label','P')} at ({actor['x']:.0f},{actor['y']:.0f}) in the {zone(actor['x'])}{run_note}" if actor else "unknown"
    ball_str = f"({ball['x']:.0f},{ball['y']:.0f})" if ball else "unknown"

    _zone_info = {
        'left':   ('left side of goal',   120, 37.5),
        'right':  ('right side of goal',  120, 42.5),
        'center': ('center of goal',       120, 40.0),
    }
    action_detail = action.upper()
    if action == "pass" and target:
        if pass_style == 'behind':
            space_x = min(target['x'] + 15, 118)
            action_detail = (
                f"PASS into space ahead of {target.get('label','P')} "
                f"(through ball toward ~({space_x:.0f},{target['y']:.0f})) — "
                f"receiver runs onto it"
            )
        else:
            action_detail = f"PASS to feet of {target.get('label','P')} at ({target['x']:.0f},{target['y']:.0f})"
    elif action == "shoot":
        z_name, zx, zy = _zone_info.get(shot_zone or 'center', _zone_info['center'])
        action_detail = f"SHOOT toward {z_name} (approx {zx:.0f},{zy:.1f})"
    elif action == "carry":
        action_detail = "CARRY the ball forward (approximately +10–15 units)"
    elif action == "hold":
        action_detail = "HOLD the ball and shield, waiting for support"

    return f"""You are a football (soccer) tactical analyst. Analyze this what-if scenario in a World Cup knockout match.

PITCH: StatsBomb coordinates, 120×80 units. Attack direction is toward x=120.
Goals: left at x=0 (y=36–44), right at x=120 (y=36–44).

CURRENT POSITIONS:
Team A (attacking toward x=120): {fmt(team_a)}
Team B (defending toward x=0): {fmt(team_b)}
Ball: {ball_str}{profiles_section}

WHAT-IF ACTION:
{actor_str} executes: {action_detail}

Respond with ONLY valid JSON (no markdown fences, no text outside the JSON object):
{{
  "outcome": "Goal" | "Good Chance" | "Dangerous Attack" | "Possession Lost" | "Safe Play",
  "xg_estimate": <float 0.0–1.0>,
  "explanation": "<3–4 sentences of pundit-style tactical analysis. Be specific about positions, defensive shape, and why this action is or isn't dangerous.>",
  "ball_end": [<x>, <y>],
  "movements": [
    {{"label": "<player label>", "team": <0|1>, "from": [<x>, <y>], "to": [<x>, <y>], "reason": "<brief>"}},
    ...
  ]
}}

ball_end is where the ball ends up after this action (e.g. near goal for a shot, at the receiver for a pass, at the carrier for a carry).
Include 2–4 key movements showing how players react. Be tactically specific and realistic."""


def _parse_json(raw: str) -> dict | None:
    """Strip markdown fences and parse JSON from model response."""
    cleaned = re.sub(r"```json?\s*", "", raw)
    cleaned = re.sub(r"```\s*", "", cleaned).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if m:
            try:
                return json.loads(m.group())
            except Exception:
                pass
    return None


def _local_fallback(
    players: list, ball: dict | None, actor_id: int, action: str,
    pass_target_id: int | None,
    shot_zone: str | None = None,
    pass_style: str | None = None,
    goal_side: str | None = None,
) -> dict:
    """Simple geometry-based prediction when no AI backend is available."""
    actor = next((p for p in players if p["id"] == actor_id), None)
    if not actor:
        return {"outcome": "Unknown", "xg_estimate": 0.0, "explanation": "Could not find the actor player.", "movements": [], "source": "local"}

    x, y = actor["x"], actor["y"]
    dist = ((120 - x) ** 2 + (40 - y) ** 2) ** 0.5
    angle_rad = abs(__import__("math").atan2(abs(y - 40), 120 - x))
    angle_deg = __import__("math").degrees(angle_rad)

    defenders = [p for p in players if p.get("team") == 1 and not p.get("is_keeper")]
    nearby_defs = [p for p in defenders if ((p["x"] - x) ** 2 + (p["y"] - y) ** 2) ** 0.5 < 15]

    if action == "shoot":
        if dist < 12 and angle_deg < 35:
            outcome, xg = "Good Chance", 0.42
            explanation = f"A clinical strike from {dist:.0f}m out with a tight {angle_deg:.0f}° angle — this is a genuine scoring opportunity that demands precision from the keeper."
        elif dist < 20 and angle_deg < 45:
            outcome, xg = "Dangerous Attack", 0.18
            explanation = f"A brave effort from {dist:.0f}m — technically possible but {len(nearby_defs)} defender(s) close by will block the shooting lane if not first-timed."
        else:
            outcome, xg = "Safe Play", 0.04
            explanation = f"A long shot from {dist:.0f}m is unlikely to trouble the keeper without a deflection. The defence has time to set and narrow the angle."
        movements = []
        goal_y = {'left': 37.5, 'right': 42.5}.get(shot_zone or '', 40.0)
        goal_x = 1 if goal_side == 'left' else 119
        ball_end = [goal_x, goal_y]
    elif action == "pass":
        target = next((p for p in players if p["id"] == pass_target_id), None)
        if pass_style == 'behind' and target:
            outcome, xg = "Dangerous Attack", 0.16
            explanation = "A perfectly weighted ball in behind the defensive line sends the receiver sprinting clear. The defence has to turn and chase — a high-reward move if timed correctly."
            ball_end = [min(target["x"] + 15, 118), target["y"]]
        elif target and target["x"] > x + 10:
            outcome, xg = "Dangerous Attack", 0.12
            explanation = "A penetrating forward pass breaks the defensive line and puts a teammate in a superior position. The defence must scramble to recover shape."
            ball_end = [target["x"], target["y"]]
        elif target and target["x"] < x:
            outcome, xg = "Safe Play", 0.03
            explanation = "A backward pass to recycle possession and probe for a better opening. The defence can reset but the attacking side keeps control."
            ball_end = [target["x"], target["y"]]
        else:
            outcome, xg = "Dangerous Attack", 0.09
            explanation = "A lateral pass shifts the play into space, pulling a defender across and potentially opening a gap in behind."
            ball_end = [target["x"], target["y"]] if target else [x, y]
        movements = []
    elif action == "carry":
        carry_x = min(x + 12, 119)
        if x >= 80:
            outcome, xg = "Dangerous Attack", 0.15
            explanation = f"Driving into the box forces defenders to commit — this is high-reward carrying in the final third. With {len(nearby_defs)} defender(s) ahead, a foul or a shooting chance is likely."
        else:
            outcome, xg = "Dangerous Attack", 0.08
            explanation = "A purposeful carry drags defenders out of their shape, creating pockets of space for supporting runners."
        movements = [{"label": actor.get("label", "P"), "team": actor.get("team", 0), "from": [x, y], "to": [carry_x, y], "reason": "carries forward"}]
        ball_end = [carry_x, y]
    else:  # hold
        outcome, xg = "Safe Play", 0.03
        explanation = "Holding the ball and shielding buys time for teammates to make runs. Lower risk but the attacking momentum slows."
        movements = []
        ball_end = [x, y]

    return {"outcome": outcome, "xg_estimate": xg, "explanation": explanation, "ball_end": ball_end, "movements": movements, "source": "local"}


_ZLATAN_FALLBACKS = {
    'extraction': [
        "Zlatan has analyzed the positions. The other team should already be worried.",
        "When Zlatan extracts the frame, the frame understands it is being studied by greatness.",
        "Zlatan sees everything on this pitch. The players are fortunate Zlatan is watching.",
        "Detection complete. Zlatan knew where everyone was before the algorithm did.",
    ],
    'adjustment': [
        "Good. Zlatan was thinking the same thing, but Zlatan was waiting to see if you figured it out.",
        "Zlatan approves this change. Not every decision needs Zlatan's blessing — but it helps.",
        "Zlatan has made adjustments too. In Malmö, Milan, Barcelona, Paris. Zlatan knows adjustments.",
        "This is the correct move. Zlatan would have done the same, but with more elegance.",
    ],
    'prediction': [
        "The AI has spoken. Zlatan agrees. Mostly because Zlatan told the AI what to say.",
        "IBM Granite consulted Zlatan before making this prediction. They always do.",
        "Zlatan predicted this before the button was clicked. The AI is just confirming.",
        "This outcome is correct. Zlatan has seen this exact moment before, in a different stadium.",
    ],
    'rules': [
        "Zlatan does not study rules. Rules study Zlatan.",
        "This rule was written after Zlatan made referees question everything they knew.",
        "Zlatan has broken this rule. Creatively. And with style.",
        "The laws of football are interesting. Zlatan follows the laws of Zlatan.",
    ],
    'chat': [
        "Zlatan hears you. Zlatan does not always answer — but today is your lucky day.",
        "An interesting question. Zlatan has considered it and found it worthy of a response.",
        "Zlatan does not do interviews. But Zlatan makes exceptions for the curious.",
        "You speak to Zlatan directly. Very brave. Zlatan respects this.",
    ],
    'general': [
        "Zlatan does not need machine learning. Zlatan IS the machine.",
        "An average analyst looks at the data. Zlatan looks at the pitch. There is a difference.",
        "Zlatan has studied football for decades. The algorithm has studied it for seconds. Zlatan is kind enough to share.",
    ],
}


def get_zlatan_comment(event: str, context: dict) -> str:
    """Generate a Zlatan Ibrahimovic-style comment about what just happened."""
    user_msg = context.get('user_message', '')
    event_contexts = {
        'extraction': (
            f"{context.get('player_count', 'Several')} players detected on the pitch"
            + (f" from {context.get('clip_name', 'a video clip')}" if context.get('clip_name') else "")
            + (" (demo mode)" if context.get('is_demo') else "")
            + "."
        ),
        'adjustment': f"The user just {context.get('action', 'adjusted a player')} on the tactical pitch.",
        'prediction': (
            f"IBM Granite just predicted '{context.get('outcome', 'Safe Play')}' for the tactical scenario."
            + (f" Analysis: {context.get('explanation', '')[:120]}" if context.get('explanation') else "")
        ),
        'rules': f"The user is reading the football rule about: {context.get('rule_title', 'a rule')}. {context.get('rule_short', '')}",
        'chat': f"The user is talking directly to Zlatan and said: \"{user_msg}\"",
        'general': "The user is exploring a football tactical analysis tool powered by IBM Granite AI.",
    }

    is_chat = event == 'chat'
    task_line = (
        "Reply directly to what the user said — stay in character, be witty and brief."
        if is_chat else
        "Write ONE short Zlatan-style comment (1-2 sentences maximum).\n- Reference the football situation"
    )

    prompt = f"""You are Zlatan Granitevic, a football tactical AI assistant who speaks EXACTLY like Zlatan Ibrahimovic.

Zlatan Ibrahimovic's speaking style:
- ALWAYS refers to himself in third person ("Zlatan thinks...", "Zlatan has seen...", "Zlatan knows...")
- Supremely confident, slightly arrogant, occasionally philosophical
- Compares everything to himself as the ultimate benchmark
- Short, blunt, dramatic sentences. Never long explanations.
- Famous style: "I am not normal. I am Zlatan." / "When you buy me, you buy a Ferrari." / "Zlatan does not need luck. Luck needs Zlatan."

Situation: {event_contexts.get(event, event_contexts['general'])}

{task_line}
- Third person only ("Zlatan" not "I")
- Confident and slightly dramatic
- NO quotation marks around the response
- NO markdown, no explanation, just the comment"""

    raw = _call_granite(prompt)
    if raw:
        clean = raw.strip().strip('"\'`').strip()
        if len(clean) > 8:
            return clean

    raw = _call_gemini(prompt)
    if raw:
        clean = raw.strip().strip('"\'`').strip()
        if len(clean) > 8:
            return clean

    return random.choice(_ZLATAN_FALLBACKS.get(event, _ZLATAN_FALLBACKS['general']))


def get_prediction(
    players: list, ball: dict | None, actor_id: int, action: str,
    pass_target_id: int | None = None,
    shot_zone: str | None = None,
    pass_style: str | None = None,
    player_assignments: dict | None = None,
    goal_side: str | None = None,
) -> dict:
    prompt = _build_prompt(players, ball, actor_id, action, pass_target_id, shot_zone, pass_style, player_assignments)

    # Try IBM Granite
    raw = _call_granite(prompt)
    if raw:
        data = _parse_json(raw)
        if data:
            data["source"] = "granite"
            if action == "shoot":
                goal_x = 1 if goal_side == 'left' else 119
                goal_y = {'left': 37.5, 'right': 42.5}.get(shot_zone or '', 40.0)
                data["ball_end"] = [goal_x, goal_y]
            return data

    # Try Gemini
    raw = _call_gemini(prompt)
    if raw:
        data = _parse_json(raw)
        if data:
            data["source"] = "gemini"
            if action == "shoot":
                goal_x = 1 if goal_side == 'left' else 119
                goal_y = {'left': 37.5, 'right': 42.5}.get(shot_zone or '', 40.0)
                data["ball_end"] = [goal_x, goal_y]
            return data

    # Deterministic fallback
    return _local_fallback(players, ball, actor_id, action, pass_target_id, shot_zone, pass_style, goal_side)
