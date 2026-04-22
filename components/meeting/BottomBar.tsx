'use client';

import { useState, useEffect, useCallback } from 'react';
import { ControlBar, useParticipants } from '@livekit/components-react';
import {
  PhoneOff, Info, Users, MessageSquare, Settings, Hand, Smile,
  Copy, PictureInPicture2, MoreVertical,
} from 'lucide-react';
import { Tooltip } from './Tooltip';
import type { PanelType } from './types';

const REACTIONS = ['👍', '👏', '😂', '❤️', '🎉', '🤔', '👋'];

export function BottomBar({
  roomId,
  activePanel,
  onPanelChange,
  onLeave,
}: {
  roomId: string;
  activePanel: PanelType;
  onPanelChange: (p: PanelType) => void;
  onLeave: () => void;
}) {
  const [time, setTime] = useState('');
  const [copied, setCopied] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<{ id: number; emoji: string }[]>([]);
  const participants = useParticipants();

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, []);

  const copyRoomId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [roomId]);

  const togglePanel = (p: PanelType) => onPanelChange(activePanel === p ? null : p);

  const sendReaction = (emoji: string) => {
    const id = Date.now();
    setFloatingReactions((prev) => [...prev, { id, emoji }]);
    setTimeout(() => setFloatingReactions((prev) => prev.filter((r) => r.id !== id)), 3000);
    setShowReactions(false);
  };

  const tryDocPip = async () => {
    try {
      if ('documentPictureInPicture' in window) {
        const pipWin = await (window as any).documentPictureInPicture.requestWindow({ width: 320, height: 240 });
        pipWin.document.title = 'PortalSI Meet';
        const container = pipWin.document.createElement('div');
        container.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100vh;background:#1a1a2e;color:white;font-family:system-ui;flex-direction:column;gap:12px;';
        container.innerHTML = `<p style="font-size:14px;opacity:0.7">Meeting sedang berlangsung</p><p style="font-size:18px;font-weight:bold">${roomId}</p>`;
        const btn = pipWin.document.createElement('button');
        btn.textContent = '🔴 Akhiri';
        btn.style.cssText = 'padding:8px 24px;background:#ea4335;color:white;border:none;border-radius:24px;cursor:pointer;font-size:14px;';
        btn.onclick = () => { pipWin.close(); onLeave(); };
        container.appendChild(btn);
        pipWin.document.body.style.margin = '0';
        pipWin.document.body.appendChild(container);
      }
    } catch (e) {
      console.log('Document PiP not supported');
    }
  };

  return (
    <>
      {/* Floating reactions */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        {floatingReactions.map((r) => (
          <span key={r.id} className="reaction-float absolute text-4xl">{r.emoji}</span>
        ))}
      </div>

      {/* Reaction picker */}
      {showReactions && (
        <div className="absolute bottom-[88px] left-1/2 -translate-x-1/2 z-50 glass-panel rounded-2xl px-3 py-2 flex gap-1 animate-scale-in">
          {REACTIONS.map((e) => (
            <button key={e} onClick={() => sendReaction(e)}
              className="text-2xl hover:scale-125 active:scale-95 transition-transform p-1.5 rounded-lg hover:bg-white/10">{e}</button>
          ))}
        </div>
      )}

      {/* Mobile more menu */}
      {showMobileMore && (
        <div className="md:hidden absolute bottom-[88px] right-2 z-50 glass-panel rounded-2xl p-2 flex flex-col gap-1 animate-scale-in min-w-[180px]">
          <MobileMenuItem icon={<Info className="h-4 w-4" />} label="Info" active={activePanel === 'info'} onClick={() => { togglePanel('info'); setShowMobileMore(false); }} />
          <MobileMenuItem icon={<Settings className="h-4 w-4" />} label="Pengaturan" active={activePanel === 'settings'} onClick={() => { togglePanel('settings'); setShowMobileMore(false); }} />
          <MobileMenuItem icon={<PictureInPicture2 className="h-4 w-4" />} label="PiP Mode" onClick={() => { tryDocPip(); setShowMobileMore(false); }} />
        </div>
      )}

      {/* === MAIN BAR === */}
      <div className="absolute bottom-0 left-0 right-0 h-[80px] flex items-center justify-between px-3 sm:px-5 z-30"
           style={{ background: 'linear-gradient(to top, rgba(10,10,20,0.95) 0%, rgba(10,10,20,0.7) 70%, transparent 100%)' }}>

        {/* Left: Time & Room ID (desktop) */}
        <div className="hidden md:flex items-center gap-3 text-sm min-w-[200px]">
          <span className="font-medium text-white/70 tabular-nums">{time}</span>
          <span className="text-white/20">|</span>
          <button onClick={copyRoomId}
            className="flex items-center gap-1.5 font-mono font-semibold text-white/60 hover:text-meet-accent transition-colors group">
            <span className="tracking-wider">{roomId}</span>
            <Copy className={`h-3.5 w-3.5 transition-all ${copied ? 'text-green-400' : 'opacity-0 group-hover:opacity-100'}`} />
          </button>
          {copied && <span className="text-xs text-green-400 animate-fade-in">Tersalin!</span>}
        </div>

        {/* Center: Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ControlBar
            controls={{ microphone: true, camera: true, screenShare: true, chat: false, leave: false }}
            variation="minimal"
            className="!bg-transparent !p-0 !gap-1.5"
          />

          {/* Reactions */}
          <Tooltip text="Reaksi">
            <button onClick={() => setShowReactions(!showReactions)}
              className={`glass-button rounded-full h-12 w-12 flex items-center justify-center ${showReactions ? 'active' : ''}`}>
              <Smile className="h-5 w-5" />
            </button>
          </Tooltip>

          {/* Raise hand */}
          <Tooltip text="Angkat Tangan">
            <button className="glass-button rounded-full h-12 w-12 flex items-center justify-center">
              <Hand className="h-5 w-5" />
            </button>
          </Tooltip>

          {/* Leave */}
          <Tooltip text="Tinggalkan">
            <button onClick={onLeave}
              className="ml-1 h-12 px-6 sm:px-7 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-400 text-white shadow-glow-danger active:scale-95 transition-all">
              <PhoneOff className="h-5 w-5" />
            </button>
          </Tooltip>
        </div>

        {/* Right: Panels (desktop) */}
        <div className="hidden md:flex items-center gap-1.5 min-w-[200px] justify-end">
          <Tooltip text="Info Meeting">
            <button onClick={() => togglePanel('info')}
              className={`glass-button rounded-full h-10 w-10 flex items-center justify-center ${activePanel === 'info' ? 'active' : ''}`}>
              <Info className="h-5 w-5" />
            </button>
          </Tooltip>
          <Tooltip text="Peserta">
            <button onClick={() => togglePanel('participants')}
              className={`glass-button rounded-full h-10 w-10 flex items-center justify-center relative ${activePanel === 'participants' ? 'active' : ''}`}>
              <Users className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 text-[10px] bg-meet-accent text-[#1a1a2e] rounded-full h-4 min-w-[16px] flex items-center justify-center font-bold px-1">
                {participants.length}
              </span>
            </button>
          </Tooltip>
          <Tooltip text="Chat">
            <button onClick={() => togglePanel('chat')}
              className={`glass-button rounded-full h-10 w-10 flex items-center justify-center ${activePanel === 'chat' ? 'active' : ''}`}>
              <MessageSquare className="h-5 w-5" />
            </button>
          </Tooltip>
          <Tooltip text="Pengaturan">
            <button onClick={() => togglePanel('settings')}
              className={`glass-button rounded-full h-10 w-10 flex items-center justify-center ${activePanel === 'settings' ? 'active' : ''}`}>
              <Settings className="h-5 w-5" />
            </button>
          </Tooltip>
          <Tooltip text="PiP Mode">
            <button onClick={tryDocPip}
              className="glass-button rounded-full h-10 w-10 flex items-center justify-center">
              <PictureInPicture2 className="h-5 w-5" />
            </button>
          </Tooltip>
        </div>

        {/* Right: Mobile compact */}
        <div className="flex md:hidden items-center gap-1">
          <button onClick={() => togglePanel('participants')}
            className={`p-2.5 rounded-full relative ${activePanel === 'participants' ? 'text-meet-accent' : 'text-white/70'}`}>
            <Users className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 text-[9px] bg-meet-accent text-[#1a1a2e] rounded-full h-3.5 min-w-[14px] flex items-center justify-center font-bold px-0.5">
              {participants.length}
            </span>
          </button>
          <button onClick={() => togglePanel('chat')}
            className={`p-2.5 rounded-full ${activePanel === 'chat' ? 'text-meet-accent' : 'text-white/70'}`}>
            <MessageSquare className="h-5 w-5" />
          </button>
          <button onClick={() => setShowMobileMore(!showMobileMore)}
            className={`p-2.5 rounded-full ${showMobileMore ? 'text-meet-accent' : 'text-white/70'}`}>
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>
    </>
  );
}

function MobileMenuItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all ${active ? 'bg-meet-accent/20 text-meet-accent' : 'text-white/70 hover:bg-white/[0.06]'}`}>
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}
