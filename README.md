# Mood Music Recommender

A small full-stack demo that records your voice in the browser, estimates an emotion with a fine-tuned **Wav2Vec2** model, and suggests **Spotify** tracks that match that mood. The UI changes theme based on the detected emotion.

## How it works

1. **Frontend** ([`src/`](src/)): Vite + React + TypeScript. When you tap the microphone, it captures audio via the Web **MediaRecorder** API (typically `audio/webm`), then sends it to the API.
2. **API** ([`api/app.py`](api/app.py)): **FastAPI** receives the recording, converts it to WAV (`pydub` + **FFmpeg**), runs **Wav2Vec2ForSequenceClassification** at 16 kHz, and returns a label like `happy` or `sad`.
3. **Playlist**: The frontend calls **`GET /spotify-songs?emotion=…`**, which uses Spotify’s **Client Credentials** flow to search tracks (e.g. `mood happy`) and returns title, artist, and Spotify URLs.

Never commit Spotify client secrets or other credentials. Copy [`api/.env.example`](api/.env.example) to `api/.env` and add your Spotify app credentials from the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard). If secrets were previously committed to a fork, rotate them immediately in the Spotify dashboard.

## Repository layout

| Path | Role |
|------|------|
| [`src/`](src/) | React app (`App.tsx`, `main.tsx`, `components/`) |
| [`api/`](api/) | FastAPI service (`app.py`, `requirements.txt`) |
| [`api/models/wav2vec2-ravdess-emotion-checkpoint/`](api/models/) | Local model weights (not in git; see below) |
| [`notebooks/audioEmotion.ipynb`](notebooks/audioEmotion.ipynb) | Notebook related to experimentation / modeling |

## Prerequisites

- **Node.js** (current LTS is fine).
- **Python 3.10+** recommended.
- **FFmpeg** installed and on your `PATH` — required by **pydub** to decode **WebM** from the browser.
- **CUDA** optional; PyTorch will use GPU if available, otherwise CPU.
- Hugging Face **Wav2Vec2** checkpoint directory at:

  **`api/models/wav2vec2-ravdess-emotion-checkpoint/`**

  The directory names are gitignored because checkpoints are large. Place your trained or downloaded checkpoint there so it matches the path in [`api/app.py`](api/app.py).

## Environment variables

### API (`api/.env`)

| Variable | Meaning |
|---------|---------|
| `SPOTIFY_CLIENT_ID` | Spotify app client ID |
| `SPOTIFY_CLIENT_SECRET` | Spotify app client secret |

### Frontend (optional, repo root `.env`)

| Variable | Meaning |
|---------|---------|
| `VITE_API_BASE_URL` | Base URL for the API (no trailing slash). Defaults to `http://localhost:8000`. |

See [`.env.example`](.env.example) for `VITE_API_BASE_URL`; use [`api/.env.example`](api/.env.example) for Spotify keys.

## Run locally

Terminal 1 — API:

```bash
# 1. Create api/.venv and install deps
cd api
python -m venv .venv
# Windows:
# .venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
# Copy api/.env.example to api/.env and set SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET.

# 2. Start uvicorn from the repository root so `import api` resolves
cd ..
python -m uvicorn api.app:app --reload --port 8000
```

Terminal 2 — frontend (from repo root):

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Allow microphone access when prompted.

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/predict-emotion` | Multipart upload with field **`file`** (audio blob). Response: `{ "emotion": "<label>" }` or `{ "error": "..." }`. |
| `GET` | `/spotify-songs?emotion=<label>` | Returns `{ "tracks": [ { "title", "artist", "url" }, ... ] }`. Requires Spotify env vars; returns HTTP 503 if they are missing. |
| `GET` | `/test-cors` | Simple health/CORS sanity check |

## Scripts

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build to dist/
npm run preview   # Preview production build
npm run lint      # ESLint over src/
```

## Development notes

- **CORS** is set to allow all origins in development (`allow_origins=["*"]` in FastAPI). Tighten this for production and list your real frontend origins.
- The reusable [`SongList`](src/components/SongList.tsx) component uses the same `VITE_API_BASE_URL` as [`App.tsx`](src/App.tsx); the main screen currently renders its own recommendation grid for clarity.
- If track search fails with a credentials error, confirm `api/.env` is loaded (`python-dotenv`) and restart `uvicorn`.

## License / model

Checkpoint licensing depends on how you obtained the Wav2Vec2 weights (base model licenses + any dataset/training constraints). Confirm terms before redistribution.
