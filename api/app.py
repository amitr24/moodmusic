import base64
import io
import os
import tempfile
from pathlib import Path

import requests
import soundfile as sf
import torch
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydub import AudioSegment
from transformers import Wav2Vec2FeatureExtractor, Wav2Vec2ForSequenceClassification

_ENV_DIR = Path(__file__).resolve().parent
load_dotenv(_ENV_DIR / ".env")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


MODEL_PATH = (
    Path(__file__).resolve().parent
    / "models"
    / "wav2vec2-ravdess-emotion-checkpoint"
)

model = Wav2Vec2ForSequenceClassification.from_pretrained(str(MODEL_PATH))
feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(str(MODEL_PATH))

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)
model.eval()


@app.post("/predict-emotion")
async def predict_emotion(file: UploadFile = File(...)):
    """
    Receives audio (.webm),
    converts to .wav via pydub,
    runs Wav2Vec2 -> returns {"emotion": ...}
    """
    try:
        audio_bytes = await file.read()

        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as temp_input:
            temp_input.write(audio_bytes)
            temp_input.flush()
            audio = AudioSegment.from_file(temp_input.name, format="webm")
            audio = audio.set_frame_rate(16000)

        wav_io = io.BytesIO()
        audio.export(wav_io, format="wav")
        wav_io.seek(0)

        waveform, sample_rate = sf.read(wav_io)

        inputs = feature_extractor(
            waveform,
            sampling_rate=sample_rate,
            return_tensors="pt",
            truncation=True,
            max_length=int(feature_extractor.sampling_rate * 10),
            padding=True,
        )
        input_values = inputs["input_values"].to(device)

        with torch.no_grad():
            logits = model(input_values).logits
            prediction = torch.argmax(logits, dim=-1).item()

        emotion = model.config.id2label[prediction]
        return {"emotion": emotion}

    except Exception as e:
        return {"error": str(e)}


def get_spotify_token() -> str:
    """
    Obtain a Spotify access token using client credentials flow.
    Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in api/.env.
    """
    client_id = os.environ.get("SPOTIFY_CLIENT_ID")
    client_secret = os.environ.get("SPOTIFY_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=503,
            detail=(
                "Spotify is not configured. Set SPOTIFY_CLIENT_ID and "
                "SPOTIFY_CLIENT_SECRET in api/.env (see api/.env.example)."
            ),
        )

    creds_b64 = base64.b64encode(
        f"{client_id}:{client_secret}".encode()
    ).decode()

    headers = {
        "Authorization": f"Basic {creds_b64}",
        "Content-Type": "application/x-www-form-urlencoded",
    }
    data = {"grant_type": "client_credentials"}

    auth_response = requests.post(
        "https://accounts.spotify.com/api/token",
        headers=headers,
        data=data,
        timeout=30,
    )
    auth_response.raise_for_status()
    return auth_response.json()["access_token"]


@app.get("/spotify-songs")
def get_songs_by_emotion(
    emotion: str = Query(..., description="Emotion like happy, sad, etc."),
):
    """
    GET /spotify-songs?emotion=happy
    Returns a list of track objects:
      { "title": "", "artist": "", "url": "" }
    """
    token = get_spotify_token()
    headers = {"Authorization": f"Bearer {token}"}

    search_query = f"mood {emotion}"
    res = requests.get(
        "https://api.spotify.com/v1/search",
        params={"q": search_query, "type": "track", "limit": 10},
        headers=headers,
        timeout=30,
    )

    if res.status_code != 200:
        return {"error": "Spotify search failed", "status_code": res.status_code}

    items = res.json().get("tracks", {}).get("items", [])
    tracks = []
    for item in items:
        track_info = {
            "title": item["name"],
            "artist": item["artists"][0]["name"],
            "url": item["external_urls"]["spotify"],
        }
        tracks.append(track_info)

    return {"tracks": tracks}


@app.get("/test-cors")
def test_cors():
    """
    Quick route to ensure CORS is working.
    """
    return {"msg": "CORS is active if you can read this from the frontend."}
