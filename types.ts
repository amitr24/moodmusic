export type Emotion =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'calm'
  | 'fearful'
  | 'surprise'
  | 'disgust';

export interface Song {
  title: string;
  artist: string;
  emotion: Emotion;  // Only if you still need local emotion data
  url?: string;        // <-- Add this (optional if some songs don't have a URL)
}


export interface EmotionTheme {
  background: string;
  text: string;
  accent: string;
}
