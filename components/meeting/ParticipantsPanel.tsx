'use client';

import { useState, useEffect, useRef } from 'react';
import { useParticipants, useLocalParticipant, useTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Users, X, Crown, Search, Mic, MicOff, Video, VideoOff, ScreenShare, Check, XCircle, Clock, Bell, Pin, PinOff } from 'lucide-react';

interface WaitingUser { waitingId: string; name: string; ts: number; }

export function ParticipantsPanel({
  isHost, isSuperAdmin, roomId, onClose, onStopShare, admins, pub, localIdentity, onPromote, onDemote,
  globalPinnedIdentity, onPinGlobal, onUnpinGlobal, focusedIdentity, onFocusParticipant, superAdminIdentity
}: {
  isHost: boolean; isSuperAdmin?: boolean; roomId: string; onClose: () => void;
  onStopShare?: (identity: string) => void;
  admins?: Set<string>; pub?: (d: any) => void; localIdentity?: string;
  onPromote?: (id: string) => void; onDemote?: (id: string) => void;
  globalPinnedIdentity?: string | null; onPinGlobal?: (id: string) => void; onUnpinGlobal?: () => void;
  focusedIdentity?: string | null; onFocusParticipant?: (id: string | null) => void;
  superAdminIdentity?: string | null;
}) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [search, setSearch] = useState('');
  const tracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }], { onlySubscribed: false });
  const [waitingUsers, setWaitingUsers] = useState<WaitingUser[]>([]);
  const pollRef = useRef<any>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'promote' | 'demote' | 'kick', target: string, name: string } | null>(null);

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

  function kickParticipant(identity: string, name: string) {
    if (!isHost) return;
    setConfirmAction({ type: 'kick', target: identity, name });
  }

  function handlePromote(identity: string, name: string) {
    setConfirmAction({ type: 'promote', target: identity, name });
  }

  function handleDemote(identity: string, name: string) {
    setConfirmAction({ type: 'demote', target: identity, name });
  }

  const executeConfirm = () => {
    if (!confirmAction) return;
    const { type, target } = confirmAction;
    if (type === 'promote' && onPromote) onPromote(target);
    else if (type === 'demote' && onDemote) onDemote(target);
    else if (type === 'kick') {
      pub?.({ type: 'host_action', action: 'kick', target });
      try { fetch(`/api/rooms/${roomId}/kick`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity: target }) }); } catch {}
    }
    setConfirmAction(null);
  };

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
          const isRealSuperAdmin = superAdminIdentity ? p.identity === superAdminIdentity : p.identity.startsWith('host-');
          const isTheHost = isRealSuperAdmin || p.identity.startsWith('host-') || admins?.has(p.identity);
          const mic = p.getTrackPublication(Track.Source.Microphone);
          const cam = p.getTrackPublication(Track.Source.Camera);
          const micOn = !!mic && !mic.isMuted;
          const camOn = !!cam && !cam.isMuted;
          const color = nameColor(p.name || 'A');
          const isSharing = tracks.some(t => t.participant.identity === p.identity);
          const isPinnedForMe = focusedIdentity === p.identity;
          const isPinnedGlobal = globalPinnedIdentity === p.identity;

          return (
            <div key={p.identity} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] transition-all group">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: `${color}20`, color }}>
                {p.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate flex items-center gap-1.5 text-white/90">
                  {p.name || 'Anonim'}
                  {isLocal && <span className="text-[10px] text-white/40 font-normal">(Anda)</span>}
                  {isRealSuperAdmin ? <Crown className="h-3.5 w-3.5 text-yellow-400" /> : isTheHost ? <span className="text-[10px] bg-[#8ab4f8]/20 text-[#8ab4f8] px-1.5 rounded uppercase font-bold tracking-wider">Admin</span> : null}
                  {isSharing && <ScreenShare className="h-3 w-3 text-green-400" />}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {isPinnedGlobal && <span className="p-1 rounded-full text-blue-400 bg-blue-400/10" title="Di-pin untuk Semua"><Pin className="h-3.5 w-3.5" /></span>}
                {isPinnedForMe && !isPinnedGlobal && <span className="p-1 rounded-full text-white/50 bg-white/10" title="Di-pin untuk Anda"><Pin className="h-3.5 w-3.5" /></span>}
                <span className={`p-1 rounded-full ${micOn ? 'text-white/50' : 'text-red-400/70 bg-red-400/10'}`}>{micOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}</span>
                <span className={`p-1 rounded-full ${camOn ? 'text-white/50' : 'text-red-400/70 bg-red-400/10'}`}>{camOn ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}</span>
              </div>
              <div className="hidden group-hover:flex items-center gap-1">
                {onFocusParticipant && (
                  <button onClick={() => onFocusParticipant(isPinnedForMe ? null : p.identity)} className="rounded-full p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition-all" title={isPinnedForMe ? "Unpin untuk Saya" : "Pin untuk Saya"}>
                    {isPinnedForMe ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </button>
                )}
                {isSuperAdmin && onPinGlobal && onUnpinGlobal && (
                  <button onClick={() => isPinnedGlobal ? onUnpinGlobal() : onPinGlobal(p.identity)} className="rounded-full p-1.5 text-blue-400 hover:bg-blue-400/10 transition-all" title={isPinnedGlobal ? "Unpin untuk Semua" : "Pin untuk Semua"}>
                    {isPinnedGlobal ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
              {isHost && !isLocal && (
                <div className="hidden group-hover:flex items-center gap-1">
                  {isSharing && onStopShare && (
                    <button onClick={() => onStopShare(p.identity)} className="rounded-full p-1.5 text-yellow-400 hover:bg-yellow-400/10 transition-all" title="Stop share">
                      <ScreenShare className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {isSuperAdmin && !isRealSuperAdmin && (
                    isTheHost ? (
                      <button onClick={() => handleDemote(p.identity, p.name || 'Anonim')} className="rounded-full px-2 py-1 text-[10px] font-bold text-red-400 bg-red-400/10 hover:bg-red-400/20 transition-all" title="Hapus Admin">Demote</button>
                    ) : (
                      <button onClick={() => handlePromote(p.identity, p.name || 'Anonim')} className="rounded-full px-2 py-1 text-[10px] font-bold text-[#8ab4f8] bg-[#8ab4f8]/10 hover:bg-[#8ab4f8]/20 transition-all" title="Jadikan Admin">Promote</button>
                    )
                  )}
                  {!isRealSuperAdmin && (
                    <button onClick={() => kickParticipant(p.identity, p.name || 'Anonim')} className="rounded-full p-1.5 text-red-400 hover:bg-red-400/10 transition-all" title="Keluarkan">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmAction(null)} />
          <div className="relative glass-panel rounded-2xl p-5 w-full max-w-[300px] text-center shadow-2xl border border-white/10 animate-scale-in">
            <h3 className="text-base font-bold text-white mb-2">Konfirmasi Tindakan</h3>
            <p className="text-sm text-white/70 mb-5">
              {confirmAction.type === 'promote' ? `Jadikan ${confirmAction.name} sebagai Admin?` :
               confirmAction.type === 'demote' ? `Hapus status Admin dari ${confirmAction.name}?` :
               `Keluarkan ${confirmAction.name} dari rapat ini?`}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmAction(null)} className="flex-1 py-2 rounded-xl text-xs font-semibold text-white/80 bg-white/[0.07] hover:bg-white/[0.12] transition-all">Batal</button>
              <button onClick={executeConfirm} className={`flex-1 py-2 rounded-xl text-xs font-semibold text-white transition-all ${confirmAction.type === 'kick' || confirmAction.type === 'demote' ? 'bg-red-500 hover:bg-red-400' : 'bg-[#8ab4f8] hover:bg-[#8ab4f8]/90 text-black'}`}>Ya, Lanjutkan</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
