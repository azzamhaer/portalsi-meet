'use client';

import { useState } from 'react';
import { useParticipants, useLocalParticipant } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Users, X, Crown, Search, Mic, MicOff, Video, VideoOff } from 'lucide-react';

export function ParticipantsPanel({
  isHost,
  roomId,
  onClose,
}: {
  isHost: boolean;
  roomId: string;
  onClose: () => void;
}) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [search, setSearch] = useState('');

  const filtered = participants.filter((p) =>
    !search || (p.name || '').toLowerCase().includes(search.toLowerCase())
  );

  async function kickParticipant(identity: string) {
    if (!isHost) return;
    if (!confirm('Keluarkan peserta ini?')) return;
    try {
      await fetch(`/api/rooms/${roomId}/kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity }),
      });
    } catch (e) {
      console.error('[kick]', e);
    }
  }

  // Generate consistent color from name
  function nameColor(name: string) {
    const colors = ['#8ab4f8', '#81c995', '#f28b82', '#fdd663', '#c58af9', '#78d9ec', '#fcad70', '#ff8a80'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  return (
    <aside className="flex flex-col h-full w-full md:w-[340px] glass-panel md:rounded-2xl overflow-hidden animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2">
          <Users className="h-4 w-4 text-meet-accent" /> Peserta ({participants.length})
        </h2>
        <button onClick={onClose} className="glass-button rounded-full p-1.5">
          <X className="h-4 w-4 text-white/70" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari peserta..."
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-meet-accent/40 transition-all"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto meet-scrollbar px-4 pb-4 space-y-1">
        {filtered.map((p) => {
          const isLocal = p.identity === localParticipant.identity;
          const isTheHost = p.identity.startsWith('host-');
          const mic = p.getTrackPublication(Track.Source.Microphone);
          const cam = p.getTrackPublication(Track.Source.Camera);
          const micOn = !!mic && !mic.isMuted;
          const camOn = !!cam && !cam.isMuted;
          const color = nameColor(p.name || 'A');

          return (
            <div key={p.identity} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] transition-all group">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                style={{ background: `${color}20`, color }}
              >
                {p.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate flex items-center gap-1.5 text-white/90">
                  {p.name || 'Anonim'}
                  {isLocal && <span className="text-[10px] text-white/40 font-normal">(Anda)</span>}
                  {isTheHost && <Crown className="h-3.5 w-3.5 text-yellow-400" />}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`p-1 rounded-full ${micOn ? 'text-white/50' : 'text-red-400/70 bg-red-400/10'}`}>
                  {micOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                </span>
                <span className={`p-1 rounded-full ${camOn ? 'text-white/50' : 'text-red-400/70 bg-red-400/10'}`}>
                  {camOn ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
                </span>
              </div>
              {isHost && !isLocal && !isTheHost && (
                <button
                  onClick={() => kickParticipant(p.identity)}
                  className="hidden group-hover:flex rounded-full p-1.5 text-red-400 hover:bg-red-400/10 transition-all"
                  title="Keluarkan"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
