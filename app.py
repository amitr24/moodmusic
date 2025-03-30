import io
import os
import base64
import torch
import tempfile
import requests
import soundfile as sf

from fastapi import FastAPI, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from pydub import AudioSegment
from transformers import Wav2Vec2ForSequenceClassification, Wav2Vec2FeatureExtractor

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # For dev only; set a specific domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


MODEL_PATH = "src/components/wav2vec2-ravdess-emotion-checkpoint"
model = Wav2Vec2ForSequenceClassification.from_pretrained(MODEL_PATH)
feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(MODEL_PATH)

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


CLIENT_ID = "8372fe5597f948dfa4a4c1e95294694a"
CLIENT_SECRET = "0b1faf2fc59441af9047aa92f472f5fd"

def get_spotify_token():
    """
    Obtain a Spotify access token using client credentials.
    Make sure you do NOT commit secrets to public repos.
    """
    creds = f"{CLIENT_ID}:{CLIENT_SECRET}"
    creds_b64 = base64.b64encode(creds.encode()).decode()

    headers = {
        "Authorization": f"Basic {creds_b64}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    data = {"grant_type": "client_credentials"}

    auth_response = requests.post(
        "https://accounts.spotify.com/api/token",
        headers=headers,
        data=data
    )
    auth_response.raise_for_status()
    return auth_response.json()["access_token"]


@app.get("/spotify-songs")
def get_songs_by_emotion(emotion: str = Query(..., description="Emotion like happy, sad, etc.")):
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
    Try fetch('http://localhost:8000/test-cors') from your frontend
    or open it in browser devtools -> network -> check 'access-control-allow-origin'.
    """
    return {"msg": "CORS is active if you can read this from the frontend."}

