import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatsAppAudioPlayerProps {
  src: string;
  outbound?: boolean;
}

const formatTime = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export function WhatsAppAudioPlayer({ src, outbound = false }: WhatsAppAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrent(a.currentTime);
    const onLoaded = () => setDuration(a.duration || 0);
    const onEnd = () => { setPlaying(false); setCurrent(0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("durationchange", onLoaded);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("durationchange", onLoaded);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) { a.play(); setPlaying(true); }
    else { a.pause(); setPlaying(false); }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    const bar = barRef.current;
    if (!a || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    a.currentTime = pct * duration;
    setCurrent(a.currentTime);
  };

  const cycleRate = () => {
    const a = audioRef.current;
    if (!a) return;
    const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    a.playbackRate = next;
    setRate(next);
  };

  const progress = duration ? (current / duration) * 100 : 0;
  // Static waveform bars (pseudo-random but stable per src)
  const bars = Array.from({ length: 38 }, (_, i) => {
    const seed = (src.length + i * 7) % 17;
    const h = 25 + ((seed * 13) % 70);
    return h;
  });

  const accent = outbound ? "text-white" : "text-[#00a884]";
  const accentBg = outbound ? "bg-white" : "bg-[#00a884]";
  const inactive = outbound ? "bg-white/30" : "bg-foreground/25";

  return (
    <div className={cn(
      "flex items-center gap-2.5 py-1.5 pl-1 pr-2 rounded-full min-w-[220px] max-w-[300px]",
    )}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95",
          outbound ? "bg-white/90 text-[#005c4b]" : "bg-[#00a884] text-white"
        )}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div
          ref={barRef}
          onClick={seek}
          className="relative h-6 flex items-center gap-[2px] cursor-pointer"
        >
          {bars.map((h, i) => {
            const filled = (i / bars.length) * 100 <= progress;
            return (
              <div
                key={i}
                className={cn("flex-1 rounded-full transition-colors", filled ? accentBg : inactive)}
                style={{ height: `${h}%`, minHeight: 3 }}
              />
            );
          })}
          {/* Drag handle */}
          <div
            className={cn("absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full shadow", accentBg)}
            style={{ left: `calc(${progress}% - 5px)` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] font-medium opacity-70">
          <span>{formatTime(playing || current > 0 ? current : duration)}</span>
          <button
            type="button"
            onClick={cycleRate}
            className={cn(
              "text-[10px] font-bold px-1.5 py-0 rounded-full leading-tight transition-opacity",
              rate === 1 ? "opacity-0" : "opacity-90",
              outbound ? "bg-white/20 text-white" : "bg-foreground/10 text-foreground"
            )}
          >
            {rate}x
          </button>
        </div>
      </div>
    </div>
  );
}

export default WhatsAppAudioPlayer;