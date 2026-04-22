'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Check, Eye, EyeOff, Clock, Shield, Wifi } from 'lucide-react';

export function InfoPanel({
  roomId,
  isHost,
  password,
  onClose,
}: {
  roomId: string;
  isHost: boolean;
  password?: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [joinTime] = useState(() => Date.now());

  useEffect(() => {
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - joinTime) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [joinTime]);

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${m}:${String(sec).padStart(2, '0')}`;
  };

  async function copyRoomInfo() {
    let text = roomId;
    if (password) {
      const encoded = btoa(password);
      text += ` | pw:${encoded}`;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <aside className="flex flex-col h-full w-full md:w-[340px] glass-panel md:rounded-2xl overflow-hidden animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2">
          <Shield className="h-4 w-4 text-meet-accent" /> Info Meeting
        </h2>
        <button onClick={onClose} className="glass-button rounded-full p-1.5">
          <X className="h-4 w-4 text-white/70" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto meet-scrollbar p-5 space-y-5">
        {/* Room ID */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Room ID</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 font-mono text-lg font-bold tracking-[0.25em] text-meet-accent select-all">
              {roomId}
            </div>
            <button
              onClick={copyRoomInfo}
              className="glass-button rounded-xl p-3 shrink-0"
              title={password ? 'Copy Room ID + Password (encoded)' : 'Copy Room ID'}
            >
              {copied ? <Check className="h-5 w-5 text-green-400" /> : <Copy className="h-5 w-5 text-white/70" />}
            </button>
          </div>
          {copied && (
            <p className="text-xs text-green-400 animate-fade-in">
              {password ? 'Room ID + password (encoded) tersalin!' : 'Room ID tersalin!'}
            </p>
          )}
        </div>

        {/* Password (host only) */}
        {isHost && password && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Password</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 font-mono text-base text-white/80">
                {showPw ? password : '••••••••'}
              </div>
              <button
                onClick={() => setShowPw(!showPw)}
                className="glass-button rounded-xl p-3 shrink-0"
              >
                {showPw ? <EyeOff className="h-5 w-5 text-white/70" /> : <Eye className="h-5 w-5 text-white/70" />}
              </button>
            </div>
            <p className="text-[11px] text-white/30">Hanya host yang bisa melihat password.</p>
          </div>
        )}

        {/* Duration */}
        <div className="flex items-center gap-3 bg-white/[0.04] rounded-xl px-4 py-3">
          <Clock className="h-5 w-5 text-meet-accent shrink-0" />
          <div>
            <p className="text-xs text-white/40">Durasi Meeting</p>
            <p className="text-lg font-bold font-mono text-white/90 tabular-nums">{fmt(elapsed)}</p>
          </div>
        </div>

        {/* Connection */}
        <div className="flex items-center gap-3 bg-white/[0.04] rounded-xl px-4 py-3">
          <Wifi className="h-5 w-5 text-green-400 shrink-0" />
          <div>
            <p className="text-xs text-white/40">Koneksi</p>
            <p className="text-sm font-medium text-green-400">Stabil</p>
          </div>
        </div>

        {/* Role */}
        <div className="flex items-center gap-3 bg-white/[0.04] rounded-xl px-4 py-3">
          <Shield className="h-5 w-5 text-yellow-400 shrink-0" />
          <div>
            <p className="text-xs text-white/40">Peran Anda</p>
            <p className="text-sm font-medium text-white/80">{isHost ? 'Host (Admin)' : 'Peserta'}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
