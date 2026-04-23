'use client';

import { useState, useEffect, useRef } from 'react';
import { useParticipants, useLocalParticipant, useTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Users, X, Crown, Search, Mic, MicOff, Video, VideoOff, ScreenShare, Check, XCircle, Clock, Bell } from 'lucide-react';

interface WaitingUser { waitingId: string; name: string; ts: number; }

export function ParticipantsPanel({
  isHost, roomId, onClose, onStopShare, hostIdentity,
}: {
  isHost: boolean; roomId: string; onClose: () => void;
  onStopShare?: (identity: string) => void;
  hostIdentity?: string;
}) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [search, setSearch] = useState('');
  const tracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }], { onlySubscribed: false });
  const [waitingUsers, setWaitingUsers] = useState<WaitingUser[]>([]);
  const pollRef = useRef<any>(null);

  // Poll waiting users if host
  useEffect(() => {
    if (!isHost) return;
    const poll = async () => {
      try {
        const hid = localParticipant.identity;
        const res = await fetch(`/api/rooms/${roomId}/waiting?hostIdentity=${hid}`);
        if (res.ok) { const data = await res.json(); setWaitingUsers(data.waiting || []); }
      } catch {}
    };
    poll();
    pollRef.current = setInterval(poll, 5000);
    return () => clearInterval(pollRef.current);
  }, [isHost, roomId, localParticipant.identity]);

  async function handleWaiting(waitingId: string, userName: string, action: 'approve' | 'reject') {
    try {
      await fetch(`/api/rooms/${roomId}/waiting`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostIdentity: localParticipant.identity, action, waitingId, userName }),
      });
      setWaitingUsers(p => p.filter(u => u.waitingId !== waitingId));
    } catch {}
  }

  async function kickParticipant(identity: string) {
    if (!isHost) return;
    if (!confirm('Keluarkan peserta ini?')) return;
    try { await fetch(`/api/rooms/${roomId}/kick`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity }) }); } catch {}
  }

  const filtered = participants.filter(p => !search || (p.name || '').toLowerCase().includes(search.toLowerCase()));

  function nameColor(name: string) {
    const c = ['#8ab4f8', '#81c995', '#f28b82', '#fdd663', '#c58af9', '#78d9ec', '#fcad70', '#ff8a80'];
    let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return c[Math.abs(h) % c.length];
  }

  return (
    <aside className="flex flex-col h-full w-full md:w-[340px] glass-panel md:rounded-2xl overflow-hidden animate-slide-in-right">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2">
          <Users className="h-4 w-4 text-[#8ab4f8]" /> Peserta ({participants.length})
        </h2>
        <button onClick={onClose} className="glass-button rounded-full p-1.5"><X className="h-4 w-4 text-white/70" /></button>
      </div>

      {/* Waiting users (host only) */}
      {isHost && waitingUsers.length > 0 && (
        <div className="px-4 py-3 border-b border-white/[0.06] space-y-2">
          <div className="flex items-center gap-2">
            <Bell className="h-3.5 w-3.5 text-yellow-400 animate-pulse" />
            <p className="text-[11px] text-yellow-400 uppercase tracking-wider font-semibold">Menunggu Persetujuan ({waitingUsers.length})</p>
          </div>
          {waitingUsers.map(u => (
            <div key={u.waitingId} className="flex items-center gap-3 p-2 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold bg-yellow-500/15 text-yellow-400">
                <Clock className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/90 truncate">{u.name}</p>
                <p className="text-[10px] text-white/30">Menunggu izin masuk</p>
              </div>
              <button onClick={() => handleWaiting(u.waitingId, u.name, 'approve')}
                className="p-1.5 rounded-full bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-all" title="Terima">
                <Check className="h-4 w-4" />
              </button>
              <button onClick={() => handleWaiting(u.waitingId, u.name, 'reject')}
                className="p-1.5 rounded-full bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-all" title="Tolak">
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari peserta..."
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#8ab4f8]/40 transition-all" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto meet-scrollbar px-4 pb-4 space-y-1">
        {filtered.map(p => {
          const isLocal = p.identity === localParticipant.identity;
          const isTheHost = p.identity.startsWith('host-');
          const mic = p.getTrackPublication(Track.Source.Microphone);
          const cam = p.getTrackPublication(Track.Source.Camera);
          const micOn = !!mic && !mic.isMuted;
          const camOn = !!cam && !cam.isMuted;
          const color = nameColor(p.name || 'A');
          const isSharing = tracks.some(t => t.participant.identity === p.identity);

          return (
            <div key={p.identity} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] transition-all group">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: `${color}20`, color }}>
                {p.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate flex items-center gap-1.5 text-white/90">
                  {p.name || 'Anonim'}
                  {isLocal && <span className="text-[10px] text-white/40 font-normal">(Anda)</span>}
                  {isTheHost && <Crown className="h-3.5 w-3.5 text-yellow-400" />}
                  {isSharing && <ScreenShare className="h-3 w-3 text-green-400" />}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`p-1 rounded-full ${micOn ? 'text-white/50' : 'text-red-400/70 bg-red-400/10'}`}>{micOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}</span>
                <span className={`p-1 rounded-full ${camOn ? 'text-white/50' : 'text-red-400/70 bg-red-400/10'}`}>{camOn ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}</span>
              </div>
              {isHost && !isLocal && (
                <div className="hidden group-hover:flex items-center gap-1">
                  {isSharing && onStopShare && (
                    <button onClick={() => onStopShare(p.identity)} className="rounded-full p-1.5 text-yellow-400 hover:bg-yellow-400/10 transition-all" title="Stop share">
                      <ScreenShare className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button onClick={() => kickParticipant(p.identity)} className="rounded-full p-1.5 text-red-400 hover:bg-red-400/10 transition-all" title="Keluarkan">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
