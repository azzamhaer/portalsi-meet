'use client';

import { useState, useEffect } from 'react';
import { X, Monitor, Sparkles, Sun, Volume2, Mic, Camera } from 'lucide-react';

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [devices, setDevices] = useState<{ audio: MediaDeviceInfo[]; video: MediaDeviceInfo[] }>({ audio: [], video: [] });
  const [blurBg, setBlurBg] = useState(false);
  const [enhanceLight, setEnhanceLight] = useState(false);
  const [noiseSuppression, setNoiseSuppression] = useState(true);

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then((all) => {
      setDevices({
        audio: all.filter((d) => d.kind === 'audioinput'),
        video: all.filter((d) => d.kind === 'videoinput'),
      });
    }).catch(() => {});
  }, []);

  return (
    <aside className="flex flex-col h-full w-full md:w-[340px] glass-panel md:rounded-2xl overflow-hidden animate-slide-in-right">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2">
          <Monitor className="h-4 w-4 text-meet-accent" /> Pengaturan
        </h2>
        <button onClick={onClose} className="glass-button rounded-full p-1.5">
          <X className="h-4 w-4 text-white/70" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto meet-scrollbar p-5 space-y-6">
        {/* Camera */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-white/40 uppercase tracking-wider flex items-center gap-1.5">
            <Camera className="h-3.5 w-3.5" /> Kamera
          </label>
          <select className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/80 outline-none focus:border-meet-accent/40">
            {devices.video.length > 0
              ? devices.video.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Camera'}</option>)
              : <option>Default Camera</option>}
          </select>
        </div>

        {/* Microphone */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-white/40 uppercase tracking-wider flex items-center gap-1.5">
            <Mic className="h-3.5 w-3.5" /> Mikrofon
          </label>
          <select className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/80 outline-none focus:border-meet-accent/40">
            {devices.audio.length > 0
              ? devices.audio.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Microphone'}</option>)
              : <option>Default Microphone</option>}
          </select>
        </div>

        {/* Speaker */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-white/40 uppercase tracking-wider flex items-center gap-1.5">
            <Volume2 className="h-3.5 w-3.5" /> Speaker
          </label>
          <select className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/80 outline-none focus:border-meet-accent/40">
            <option>Default Speaker</option>
          </select>
        </div>

        <hr className="border-white/[0.06]" />

        {/* Visual Effects */}
        <div className="space-y-4">
          <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider">Efek Visual</h3>

          {/* Blur Background */}
          <label className="flex items-center justify-between cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/[0.05]"><Sparkles className="h-4 w-4 text-purple-400" /></div>
              <div>
                <p className="text-sm font-medium text-white/80">Blur Latar Belakang</p>
                <p className="text-[11px] text-white/30">Samarkan background Anda</p>
              </div>
            </div>
            <div className={`w-11 h-6 rounded-full relative transition-all ${blurBg ? 'bg-meet-accent' : 'bg-white/10'}`}
                 onClick={() => setBlurBg(!blurBg)}>
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${blurBg ? 'translate-x-5' : ''}`} />
            </div>
          </label>

          {/* Enhance Lighting */}
          <label className="flex items-center justify-between cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/[0.05]"><Sun className="h-4 w-4 text-yellow-400" /></div>
              <div>
                <p className="text-sm font-medium text-white/80">Enhance Lighting</p>
                <p className="text-[11px] text-white/30">Perbaiki pencahayaan wajah</p>
              </div>
            </div>
            <div className={`w-11 h-6 rounded-full relative transition-all ${enhanceLight ? 'bg-meet-accent' : 'bg-white/10'}`}
                 onClick={() => setEnhanceLight(!enhanceLight)}>
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enhanceLight ? 'translate-x-5' : ''}`} />
            </div>
          </label>

          {/* Noise Suppression */}
          <label className="flex items-center justify-between cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/[0.05]"><Volume2 className="h-4 w-4 text-green-400" /></div>
              <div>
                <p className="text-sm font-medium text-white/80">Noise Suppression</p>
                <p className="text-[11px] text-white/30">Kurangi noise latar belakang</p>
              </div>
            </div>
            <div className={`w-11 h-6 rounded-full relative transition-all ${noiseSuppression ? 'bg-meet-accent' : 'bg-white/10'}`}
                 onClick={() => setNoiseSuppression(!noiseSuppression)}>
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${noiseSuppression ? 'translate-x-5' : ''}`} />
            </div>
          </label>
        </div>
      </div>
    </aside>
  );
}
