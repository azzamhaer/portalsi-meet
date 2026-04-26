'use client';

import { useState, useEffect } from 'react';
import { useLocalParticipant } from '@livekit/components-react';
import { ConnectionQuality } from 'livekit-client';
import { X, Copy, Check, Eye, EyeOff, Clock, Shield, Pencil, Save, Trash2, Loader2 } from 'lucide-react';

function SignalBars() {
  const { localParticipant } = useLocalParticipant();
  const [quality, setQuality] = useState(localParticipant.connectionQuality);

  useEffect(() => {
    const iv = setInterval(() => setQuality(localParticipant.connectionQuality), 1000);
    return () => clearInterval(iv);
  }, [localParticipant]);

  const bars = quality === ConnectionQuality.Excellent ? 3 : quality === ConnectionQuality.Good ? 2 : quality === ConnectionQuality.Poor ? 1 : 0;
  const color = bars >= 3 ? '#22c55e' : bars === 2 ? '#eab308' : bars === 1 ? '#ef4444' : '#6b7280';
  const label = bars >= 3 ? 'Sangat Baik' : bars === 2 ? 'Cukup Baik' : bars === 1 ? 'Buruk' : 'Mengecek...';

  return (
    <div className="flex items-center gap-3 bg-white/[0.04] rounded-xl px-4 py-3">
      <div className="flex items-end gap-[3px] h-5 w-5 shrink-0">
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            width: 4, height: i === 1 ? 8 : i === 2 ? 13 : 18, borderRadius: 2,
            background: i <= bars ? color : 'rgba(255,255,255,0.1)',
            transition: 'background 0.3s ease',
          }} />
        ))}
      </div>
      <div>
        <p className="text-xs text-white/40">Koneksi</p>
        <p className="text-sm font-medium" style={{ color }}>{label}</p>
      </div>
    </div>
  );
}

export function InfoPanel({ roomId, isHost, password, startTime, onClose, allowRename, onRename }: {
  roomId: string; isHost: boolean; password?: string; startTime: number; onClose: () => void;
  allowRename?: boolean; onRename?: (name: string) => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const [copied, setCopied] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(localParticipant.name || '');
  const [localPw, setLocalPw] = useState(password);
  const [editingPw, setEditingPw] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [isSavingPw, setIsSavingPw] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [startTime]);

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`;
  };

  async function copyRoomInfo() {
    let text = window.location.href;
    if (password) text += ` | pw:${btoa(password)}`;
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }

  function handleRename() {
    const trimmed = newName.trim();
    if (trimmed && trimmed !== localParticipant.name && onRename) {
      onRename(trimmed);
    }
    setEditing(false);
  }

  async function handleSavePassword(action: 'set' | 'remove') {
    setIsSavingPw(true);
    try {
      const payload = { 
        hostIdentity: localParticipant.identity,
        password: action === 'set' ? newPw : ''
      };
      const res = await fetch(`/api/rooms/${roomId}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setLocalPw(data.password);
        setEditingPw(false);
        setNewPw('');
      } else {
        alert(data.error || 'Gagal mengubah password');
      }
    } catch (e) {
      alert('Terjadi kesalahan.');
    } finally {
      setIsSavingPw(false);
    }
  }

  const canRename = isHost || (allowRename !== false);

  return (
    <aside className="flex flex-col h-full w-full md:w-[340px] glass-panel md:rounded-2xl overflow-hidden animate-slide-in-right">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2"><Shield className="h-4 w-4 text-[#8ab4f8]" /> Info Meeting</h2>
        <button onClick={onClose} className="glass-button rounded-full p-1.5"><X className="h-4 w-4 text-white/70" /></button>
      </div>
      <div className="flex-1 overflow-y-auto meet-scrollbar p-5 space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Room ID</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 font-mono text-lg font-bold tracking-[0.25em] text-[#8ab4f8] select-all">{roomId}</div>
            <button onClick={copyRoomInfo} className="glass-button rounded-xl p-3 shrink-0" title={password ? 'Copy Room ID + Password' : 'Copy Room ID'}>
              {copied ? <Check className="h-5 w-5 text-green-400" /> : <Copy className="h-5 w-5 text-white/70" />}
            </button>
          </div>
          {copied && <p className="text-xs text-green-400 animate-fade-in">{password ? 'Room ID + password tersalin!' : 'Room ID tersalin!'}</p>}
        </div>
        {isHost && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider flex justify-between items-center">
              <span>Password Room</span>
            </label>
            
            {editingPw ? (
              <div className="flex items-center gap-2">
                <input type="text" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Masukkan password baru" autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSavePassword('set')}
                  className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#8ab4f8]/40" />
                <button onClick={() => handleSavePassword('set')} disabled={isSavingPw || !newPw.trim()} className="glass-button rounded-xl p-2.5 text-green-400 disabled:opacity-50">
                  {isSavingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </button>
                <button onClick={() => { setEditingPw(false); setNewPw(''); }} disabled={isSavingPw} className="glass-button rounded-xl p-2.5 text-white/40 disabled:opacity-50"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 font-mono text-base text-white/80">
                  {localPw ? (showPw ? localPw : '••••••••') : <span className="text-white/40 text-sm">Tidak ada password</span>}
                </div>
                {localPw && (
                  <button onClick={() => setShowPw(!showPw)} className="glass-button rounded-xl p-3 shrink-0">
                    {showPw ? <EyeOff className="h-5 w-5 text-white/70" /> : <Eye className="h-5 w-5 text-white/70" />}
                  </button>
                )}
                <button onClick={() => { setEditingPw(true); setNewPw(localPw || ''); }} className="glass-button rounded-xl p-3 shrink-0" title="Ubah Password">
                  <Pencil className="h-5 w-5 text-white/70" />
                </button>
                {localPw && (
                  <button onClick={() => { if(confirm('Hapus password?')) handleSavePassword('remove') }} disabled={isSavingPw} className="glass-button rounded-xl p-3 shrink-0" title="Hapus Password">
                    {isSavingPw ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5 text-red-400" />}
                  </button>
                )}
              </div>
            )}
            <p className="text-[11px] text-white/30">Hanya host yang bisa melihat & mengubah password.</p>
          </div>
        )}
        <div className="flex items-center gap-3 bg-white/[0.04] rounded-xl px-4 py-3">
          <Clock className="h-5 w-5 text-[#8ab4f8] shrink-0" />
          <div><p className="text-xs text-white/40">Durasi Meeting</p><p className="text-lg font-bold font-mono text-white/90 tabular-nums">{fmt(elapsed)}</p></div>
        </div>
        <SignalBars />
        <div className="flex items-center gap-3 bg-white/[0.04] rounded-xl px-4 py-3">
          <Shield className="h-5 w-5 text-yellow-400 shrink-0" />
          <div><p className="text-xs text-white/40">Peran Anda</p><p className="text-sm font-medium text-white/80">{isHost ? 'Host (Admin)' : 'Peserta'}</p></div>
        </div>

        {/* Rename */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-white/40 uppercase tracking-wider flex items-center gap-1.5">
            <Pencil className="h-3 w-3" /> Nama Anda
          </label>
          {editing ? (
            <div className="flex items-center gap-2">
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} maxLength={40} autoFocus
                onKeyDown={e => e.key === 'Enter' && handleRename()}
                className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#8ab4f8]/40" />
              <button onClick={handleRename} className="glass-button rounded-xl p-2.5 text-green-400"><Check className="h-4 w-4" /></button>
              <button onClick={() => { setEditing(false); setNewName(localParticipant.name || ''); }} className="glass-button rounded-xl p-2.5 text-white/40"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/80">{localParticipant.name || 'Anonim'}</div>
              {canRename && (
                <button onClick={() => { setNewName(localParticipant.name || ''); setEditing(true); }} className="glass-button rounded-xl p-2.5 shrink-0" title="Ganti Nama">
                  <Pencil className="h-4 w-4 text-white/70" />
                </button>
              )}
            </div>
          )}
          {!canRename && <p className="text-[11px] text-white/30">Ganti nama dinonaktifkan oleh host.</p>}
        </div>
      </div>
    </aside>
  );
}
