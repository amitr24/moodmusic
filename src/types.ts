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
  emotion: Emotion;
  url?: string;
}

export interface EmotionTheme {
  background: string;
  text: string;
  accent: string;
}
