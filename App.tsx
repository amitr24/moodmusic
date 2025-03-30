import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Music } from "lucide-react";
import { Emotion } from "./types";
import { EmotionDisplay } from "./components/EmotionDisplay";

const emotionThemes = {
  happy: {
    background: "bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-400",
    text: "text-yellow-900",
    accent: "bg-yellow-500 shadow-lg shadow-yellow-500/50",
    ring: "ring-yellow-400",
  },
  sad: {
    background: "bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600",
    text: "text-white",
    accent: "bg-blue-500 shadow-lg shadow-blue-500/50",
    ring: "ring-blue-400",
  },
  angry: {
    background: "bg-gradient-to-br from-red-500 via-red-600 to-red-700",
    text: "text-white",
    accent: "bg-red-600 shadow-lg shadow-red-500/50",
    ring: "ring-red-400",
  },
  calm: {
    background: "bg-gradient-to-br from-green-300 via-green-400 to-green-500",
    text: "text-green-900",
    accent: "bg-green-500 shadow-lg shadow-green-500/50",
    ring: "ring-green-400",
  },
  fearful: {
    background: "bg-gradient-to-br from-gray-700 via-gray-800 to-black",
    text: "text-white",
    accent: "bg-gray-900 shadow-lg shadow-gray-600/50",
    ring: "ring-gray-400",
  },
  surprise: {
    background: "bg-gradient-to-br from-pink-300 via-purple-400 to-indigo-500",
    text: "text-white",
    accent: "bg-indigo-500 shadow-lg shadow-purple-500/50",
    ring: "ring-indigo-400",
  },
  disgust: {
    background: "bg-gradient-to-br from-lime-400 via-green-600 to-emerald-800",
    text: "text-white",
    accent: "bg-lime-600 shadow-lg shadow-lime-400/50",
    ring: "ring-lime-500",
  },
};

interface SpotifySong {
  title: string;
  artist: string;
  url: string;
}

function App() {
  // Toggles the mic icon
  const [isListening, setIsListening] = useState(false);

  // MediaRecorder states
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const chunksRef = useRef<Blob[]>([]);

  // Final emotion
  const [emotion, setEmotion] = useState<Emotion | null>(null);

  // Store recommended songs from Spotify
  const [recommendedTracks, setRecommendedTracks] = useState<SpotifySong[]>([]);

  // Fade-in on initial load
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  useEffect(() => {
    setIsInitialLoad(false);
  }, []);

  // When the emotion changes, fetch from Spotify backend
  useEffect(() => {
    const fetchSpotifySongs = async () => {
      if (!emotion) {
        setRecommendedTracks([]);
        return;
      }
      try {
        const res = await fetch(
          `http://localhost:8000/spotify-songs?emotion=${emotion}`
        );
        const data = await res.json();
        // data.tracks => array of { title, artist, url }
        setRecommendedTracks(data.tracks || []);
      } catch (err) {
        console.error("Error fetching Spotify songs:", err);
      }
    };

    fetchSpotifySongs();
  }, [emotion]);

  // Toggle mic & recording
  const toggleListening = async () => {
    const newState = !isListening;
    setIsListening(newState);

    if (!newState) {
      // Stop
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      // Start
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const mediaRecorder = new MediaRecorder(stream);
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const formData = new FormData();
          formData.append("file", blob, "recording.webm");

          try {
            const res = await fetch("http://localhost:8000/predict-emotion", {
              method: "POST",
              body: formData,
            });
            const data = await res.json();
            if (data.emotion) {
              setEmotion(data.emotion);
            }
          } catch (err) {
            console.error("Upload error:", err);
          }
        };

        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
        setIsRecording(true);
      } catch (error) {
        console.error("Microphone access error:", error);
      }
    }
  };

  // Theming
  const theme = emotion ? emotionThemes[emotion] : emotionThemes.calm;

  return (
    <div
      className={`min-h-screen ${theme.background} ${theme.text} transition-all duration-700`}
    >
      <div className="container mx-auto px-4 py-12 relative">
        <div
          className={`flex flex-col items-center gap-8 transition-opacity duration-500 ${
            isInitialLoad ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="text-center space-y-2">
            <h1 className="text-5xl font-bold tracking-tight">
              Mood Music Recommender
            </h1>
            <p className="text-lg opacity-80">
              Tap the mic to record your voice, and discover your perfect
              playlist
            </p>
          </div>

          {/* The single mic button */}
          <div className="relative mt-8">
            <div
              className={`absolute inset-0 ${theme.accent} rounded-full blur-xl opacity-20 scale-150 transition-all duration-500`}
            />
            <button
              onClick={toggleListening}
              className={`relative p-8 rounded-full ${
                theme.accent
              } hover:opacity-90 transition-all duration-300 transform hover:scale-105 ${
                isListening ? `animate-pulse ${theme.ring} ring-4` : ""
              }`}
              aria-label={isListening ? "Stop listening" : "Start listening"}
            >
              {isListening ? (
                <MicOff className="w-10 h-10" />
              ) : (
                <Mic className="w-10 h-10" />
              )}
            </button>
          </div>

          {/* Show final emotion */}
          <EmotionDisplay emotion={emotion} />

          {/* If we have recommended tracks, show them inline */}
          {recommendedTracks.length > 0 && (
            <div className="w-full max-w-xl mx-auto">
              <h2 className="text-2xl font-bold mb-6 text-center">
                Recommended Songs
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {recommendedTracks.map((track, index) => (
                  <a
                    key={index}
                    href={track.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between gap-3 p-4 bg-white/10 backdrop-blur-md rounded-xl hover:bg-white/20 transition-all duration-300 transform hover:scale-105"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors duration-300">
                        <Music className="w-6 h-6 flex-shrink-0" />
                      </div>
                      <div>
                        <h3 className="font-medium line-clamp-1">
                          {track.title}
                        </h3>
                        <p className="text-sm opacity-80 line-clamp-1">
                          {track.artist}
                        </p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* If no emotion yet */}
          {!emotion && (
            <div className="text-center mt-8 space-y-2 opacity-60">
              <Music className="w-8 h-8 mx-auto" />
              <p>Record how you feel to get song suggestions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
