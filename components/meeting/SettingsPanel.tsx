'use client';

import { useState, useEffect } from 'react';
import { X, Monitor, Sun, Volume2, Mic, Camera, AlertCircle, Shield, MessageSquare, ScreenShare, Smile, VolumeX, VideoOff, DoorOpen, Users, Pencil, PenTool, BarChart2 } from 'lucide-react';
import type { RoomPerms } from '../MeetingRoom';

export function SettingsPanel({ onClose, enhanceLight, onToggleEnhanceLight, isHost, perms, onPermsChange, onMuteAll, onMuteVideoAll, noiseSuppression, onToggleNoiseSuppression, captionsOn, onToggleCaptions, videoQuality, onVideoQualityChange }: {
  onClose: () => void; enhanceLight: boolean; onToggleEnhanceLight: () => void;
  isHost?: boolean; perms?: RoomPerms; onPermsChange?: (p: RoomPerms) => void;
  onMuteAll?: () => void; onMuteVideoAll?: () => void;
  noiseSuppression?: boolean; onToggleNoiseSuppression?: () => void;
  captionsOn?: boolean; onToggleCaptions?: () => void;
  videoQuality?: 'highest' | 'balanced' | 'lowest' | 'auto'; onVideoQualityChange?: (q: 'highest' | 'balanced' | 'lowest' | 'auto') => void;
}) {
  const [devices, setDevices] = useState<{ audio: MediaDeviceInfo[]; video: MediaDeviceInfo[] }>({ audio: [], video: [] });

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then(all => {
      setDevices({ audio: all.filter(d => d.kind === 'audioinput'), video: all.filter(d => d.kind === 'videoinput') });
    }).catch(() => {});
  }, []);

  return (
    <aside className="flex flex-col h-full w-full md:w-[340px] glass-panel md:rounded-2xl overflow-hidden animate-slide-in-right">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2"><Monitor className="h-4 w-4 text-[#8ab4f8]" /> Pengaturan</h2>
        <button onClick={onClose} className="glass-button rounded-full p-1.5"><X className="h-4 w-4 text-white/70" /></button>
      </div>
      <div className="flex-1 overflow-y-auto meet-scrollbar p-5 space-y-6">

        {/* HOST CONTROLS */}
        {isHost && perms && onPermsChange && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-yellow-400" />
              <h3 className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">Kontrol Host</h3>
            </div>

            <Toggle icon={<MessageSquare className="h-4 w-4 text-[#8ab4f8]" />} title="Izinkan Chat" desc="Peserta bisa mengirim pesan" active={perms.allowChat} onToggle={() => onPermsChange({ ...perms, allowChat: !perms.allowChat })} />
            <Toggle icon={<ScreenShare className="h-4 w-4 text-green-400" />} title="Izinkan Screen Share" desc="Peserta bisa berbagi layar" active={perms.allowScreenShare} onToggle={() => onPermsChange({ ...perms, allowScreenShare: !perms.allowScreenShare })} />
            <Toggle icon={<Smile className="h-4 w-4 text-yellow-400" />} title="Izinkan Reaksi" desc="Peserta bisa kirim reaksi emoji" active={perms.allowReactions} onToggle={() => onPermsChange({ ...perms, allowReactions: !perms.allowReactions })} />
            <Toggle icon={<DoorOpen className="h-4 w-4 text-purple-400" />} title="Izinkan Bergabung" desc="User baru bisa masuk langsung" active={perms.allowJoin} onToggle={() => onPermsChange({ ...perms, allowJoin: !perms.allowJoin })} />

            <hr className="border-white/[0.06]" />

            <Toggle icon={<Users className="h-4 w-4 text-orange-400" />} title="Mode Lobi" desc="User baru harus menunggu persetujuan" active={perms.lobbyMode} onToggle={() => onPermsChange({ ...perms, lobbyMode: !perms.lobbyMode })} />
            <Toggle icon={<Pencil className="h-4 w-4 text-cyan-400" />} title="Izinkan Ganti Nama" desc="Peserta bisa mengubah nama mereka" active={perms.allowRename} onToggle={() => onPermsChange({ ...perms, allowRename: !perms.allowRename })} />
            <Toggle icon={<PenTool className="h-4 w-4 text-pink-400" />} title="Whiteboard Interaktif" desc="Aktifkan kanvas kolaborasi" active={perms.allowWhiteboard} onToggle={() => onPermsChange({ ...perms, allowWhiteboard: !perms.allowWhiteboard })} />
            <Toggle icon={<BarChart2 className="h-4 w-4 text-[#8ab4f8]" />} title="Izinkan Buat Polling" desc="Semua orang bisa membuat polling" active={perms.allowPolls} onToggle={() => onPermsChange({ ...perms, allowPolls: !perms.allowPolls })} />

            <hr className="border-white/[0.06]" />

            <div className="flex gap-2">
              <button onClick={onMuteAll} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/10 transition-all">
                <VolumeX className="h-3.5 w-3.5" /> Bisukan Semua
              </button>
              <button onClick={onMuteVideoAll} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/10 transition-all">
                <VideoOff className="h-3.5 w-3.5" /> Matikan Semua Video
              </button>
            </div>

            <hr className="border-white/[0.06]" />
          </div>
        )}

        {/* DEVICE SETTINGS */}
        <DeviceSelect icon={<Camera className="h-3.5 w-3.5" />} label="Kamera" devices={devices.video} fallback="Default Camera" />
        <DeviceSelect icon={<Mic className="h-3.5 w-3.5" />} label="Mikrofon" devices={devices.audio} fallback="Default Microphone" />
        <DeviceSelect icon={<Volume2 className="h-3.5 w-3.5" />} label="Speaker" devices={[]} fallback="Default Speaker" />
        
        {onVideoQualityChange && (
          <div className="space-y-4 mt-4">
            <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider">Kualitas Video / Performa</h3>
            <Toggle icon={<Camera className="h-4 w-4 text-[#8ab4f8]" />} title="Kualitas Otomatis" desc="Sesuaikan kualitas dengan performa & jaringan" active={videoQuality === 'auto'} onToggle={() => onVideoQualityChange(videoQuality === 'auto' ? 'balanced' : 'auto')} />
            {videoQuality !== 'auto' && (
              <div className="space-y-2 pl-2 border-l-2 border-[#8ab4f8]/30 ml-2 animate-fade-in">
                <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Pilih Kualitas Manual</label>
                <select value={videoQuality || 'balanced'} onChange={e => onVideoQualityChange(e.target.value as 'highest' | 'balanced' | 'lowest')} className="w-full bg-[#121218] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/80 outline-none focus:border-[#8ab4f8]/40 appearance-none cursor-pointer">
                  <option value="highest">Highest (HD, Lebih panas & boros baterai)</option>
                  <option value="balanced">Balanced (Optimal)</option>
                  <option value="lowest">Lowest (Hemat baterai & internet, tidak panas)</option>
                </select>
                <p className="text-[10px] text-white/30 leading-relaxed px-1">Sesuaikan jika HP terasa panas atau koneksi lambat.</p>
              </div>
            )}
          </div>
        )}
        <hr className="border-white/[0.06]" />
        <div className="space-y-4">
          <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider">Efek Visual</h3>
          <Toggle icon={<Sun className="h-4 w-4 text-yellow-400" />} title="Enhance Lighting" desc="Tingkatkan kecerahan & kontras wajah" active={enhanceLight} onToggle={onToggleEnhanceLight} />
          {onToggleNoiseSuppression && (
             <Toggle icon={<Volume2 className="h-4 w-4 text-green-400" />} title="AI Noise Suppression" desc="Hilangkan suara bising dengan AI" active={!!noiseSuppression} onToggle={onToggleNoiseSuppression} />
          )}
          {onToggleCaptions && (
             <Toggle icon={<MessageSquare className="h-4 w-4 text-purple-400" />} title="Live Captions (CC)" desc="Tampilkan teks otomatis" active={!!captionsOn} onToggle={onToggleCaptions} />
          )}
        </div>
        <div className="flex items-start gap-2.5 bg-white/[0.03] rounded-xl p-3">
          <AlertCircle className="h-4 w-4 text-white/30 shrink-0 mt-0.5" />
          <p className="text-[11px] text-white/30 leading-relaxed">Enhance Lighting menggunakan filter CSS real-time pada video Anda.</p>
        </div>
      </div>
    </aside>
  );
}

function DeviceSelect({ icon, label, devices, fallback }: { icon: React.ReactNode; label: string; devices: MediaDeviceInfo[]; fallback: string }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-white/40 uppercase tracking-wider flex items-center gap-1.5">{icon} {label}</label>
      <select className="w-full bg-[#121218] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/80 outline-none focus:border-[#8ab4f8]/40 appearance-none cursor-pointer">
        {devices.length > 0 ? devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || fallback}</option>) : <option>{fallback}</option>}
      </select>
    </div>
  );
}

function Toggle({ icon, title, desc, active, onToggle }: { icon: React.ReactNode; title: string; desc: string; active: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between cursor-pointer group" onClick={onToggle}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-white/[0.04]">{icon}</div>
        <div><p className="text-sm font-medium text-white/80">{title}</p><p className="text-[11px] text-white/25">{desc}</p></div>
      </div>
      <div className={`w-11 h-6 rounded-full relative transition-all shrink-0 ml-3 ${active ? 'bg-[#8ab4f8]' : 'bg-white/10'}`}>
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-5' : ''}`} />
      </div>
    </div>
  );
}
