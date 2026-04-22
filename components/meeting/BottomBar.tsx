'use client';

import { useState, useEffect, useCallback } from 'react';
import { ControlBar, useParticipants, useLocalParticipant, useTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';
import {
  PhoneOff, Info, Users, MessageSquare, Settings, Hand, Smile,
  Copy, PictureInPicture2, MoreVertical, LayoutGrid, Monitor,
  Maximize, EyeOff, Grid3X3,
} from 'lucide-react';
import { Tooltip } from './Tooltip';
import type { PanelType } from './types';

export type ViewMode = 'standard' | 'speaker' | 'gallery';

const REACTIONS = ['👍', '👏', '😂', '❤️', '🎉', '🤔', '👋'];

export function BottomBar({
  roomId, activePanel, onPanelChange, onLeave, viewMode, onViewModeChange, hideSelf, onToggleHideSelf,
}: {
  roomId: string;
  activePanel: PanelType;
  onPanelChange: (p: PanelType) => void;
  onLeave: () => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  hideSelf: boolean;
  onToggleHideSelf: () => void;
}) {
  const [time, setTime] = useState('');
  const [copied, setCopied] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);
  const [floats, setFloats] = useState<{ id: number; emoji: string }[]>([]);
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    const u = () => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    u(); const iv = setInterval(u, 1000); return () => clearInterval(iv);
  }, []);

  const copyId = useCallback(async () => {
    try { await navigator.clipboard.writeText(roomId); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }, [roomId]);

  const toggle = (p: PanelType) => { onPanelChange(activePanel === p ? null : p); };
  const react = (e: string) => {
    const id = Date.now();
    setFloats((p) => [...p, { id, emoji: e }]);
    setTimeout(() => setFloats((p) => p.filter((r) => r.id !== id)), 3000);
    setShowReactions(false);
  };

  const tryPip = async () => {
    try {
      // Try standard video PiP first
      const vid = document.querySelector('.lk-participant-tile video') as HTMLVideoElement | null;
      if (vid && vid.requestPictureInPicture) {
        await vid.requestPictureInPicture();
        return;
      }
      // Fallback: Document PiP
      if ('documentPictureInPicture' in window) {
        const pw = await (window as any).documentPictureInPicture.requestWindow({ width: 360, height: 280 });
        // Copy styles
        const style = pw.document.createElement('style');
        style.textContent = `*{margin:0;box-sizing:border-box}body{background:#0a0a0f;color:#e8eaed;font-family:system-ui;display:flex;flex-direction:column;height:100vh}
        .vid-wrap{flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:0 0 12px 12px}
        video{width:100%;height:100%;object-fit:cover}
        .controls{display:flex;gap:8px;padding:12px;justify-content:center;align-items:center;background:rgba(0,0,0,0.8)}
        button{padding:8px 16px;border:none;border-radius:20px;cursor:pointer;font-size:13px;font-weight:600}
        .leave{background:#ea4335;color:#fff}.mute{background:rgba(255,255,255,0.1);color:#e8eaed}
        .info{text-align:center;padding:8px;font-size:12px;color:rgba(255,255,255,0.4)}`;
        pw.document.head.appendChild(style);

        const container = pw.document.createElement('div');
        container.style.cssText = 'display:flex;flex-direction:column;height:100vh';

        const info = pw.document.createElement('div');
        info.className = 'info';
        info.textContent = `Meeting: ${roomId}`;
        container.appendChild(info);

        // Clone video
        const vidWrap = pw.document.createElement('div');
        vidWrap.className = 'vid-wrap';
        const camTrack = localParticipant.getTrackPublication(Track.Source.Camera)?.track;
        if (camTrack) {
          const v = pw.document.createElement('video');
          v.srcObject = new MediaStream([camTrack.mediaStreamTrack]);
          v.autoplay = true; v.muted = true; v.playsInline = true;
          vidWrap.appendChild(v);
        } else {
          vidWrap.innerHTML = '<div style="color:rgba(255,255,255,0.3);font-size:14px">Kamera mati</div>';
        }
        container.appendChild(vidWrap);

        const controls = pw.document.createElement('div');
        controls.className = 'controls';
        const muteBtn = pw.document.createElement('button');
        muteBtn.className = 'mute';
        muteBtn.textContent = '🎤 Mic';
        let muted = false;
        muteBtn.onclick = () => {
          muted = !muted;
          localParticipant.setMicrophoneEnabled(!muted);
          muteBtn.textContent = muted ? '🔇 Unmute' : '🎤 Mic';
        };
        const leaveBtn = pw.document.createElement('button');
        leaveBtn.className = 'leave';
        leaveBtn.textContent = '📞 Leave';
        leaveBtn.onclick = () => { pw.close(); onLeave(); };
        controls.appendChild(muteBtn);
        controls.appendChild(leaveBtn);
        container.appendChild(controls);
        pw.document.body.appendChild(container);
      }
    } catch (e) { console.log('PiP error:', e); }
  };

  const goFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    setShowViewMenu(false);
  };

  // Close popups on outside click
  useEffect(() => {
    const h = () => { setShowReactions(false); setShowViewMenu(false); setMenuId(null); };
    const t = setTimeout(() => document.addEventListener('click', h), 0);
    return () => { clearTimeout(t); document.removeEventListener('click', h); };
  }, []);

  const [menuId, setMenuId] = useState<string | null>(null);

  return (
    <>
      {/* Floating reactions */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        {floats.map((r) => <span key={r.id} className="reaction-float absolute text-4xl">{r.emoji}</span>)}
      </div>

      {/* Reaction picker */}
      {showReactions && (
        <div className="absolute bottom-[88px] left-1/2 -translate-x-1/2 z-50 glass-panel rounded-2xl px-3 py-2 flex gap-1 animate-scale-in"
             onClick={(e) => e.stopPropagation()}>
          {REACTIONS.map((e) => (
            <button key={e} onClick={() => react(e)} className="text-2xl hover:scale-125 active:scale-95 transition-transform p-1.5 rounded-lg hover:bg-white/10">{e}</button>
          ))}
        </div>
      )}

      {/* View menu */}
      {showViewMenu && (
        <div className="absolute bottom-[88px] right-4 md:right-auto md:left-1/2 md:-translate-x-1/2 z-50 glass-panel rounded-2xl py-2 min-w-[220px] animate-scale-in"
             onClick={(e) => e.stopPropagation()}>
          <p className="px-4 py-1.5 text-[11px] font-semibold text-white/30 uppercase tracking-wider">Tampilan</p>
          {([['standard', 'Standard', <Grid3X3 key="s" className="h-4 w-4" />],
             ['speaker', 'Speaker View', <Monitor key="sp" className="h-4 w-4" />],
             ['gallery', 'Gallery View', <LayoutGrid key="g" className="h-4 w-4" />]] as const).map(([v, label, icon]) => (
            <button key={v} onClick={() => { onViewModeChange(v); setShowViewMenu(false); }}
              className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-all ${viewMode === v ? 'text-[#8ab4f8] bg-[#8ab4f8]/10' : 'text-white/70 hover:bg-white/[0.05]'}`}>
              {icon} {label} {viewMode === v && <span className="ml-auto text-xs">✓</span>}
            </button>
          ))}
          <hr className="border-white/[0.06] my-1" />
          <button onClick={onToggleHideSelf}
            className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-all ${hideSelf ? 'text-[#8ab4f8]' : 'text-white/70 hover:bg-white/[0.05]'}`}>
            <EyeOff className="h-4 w-4" /> Hide Self View {hideSelf && <span className="ml-auto text-xs">✓</span>}
          </button>
          <button onClick={goFullscreen}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white/70 hover:bg-white/[0.05] transition-all">
            <Maximize className="h-4 w-4" /> Fullscreen
          </button>
        </div>
      )}

      {/* Mobile more menu */}
      {showMobileMore && (
        <div className="md:hidden absolute bottom-[88px] right-2 z-50 glass-panel rounded-2xl p-2 flex flex-col gap-1 animate-scale-in min-w-[180px]">
          <MItem icon={<Info className="h-4 w-4" />} label="Info" active={activePanel === 'info'} onClick={() => { toggle('info'); setShowMobileMore(false); }} />
          <MItem icon={<Settings className="h-4 w-4" />} label="Pengaturan" active={activePanel === 'settings'} onClick={() => { toggle('settings'); setShowMobileMore(false); }} />
          <MItem icon={<LayoutGrid className="h-4 w-4" />} label="View" onClick={() => { setShowViewMenu(!showViewMenu); setShowMobileMore(false); }} />
          <MItem icon={<PictureInPicture2 className="h-4 w-4" />} label="PiP" onClick={() => { tryPip(); setShowMobileMore(false); }} />
        </div>
      )}

      {/* === MAIN BAR === */}
      <div className="absolute bottom-0 left-0 right-0 h-[80px] flex items-center justify-between px-3 sm:px-5 z-30"
           style={{ background: 'linear-gradient(to top, rgba(5,5,8,0.97) 0%, rgba(5,5,8,0.7) 70%, transparent 100%)' }}>
        {/* Left */}
        <div className="hidden md:flex items-center gap-3 text-sm min-w-[200px]">
          <span className="font-medium text-white/50 tabular-nums">{time}</span>
          <span className="text-white/15">|</span>
          <button onClick={copyId} className="flex items-center gap-1.5 font-mono font-semibold text-white/50 hover:text-[#8ab4f8] transition-colors group">
            <span className="tracking-wider">{roomId}</span>
            <Copy className={`h-3.5 w-3.5 transition-all ${copied ? 'text-green-400' : 'opacity-0 group-hover:opacity-100'}`} />
          </button>
          {copied && <span className="text-xs text-green-400 animate-fade-in">Tersalin!</span>}
        </div>

        {/* Center */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ControlBar controls={{ microphone: true, camera: true, screenShare: true, chat: false, leave: false }} variation="minimal" className="!bg-transparent !p-0 !gap-1.5" />
          <Tooltip text="Reaksi">
            <button onClick={(e) => { e.stopPropagation(); setShowReactions(!showReactions); }}
              className={`glass-button rounded-full h-12 w-12 flex items-center justify-center ${showReactions ? 'active' : ''}`}>
              <Smile className="h-5 w-5" />
            </button>
          </Tooltip>
          <Tooltip text="Angkat Tangan">
            <button className="glass-button rounded-full h-12 w-12 flex items-center justify-center"><Hand className="h-5 w-5" /></button>
          </Tooltip>
          <Tooltip text="Tinggalkan">
            <button onClick={onLeave} className="ml-1 h-12 px-6 sm:px-7 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-400 text-white shadow-[0_0_20px_rgba(234,67,53,0.3)] active:scale-95 transition-all">
              <PhoneOff className="h-5 w-5" />
            </button>
          </Tooltip>
        </div>

        {/* Right desktop */}
        <div className="hidden md:flex items-center gap-1.5 min-w-[200px] justify-end">
          <Tooltip text="Info"><button onClick={() => toggle('info')} className={`glass-button rounded-full h-10 w-10 flex items-center justify-center ${activePanel === 'info' ? 'active' : ''}`}><Info className="h-5 w-5" /></button></Tooltip>
          <Tooltip text="Peserta">
            <button onClick={() => toggle('participants')} className={`glass-button rounded-full h-10 w-10 flex items-center justify-center relative ${activePanel === 'participants' ? 'active' : ''}`}>
              <Users className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 text-[10px] bg-[#8ab4f8] text-black rounded-full h-4 min-w-[16px] flex items-center justify-center font-bold px-1">{participants.length}</span>
            </button>
          </Tooltip>
          <Tooltip text="Chat"><button onClick={() => toggle('chat')} className={`glass-button rounded-full h-10 w-10 flex items-center justify-center ${activePanel === 'chat' ? 'active' : ''}`}><MessageSquare className="h-5 w-5" /></button></Tooltip>
          <Tooltip text="Pengaturan"><button onClick={() => toggle('settings')} className={`glass-button rounded-full h-10 w-10 flex items-center justify-center ${activePanel === 'settings' ? 'active' : ''}`}><Settings className="h-5 w-5" /></button></Tooltip>
          <Tooltip text="View">
            <button onClick={(e) => { e.stopPropagation(); setShowViewMenu(!showViewMenu); }}
              className={`glass-button rounded-full h-10 w-10 flex items-center justify-center ${showViewMenu ? 'active' : ''}`}><LayoutGrid className="h-5 w-5" /></button>
          </Tooltip>
          <Tooltip text="PiP"><button onClick={tryPip} className="glass-button rounded-full h-10 w-10 flex items-center justify-center"><PictureInPicture2 className="h-5 w-5" /></button></Tooltip>
        </div>

        {/* Right mobile */}
        <div className="flex md:hidden items-center gap-1">
          <button onClick={() => toggle('participants')} className={`p-2.5 rounded-full relative ${activePanel === 'participants' ? 'text-[#8ab4f8]' : 'text-white/60'}`}>
            <Users className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 text-[9px] bg-[#8ab4f8] text-black rounded-full h-3.5 min-w-[14px] flex items-center justify-center font-bold px-0.5">{participants.length}</span>
          </button>
          <button onClick={() => toggle('chat')} className={`p-2.5 rounded-full ${activePanel === 'chat' ? 'text-[#8ab4f8]' : 'text-white/60'}`}><MessageSquare className="h-5 w-5" /></button>
          <button onClick={() => setShowMobileMore(!showMobileMore)} className={`p-2.5 rounded-full ${showMobileMore ? 'text-[#8ab4f8]' : 'text-white/60'}`}><MoreVertical className="h-5 w-5" /></button>
        </div>
      </div>
    </>
  );
}

function MItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all ${active ? 'bg-[#8ab4f8]/15 text-[#8ab4f8]' : 'text-white/60 hover:bg-white/[0.05]'}`}>
      {icon}<span className="font-medium">{label}</span>
    </button>
  );
}
