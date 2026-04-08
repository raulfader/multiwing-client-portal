import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2 } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  title: string;
  onTimeUpdate?: (currentTime: number) => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AudioPlayer({ src, title, onTimeUpdate }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(audio.currentTime);
    };
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };
    const handleEnded = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleError = () => {
      setError("Failed to load audio");
      setIsLoading(false);
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
    };
  }, [onTimeUpdate]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      setIsLoading(true);
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setError("Playback failed");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="rounded-xl p-4" style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}>
      <audio ref={audioRef} src={src} preload="metadata" crossOrigin="anonymous" />

      {/* Track info row */}
      <div className="flex items-center gap-3 mb-4">
        {/* Animated waveform / play indicator */}
        <div className="flex items-end gap-[3px] h-6 w-8 shrink-0">
          {isPlaying ? (
            [0, 0.15, 0.3, 0.45].map((delay, i) => (
              <div
                key={i}
                className="wave-bar rounded-sm"
                style={{
                  width: "4px",
                  height: "100%",
                  background: "#FFD600",
                  animationDelay: `${delay}s`,
                  transformOrigin: "bottom",
                }}
              />
            ))
          ) : (
            <Volume2 size={18} style={{ color: "#888888" }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "#FAFAFA" }}>{title}</p>
          {error && <p className="text-xs mt-0.5" style={{ color: "#EF4444" }}>{error}</p>}
        </div>
        <span className="text-xs font-mono shrink-0" style={{ color: "#888888" }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          disabled={!!error}
          className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
          style={{
            background: error ? "#2A2A2A" : "#FFD600",
            color: "#0A0A0A",
          }}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause size={16} fill="currentColor" />
          ) : (
            <Play size={16} fill="currentColor" style={{ marginLeft: "2px" }} />
          )}
        </button>

        {/* Progress bar */}
        <div className="flex-1 relative">
          {/* Background track */}
          <div className="absolute inset-y-0 left-0 right-0 flex items-center pointer-events-none">
            <div className="w-full h-1 rounded-full" style={{ background: "#2A2A2A" }}>
              <div
                className="h-full rounded-full transition-all duration-100"
                style={{ width: `${progress}%`, background: "#FFD600" }}
              />
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="audio-progress relative z-10"
            style={{ background: "transparent" }}
            aria-label="Seek"
          />
        </div>
      </div>
    </div>
  );
}
