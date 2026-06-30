#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ── Virtual environment ────────────────────────────────────────────────────────
if [ ! -d "venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv venv
fi

source venv/bin/activate

# ── Dependencies ───────────────────────────────────────────────────────────────
echo "Checking dependencies..."

pip install --quiet --upgrade pip

pip install --quiet \
  fastapi "uvicorn[standard]" python-dotenv python-multipart aiofiles \
  opencv-python-headless numpy scikit-learn \
  ibm-watsonx-ai google-genai \
  ultralytics supervision \
  gdown yt-dlp

# Install local sports library (homography + TeamClassifier)
SPORTS_DIR="$SCRIPT_DIR/../../sports"
if [ -d "$SPORTS_DIR" ]; then
  pip install --quiet -e "$SPORTS_DIR"
else
  echo "⚠  sports library not found at $SPORTS_DIR — team classification may not work"
fi

# ── YOLO model weights ─────────────────────────────────────────────────────────
DATA_DIR="$SCRIPT_DIR/data"
mkdir -p "$DATA_DIR"

download_model() {
  local name="$1"
  local file_id="$2"
  local dest="$DATA_DIR/football-${name}-detection.pt"
  if [ ! -f "$dest" ]; then
    echo "Downloading $name detection model (~130 MB)..."
    gdown "https://drive.google.com/uc?id=${file_id}" -O "$dest"
  fi
}

download_model "ball"   "1isw4wx-MK9h9LMr36VvIWlJD6ppUvw7V"
download_model "player" "17PXFNlx-jI7VjVo_vQnB1sONjRyvoB-q"
download_model "pitch"  "1Ma5Kt86tgpdjCTKfum79YMgNnSjcoOyf"

# ── Clips folder ───────────────────────────────────────────────────────────────
mkdir -p "$SCRIPT_DIR/static/clips"

# ── Launch ─────────────────────────────────────────────────────────────────────
echo ""
echo "  PitchIQ backend  →  http://localhost:8000"
echo "  Health check     →  http://localhost:8000/health"
echo "  Drop .mp4 files  →  static/clips/"
echo ""

# Force Numba single-threaded so UMAP doesn't crash when called from a thread pool.
# Numba's workqueue layer can't be accessed concurrently from nested threads.
export NUMBA_NUM_THREADS=1
export NUMBA_THREADING_LAYER=workqueue

uvicorn main:app --reload --port 8000
