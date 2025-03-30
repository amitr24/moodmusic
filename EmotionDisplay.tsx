import React from "react";
import { Emotion } from "../types";
import {
  Smile,
  Frown,
  Flame,
  Cloud,
  AlertTriangle,
  Zap,
  ThumbsDown,
} from "lucide-react";

interface EmotionDisplayProps {
  emotion: Emotion | null;
}

const emotionConfig = {
  happy: {
    icon: Smile,
    color: "text-yellow-500",
    label: "Happy",
    animation: "animate-bounce",
  },
  sad: {
    icon: Frown,
    color: "text-blue-500",
    label: "Sad",
    animation: "animate-pulse",
  },
  angry: {
    icon: Flame,
    color: "text-red-500",
    label: "Angry",
    animation: "animate-spin",
  },
  calm: {
    icon: Cloud,
    color: "text-green-500",
    label: "Calm",
    animation: "animate-float",
  },
  fearful: {
    icon: AlertTriangle,
    color: "text-gray-500",
    label: "Fearful",
    animation: "animate-shake",
  },
  surprise: {
    icon: Zap,
    color: "text-pink-500",
    label: "Surprised",
    animation: "animate-wiggle",
  },
  disgust: {
    icon: ThumbsDown,
    color: "text-lime-600",
    label: "Disgusted",
    animation: "animate-pulse",
  },
} as const;

export const EmotionDisplay: React.FC<EmotionDisplayProps> = ({ emotion }) => {
  if (!emotion || !(emotion in emotionConfig)) return null;

  const config = emotionConfig[emotion];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full transition-all duration-300 hover:bg-white/20">
      <Icon className={`w-8 h-8 ${config.color} ${config.animation}`} />
      <span className="text-xl font-semibold">{config.label}</span>
    </div>
  );
};
