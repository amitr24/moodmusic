import React, { useEffect, useState } from "react";
import { Song, Emotion } from "../types";
import { API_BASE_URL } from "../env";
import { Music, ExternalLink } from "lucide-react";

interface SongListProps {
  songs?: Song[];
  emotion: Emotion | null;
}

export const SongList: React.FC<SongListProps> = ({ emotion }) => {
  const [fetchedSongs, setFetchedSongs] = useState<Song[]>([]);

  useEffect(() => {
    const fetchSongs = async () => {
      if (!emotion) return;
      try {
        const res = await fetch(
          `${API_BASE_URL}/spotify-songs?emotion=${emotion}`
        );
        const data = await res.json();
        const tracks = (data.tracks ?? []) as Omit<Song, "emotion">[];
        setFetchedSongs(
          tracks.map((t) => ({
            ...t,
            emotion,
          }))
        );
      } catch (err) {
        console.error("Failed to fetch Spotify songs:", err);
      }
    };

    fetchSongs();
  }, [emotion]);

  if (!emotion || fetchedSongs.length === 0) return null;

  return (
    <div className="w-full max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">Recommended Songs</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {fetchedSongs.map((song, index) => (
          <a
            key={index}
            href={song.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-3 p-4 bg-white/10 backdrop-blur-md rounded-xl hover:bg-white/20 transition-all duration-300 transform hover:scale-105"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors duration-300">
                <Music className="w-6 h-6 flex-shrink-0" />
              </div>
              <div>
                <h3 className="font-medium line-clamp-1">{song.title}</h3>
                <p className="text-sm opacity-80 line-clamp-1">{song.artist}</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
          </a>
        ))}
      </div>
    </div>
  );
};
