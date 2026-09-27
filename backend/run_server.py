import warnings
warnings.filterwarnings('ignore')

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import os
import uvicorn
from backend.main import app

if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 8000))
    print(f"[SERVER] Starting SpillTheory API on http://{host}:{port} ...", flush=True)
    uvicorn.run(app, host=host, port=port, log_level="info")

