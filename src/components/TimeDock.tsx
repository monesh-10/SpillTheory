import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';

interface TimeDockProps {
  currentMinutes: number;
  onChangeMinutes: (mins: number) => void;
  maxMinutes?: number;
}

export const TimeDock: React.FC<TimeDockProps> = ({
  currentMinutes,
  onChangeMinutes,
  maxMinutes = 180,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);

  // Auto-play interval
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        if (currentMinutes >= maxMinutes) {
          setIsPlaying(false);
        } else {
          onChangeMinutes(Math.min(currentMinutes + 1 * speedMultiplier, maxMinutes));
        }
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, speedMultiplier, maxMinutes, currentMinutes, onChangeMinutes]);

  const baseMinutes = 1 * 60 + 30; // 01:30
  const totalMins = baseMinutes + currentMinutes;
  const h = Math.floor(totalMins / 60) % 24;
  const m = Math.floor(totalMins % 60);
  const formattedTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} UTC`;

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-xl bg-[#121824] border border-[#28354b] rounded-md px-3 py-1.5 shadow-elevated text-slate-200 select-none font-sans flex items-center justify-between gap-3">
      {/* Play Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-1 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          title={isPlaying ? 'Pause Replay' : 'Play Reconstruction'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={() => {
            setIsPlaying(false);
            onChangeMinutes(0);
          }}
          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#1a2332] transition-colors"
          title="Reset to Initial Window (01:30 UTC)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setSpeedMultiplier(speedMultiplier === 1 ? 2 : speedMultiplier === 2 ? 3 : 1)}
          className="px-1.5 py-0.5 rounded text-[11px] text-slate-300 font-mono font-medium hover:bg-[#1a2332] border border-[#28354b] transition-colors"
          title="Toggle Replay Speed"
        >
          {speedMultiplier}×
        </button>
      </div>

      {/* Scrubber slider */}
      <div className="flex-1 flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={maxMinutes}
          value={currentMinutes}
          onChange={(e) => onChangeMinutes(Number(e.target.value))}
          className="w-full h-1 bg-[#1f2937] rounded appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      {/* Clock display */}
      <div className="flex items-center gap-1.5 shrink-0 text-xs text-slate-300">
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-mono tabular-nums text-xs font-semibold text-slate-100">{formattedTime}</span>
      </div>
    </div>
  );
};
