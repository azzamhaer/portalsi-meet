'use client';

import { useState } from 'react';
import { Timer, X } from 'lucide-react';

export function TimerModal({ onClose, onStart }: { onClose: () => void; onStart: (totalSeconds: number) => void }) {
  const [mins, setMins] = useState('5');
  const [secs, setSecs] = useState('0');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const m = parseInt(mins, 10) || 0;
    const s = parseInt(secs, 10) || 0;
    const totalSeconds = m * 60 + s;
    if (totalSeconds > 0) {
      onStart(totalSeconds);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#121218] border border-white/10 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
        <div className="p-6">
          <div className="w-12 h-12 bg-[#8ab4f8]/10 text-[#8ab4f8] rounded-2xl flex items-center justify-center mb-4">
            <Timer className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Atur Timer</h2>
          <p className="text-white/60 text-sm mb-6">
            Masukkan durasi timer dalam menit. Timer akan ditampilkan kepada seluruh peserta.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Menit</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={mins}
                  onChange={e => setMins(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#8ab4f8]/50 focus:bg-white/10 transition-all font-mono text-lg"
                  autoFocus
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Detik</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={secs}
                  onChange={e => setSecs(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#8ab4f8]/50 focus:bg-white/10 transition-all font-mono text-lg"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-white/70 bg-white/5 hover:bg-white/10 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-black bg-[#8ab4f8] hover:bg-[#8ab4f8]/90 shadow-[0_0_20px_rgba(138,180,248,0.3)] transition-all"
              >
                Mulai Timer
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
