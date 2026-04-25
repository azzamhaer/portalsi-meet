'use client';

import { useEffect, useState } from 'react';
import { Timer, X } from 'lucide-react';

export function TimerOverlay({ endTime, isHost, onStop }: { endTime: number; isHost: boolean; onStop: () => void }) {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, endTime - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now());
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  const mins = Math.floor(timeLeft / 60000);
  const secs = Math.floor((timeLeft % 60000) / 1000);
  const isBlinking = timeLeft > 0 && timeLeft <= 10000;

  return (
    <div className={`absolute top-4 right-4 z-50 glass-panel rounded-2xl px-4 py-2 flex items-center gap-3 animate-scale-in border ${timeLeft === 0 ? 'border-red-500/50 bg-red-500/10 text-red-400' : 'border-[#8ab4f8]/30 bg-black/40'} ${isBlinking ? 'animate-pulse text-red-400' : 'text-white'}`}>
      <Timer className={`w-5 h-5 ${timeLeft === 0 || isBlinking ? 'text-red-400' : 'text-[#8ab4f8]'}`} />
      <span className="font-mono text-2xl font-bold tracking-wider">
        {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
      </span>
      {isHost && (
        <button onClick={onStop} className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors ml-2">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
