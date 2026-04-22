'use client';

import { useState, useEffect } from 'react';
import { X, Monitor, Sun, Volume2, Mic, Camera, AlertCircle } from 'lucide-react';

export function SettingsPanel({ onClose, enhanceLight, onToggleEnhanceLight }: {
  onClose: () => void;
  enhanceLight: boolean;
  onToggleEnhanceLight: () => void;
}) {
  const [devices, setDevices] = useState<{ audio: MediaDeviceInfo[]; video: MediaDeviceInfo[] }>({ audio: [], video: [] });
  const [noiseSuppression, setNoiseSuppression] = useState(true);

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then(all => {
      setDevices({ audio: all.filter(d => d.kind === 'audioinput'), video: all.filter(d => d.kind === 'videoinput') });
    }).catch(() => {});
  }, []);

  return (
    <aside className="flex flex-col h-full w-full md:w-[340px] glass-panel md:rounded-2xl overflow-hidden animate-slide-in-right">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2">
          <Monitor className="h-4 w-4 text-[#8ab4f8]" /> Pengaturan
        </h2>
        <button onClick={onClose} className="glass-button rounded-full p-1.5"><X className="h-4 w-4 text-white/70" /></button>
      </div>
      <div className="flex-1 overflow-y-auto meet-scrollbar p-5 space-y-6">
        <DeviceSelect icon={<Camera className="h-3.5 w-3.5" />} label="Kamera" devices={devices.video} fallback="Default Camera" />
        <DeviceSelect icon={<Mic className="h-3.5 w-3.5" />} label="Mikrofon" devices={devices.audio} fallback="Default Microphone" />
        <DeviceSelect icon={<Volume2 className="h-3.5 w-3.5" />} label="Speaker" devices={[]} fallback="Default Speaker" />
        <hr className="border-white/[0.06]" />
        <div className="space-y-4">
          <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider">Efek Visual</h3>
          <Toggle icon={<Sun className="h-4 w-4 text-yellow-400" />} title="Enhance Lighting" desc="Tingkatkan kecerahan & kontras wajah" active={enhanceLight} onToggle={onToggleEnhanceLight} />
          <Toggle icon={<Volume2 className="h-4 w-4 text-green-400" />} title="Noise Suppression" desc="Kurangi noise latar belakang" active={noiseSuppression} onToggle={() => setNoiseSuppression(!noiseSuppression)} />
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
