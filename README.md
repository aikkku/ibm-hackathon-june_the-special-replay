# PitchIQ — The Special Replay

**AI-powered football tactical analysis for the IBM SkillsBuild AI Builders Challenge**

PitchIQ lets you freeze any moment in a football match, extract every player's position with computer vision, then ask IBM Granite what happens next — all in a real-time 2D pitch view.

---

## The Problem

Coaches, analysts, and fans all want to understand *why* a match moment unfolded the way it did. Existing tools require expensive software licenses, proprietary hardware, or hours of manual tagging. PitchIQ makes tactical replay analysis instant and accessible — paste a clip URL, pause at the moment, and the AI does the rest.

---

## How It Works

```
Video clip / YouTube URL
        │
        ▼
  YOLO object detection  ──►  player & ball bounding boxes
        │
        ▼
  Homography mapping     ──►  pixel coords → StatsBomb pitch coords (120×80)
        │
        ▼
  Interactive 2D pitch   ──►  drag, reassign teams, add/remove players
        │
        ▼
  IBM Granite (watsonx)  ──►  tactical prediction + Zlatan Granitevic commentary
```

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, plain CSS |
| Backend | FastAPI (Python 3.11) |
| CV pipeline | Ultralytics YOLOv8 (object detection), OpenCV |
| Primary AI | **IBM Granite 4 via watsonx.ai** (`ibm/granite-4-h-small`) |
| Fallback AI | Google Gemini 2.5 Flash |
| Player data | API-Sports.io (real player stats, live assignment) |
| Coordinate system | StatsBomb 120×80 (industry standard) |

---

## IBM Granite Integration

Granite powers two features:

**1. Tactical Prediction** — given the extracted player positions (formatted as a structured prompt), Granite predicts the most likely outcome: goal, offside, blocked shot, counter-attack, etc. It returns a confidence score and a plain-English tactical explanation.

**2. Zlatan Granitevic** — a personal assistant persona that speaks in Zlatan Ibrahimović's third-person style. After each extraction, player adjustment, or prediction, Granite generates a short in-character commentary that appears in the floating overlay.

API call flow (with graceful degradation):
```
watsonx.ai REST API (IBM Granite)
        │ fail?
        ▼
Google Gemini 2.5 Flash
        │ fail?
        ▼
Deterministic local fallback (no external dependency)
```

---

## Features

- **Real video extraction** — paste any local video path or YouTube URL; YOLO detects players and ball; homography maps them to a 2D pitch
- **Demo mode** — one-click demo with realistic pre-loaded positions for offline judging
- **Interactive pitch** — drag players, switch teams (A / B / Ref), assign real player stats from API-Sports
- **What-If mode** — run IBM Granite tactical predictions on any arrangement
- **Player search** — search 600+ real players across Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Champions League, and World Cup (correct 4-year seasons: 2022, 2018, 2014…)
- **Zlatan Granitevic** — IBM Granite–powered commentary in Zlatan's iconic style, floating bottom-right with minimize support
- **Landing page** — animated hero with rotating Zlatan quotes and the project's visual identity

---

## Project Structure

```
pitchiq/
├── backend/
│   ├── main.py              # FastAPI app — video, extraction, prediction, Zlatan endpoints
│   ├── cv_pipeline.py       # YOLO detection + homography mapping
│   ├── granite_client.py    # IBM Granite / Gemini / fallback AI client
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.jsx                      # Main analysis page
        ├── components/
        │   ├── LandingPage.jsx          # Hero + animated quotes
        │   ├── InteractivePitch.jsx     # 2D SVG pitch + drag-and-drop
        │   ├── PredictionPanel.jsx      # What-If prediction UI
        │   ├── PlayerSettingsPanel.jsx  # Left sidebar — team/role/stats
        │   ├── ZlatanPanel.jsx          # Floating AI commentary overlay
        │   └── PlayerSearchModal.jsx    # Real player search
        └── lib/
            ├── api.js                   # Backend API calls
            └── data.js                  # Pitch constants, team colors
```

---

## Running Locally

### Backend
```bash
cd pitchiq/backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# Set env vars:
export IBM_WATSONX_API_KEY="<your key>"
export IBM_WATSONX_PROJECT_ID="<your project id>"   # Toronto region
export GEMINI_API_KEY="<your key>"                  # fallback
export API_SPORTS_KEY="<your key>"                  # player search
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd pitchiq/frontend
npm install
npm run dev   # → http://localhost:5173
```

---

## IBM SkillsBuild AI Builders Challenge

This project was built for the **IBM SkillsBuild AI Builders Challenge** using IBM Granite as the primary AI model via IBM watsonx.ai. It demonstrates:

- Responsible AI usage with graceful degradation (Granite → Gemini → deterministic)
- A real-world sports analytics problem solved by an AI-native architecture
- A complete full-stack application any user can interact with in a browser

**Model used:** `ibm/granite-4-h-small` (watsonx.ai, Toronto region `ca-tor`)

---

## Why It Matters

Football is the world's most watched sport. Tactical analysis has historically been gated behind expensive professional tools available only to elite clubs. PitchIQ democratizes this — a coach at a grassroots club or a passionate fan can freeze any moment, extract the positions with AI, and instantly understand the tactical picture with IBM Granite's explanation.
