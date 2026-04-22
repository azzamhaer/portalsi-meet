'use client';

import { useState } from 'react';
import { useParticipants, useLocalParticipant, useTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Users, X, Crown, Search, Mic, MicOff, Video, VideoOff, ScreenShare, MessageSquare, Shield, VolumeX, DoorOpen } from 'lucide-react';
import type { RoomPerms } from '../MeetingRoom';

export function ParticipantsPanel({
  isHost, roomId, onClose, perms, onPermsChange, onMuteAll, onStopShare,
}: {
  isHost: boolean; roomId: string; onClose: () => void;
  perms?: RoomPerms; onPermsChange?: (p: RoomPerms) => void;
  onMuteAll?: () => void; onStopShare?: (identity: string) => void;
}) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [search, setSearch] = useState('');
  const tracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }], { onlySubscribed: false });

  const filtered = participants.filter((p) => !search || (p.name || '').toLowerCase().includes(search.toLowerCase()));

  async function kickParticipant(identity: string) {
    if (!isHost) return;
    if (!confirm('Keluarkan peserta ini?')) return;
    try { await fetch(`/api/rooms/${roomId}/kick`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity }) }); } catch {}
  }

  function nameColor(name: string) {
    const c = ['#8ab4f8', '#81c995', '#f28b82', '#fdd663', '#c58af9', '#78d9ec', '#fcad70', '#ff8a80'];
    let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return c[Math.abs(h) % c.length];
  }

  return (
    <aside className="flex flex-col h-full w-full md:w-[340px] glass-panel md:rounded-2xl overflow-hidden animate-slide-in-right">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2"><Users className="h-4 w-4 text-[#8ab4f8]" /> Peserta ({participants.length})</h2>
        <button onClick={onClose} className="glass-button rounded-full p-1.5"><X className="h-4 w-4 text-white/70" /></button>
      </div>

      {/* Host controls */}
      {isHost && perms && onPermsChange && (
        <div className="px-4 py-3 border-b border-white/[0.06] space-y-2">
          <p className="text-[11px] text-white/30 uppercase tracking-wider font-semibold">Kontrol Host</p>
          <div className="flex flex-wrap gap-1.5">
            <PermToggle icon={<MessageSquare className="h-3.5 w-3.5" />} label="Chat" active={perms.allowChat} onClick={() => onPermsChange({ ...perms, allowChat: !perms.allowChat })} />
            <PermToggle icon={<ScreenShare className="h-3.5 w-3.5" />} label="Share" active={perms.allowScreenShare} onClick={() => onPermsChange({ ...perms, allowScreenShare: !perms.allowScreenShare })} />
            <PermToggle icon={<DoorOpen className="h-3.5 w-3.5" />} label="Join" active={perms.allowJoin} onClick={() => onPermsChange({ ...perms, allowJoin: !perms.allowJoin })} />
          </div>
          <button onClick={onMuteAll} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
            <VolumeX className="h-3.5 w-3.5" /> Bisukan Semua Peserta
          </button>
        </div>
      )}

      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari peserta..."
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#8ab4f8]/40 transition-all" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto meet-scrollbar px-4 pb-4 space-y-1">
        {filtered.map((p) => {
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
                    <button onClick={() => onStopShare(p.identity)} className="rounded-full p-1.5 text-yellow-400 hover:bg-yellow-400/10 transition-all" title="Stop screen share">
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

function PermToggle({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${active ? 'bg-[#8ab4f8]/15 text-[#8ab4f8] border border-[#8ab4f8]/20' : 'bg-white/[0.04] text-white/40 border border-white/[0.06]'}`}>
      {icon} {label}
    </button>
  );
}
