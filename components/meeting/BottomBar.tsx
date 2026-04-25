'use client';

import { useState } from 'react';
import { useParticipants, useLocalParticipant } from '@livekit/components-react';
import { Track } from 'livekit-client';
import {
  PhoneOff, Info, Users, MessageSquare, Settings, Hand, Smile,
  Copy, MoreVertical, LayoutGrid, ScreenShare, ScreenShareOff,
  Mic, MicOff, Video, VideoOff, RefreshCcw, ZoomIn, Disc, PenTool, Timer
} from 'lucide-react';
import { Tooltip } from './Tooltip';
import type { PanelType } from './types';
import type { RoomPerms } from '../MeetingRoom';

export type ViewMode = 'standard' | 'speaker' | 'gallery';
const REACTIONS = ['👍', '👏', '😂', '❤️', '🎉', '🤔', '👋'];

export function BottomBar({
  roomId, activePanel, onPanelChange, onLeave,
  onReaction, handRaised, onToggleHand,
  unreadCount, permissions, isHost,
  isRecording, onRecordToggle,
  captionsOn, onToggleCaptions,
  onTimerClick, timerActive
}: {
  roomId: string; activePanel: PanelType; onPanelChange: (p: PanelType) => void; onLeave: () => void;
  onReaction: (emoji: string) => void; handRaised: boolean; onToggleHand: () => void;
  unreadCount: number; permissions: RoomPerms; isHost: boolean;
  isRecording?: boolean; onRecordToggle?: () => void;
  captionsOn?: boolean; onToggleCaptions?: () => void;
  onTimerClick?: () => void; timerActive?: boolean;
}) {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [copied, setCopied] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);

  useState(() => { setInterval(() => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })), 1000); });

  const copyId = async () => { try { await navigator.clipboard.writeText(roomId); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} };
  const toggle = (p: PanelType) => onPanelChange(activePanel === p ? null : p);
  const closePopups = () => { setShowReactions(false); setShowMobileMore(false); };

  const canShare = isHost || permissions.allowScreenShare;
  const canReact = isHost || permissions.allowReactions;

  const toggleMic = async () => {
    try { await localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled); setMicOn(!localParticipant.isMicrophoneEnabled); } catch {}
  };
  const toggleCam = async () => {
    try { await localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled); setCamOn(!localParticipant.isCameraEnabled); } catch {}
  };
  const toggleShare = async () => {
    try {
      if (sharing) { await localParticipant.setScreenShareEnabled(false); setSharing(false); }
      else { await localParticipant.setScreenShareEnabled(true, { audio: true }); setSharing(true); }
    } catch { setSharing(false); }
  };

  // Sync state from participant
  const isMicOn = localParticipant.isMicrophoneEnabled;
  const isCamOn = localParticipant.isCameraEnabled;

  const flipCamera = async () => {
    const track = localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack;
    if (!track) return;
    try {
      // Toggle facingMode (user/environment) if we can access the track options
      // This is a generic approach; modern browsers support facingMode in applyConstraints
      const currentSettings = track.mediaStreamTrack.getSettings();
      const newMode = currentSettings.facingMode === 'user' ? 'environment' : 'user';
      await track.restartTrack({ facingMode: newMode });
    } catch (e) {
      console.error('Failed to flip camera', e);
    }
  };

  const zoomCamera = async () => {
    const track = localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack;
    if (!track) return;
    try {
      const caps = track.mediaStreamTrack.getCapabilities() as any;
      const settings = track.mediaStreamTrack.getSettings() as any;
      if (caps.zoom) {
        // Toggle zoom between 1 and 2
        const currentZoom = settings.zoom || 1;
        const newZoom = currentZoom > 1.5 ? 1 : 2;
        await track.mediaStreamTrack.applyConstraints({ advanced: [{ zoom: newZoom }] } as any);
      } else {
        alert("Zoom tidak didukung oleh perangkat ini.");
      }
    } catch (e) {
      console.error('Failed to zoom camera', e);
    }
  };

  return (
    <>
      {/* Reaction picker */}
      {showReactions && (
        <div className="fixed bottom-[88px] left-0 right-0 z-50 flex justify-center pointer-events-none">
          <div className="glass-panel rounded-2xl px-3 py-2 flex gap-1 animate-scale-in pointer-events-auto"
               onClick={e => e.stopPropagation()}>
            {REACTIONS.map(e => (
              <button key={e} onClick={() => { onReaction(e); setShowReactions(false); }}
                className="text-2xl hover:scale-125 active:scale-95 transition-transform p-1.5 rounded-lg hover:bg-white/10">{e}</button>
            ))}
          </div>
        </div>
      )}

      {/* Mobile more menu */}
      {showMobileMore && (
        <div className="md:hidden fixed bottom-[88px] right-2 z-50 glass-panel rounded-2xl py-2 min-w-[200px] animate-scale-in"
             onClick={e => e.stopPropagation()}>
          <p className="px-4 py-1.5 text-[11px] font-semibold text-white/30 uppercase tracking-wider">Menu</p>
          <MItem icon={<Users className="h-4 w-4" />} label={`Peserta (${participants.length})`} active={activePanel === 'participants'}
            onClick={() => { toggle('participants'); setShowMobileMore(false); }} />
          <MItem icon={<MessageSquare className="h-4 w-4" />} label="Chat" active={activePanel === 'chat'} badge={unreadCount}
            onClick={() => { toggle('chat'); setShowMobileMore(false); }} />
          {canReact && <MItem icon={<Smile className="h-4 w-4" />} label="Reaksi"
            onClick={() => { setShowReactions(v => !v); setShowMobileMore(false); }} />}
          <MItem icon={<Hand className="h-4 w-4" />} label={handRaised ? 'Turunkan Tangan' : 'Angkat Tangan'} active={handRaised}
            onClick={() => { onToggleHand(); setShowMobileMore(false); }} />
          <hr className="border-white/[0.06] my-1 mx-3" />
          <MItem icon={<Info className="h-4 w-4" />} label="Info Meeting" active={activePanel === 'info'}
            onClick={() => { toggle('info'); setShowMobileMore(false); }} />
          <MItem icon={<Settings className="h-4 w-4" />} label="Pengaturan" active={activePanel === 'settings'}
            onClick={() => { toggle('settings'); setShowMobileMore(false); }} />
          <MItem icon={<LayoutGrid className="h-4 w-4" />} label="Tampilan" active={activePanel === 'view'}
            onClick={() => { toggle('view'); setShowMobileMore(false); }} />
          {(permissions.allowWhiteboard || isHost) && <MItem icon={<PenTool className="h-4 w-4" />} label="Whiteboard" active={activePanel === 'whiteboard'}
            onClick={() => { toggle('whiteboard'); setShowMobileMore(false); }} />}
          <hr className="border-white/[0.06] my-1 mx-3" />
          <MItem icon={<RefreshCcw className="h-4 w-4" />} label="Putar Kamera" onClick={() => { flipCamera(); setShowMobileMore(false); }} />
          <MItem icon={<ZoomIn className="h-4 w-4" />} label="Zoom Kamera" onClick={() => { zoomCamera(); setShowMobileMore(false); }} />
          {onRecordToggle && (
             <MItem icon={<Disc className={`h-4 w-4 ${isRecording ? 'text-red-500 animate-pulse' : ''}`} />} 
               label={isRecording ? "Hentikan Rekaman" : "Mulai Rekaman"} 
               onClick={() => { onRecordToggle(); setShowMobileMore(false); }} />
          )}
          {isHost && (
            <button onClick={() => { setShowMobileMore(false); onTimerClick?.(); }} className="flex items-center gap-3 w-full p-4 hover:bg-white/5 active:bg-white/10 transition-colors">
              <div className={`p-2 rounded-xl ${timerActive ? 'bg-[#8ab4f8]/20 text-[#8ab4f8]' : 'bg-white/5 text-white/70'}`}><Timer className="w-5 h-5" /></div>
              <span className={`font-medium ${timerActive ? 'text-[#8ab4f8]' : 'text-white/90'}`}>{timerActive ? 'Timer Aktif' : 'Mulai Timer'}</span>
            </button>
          )}
        </div>
      )}

      {/* MAIN BAR */}
      <div className="absolute bottom-0 left-0 right-0 h-[80px] flex items-center justify-between px-3 sm:px-5 z-30"
           style={{ background: 'linear-gradient(to top, rgba(5,5,8,0.97) 0%, rgba(5,5,8,0.7) 70%, transparent 100%)' }}
           onClick={closePopups}>

        {/* LEFT desktop */}
        <div className="hidden md:flex items-center gap-3 text-sm min-w-[200px]" onClick={e => e.stopPropagation()}>
          <span className="font-medium text-white/50 tabular-nums">{time}</span>
          <span className="text-white/15">|</span>
          <button onClick={copyId} className="flex items-center gap-1.5 font-mono font-semibold text-white/50 hover:text-[#8ab4f8] transition-colors group">
            <span className="tracking-wider">{roomId}</span>
            <Copy className={`h-3.5 w-3.5 transition-all ${copied ? 'text-green-400' : 'opacity-0 group-hover:opacity-100'}`} />
          </button>
          {copied && <span className="text-xs text-green-400">Tersalin!</span>}
        </div>

        {/* CENTER — custom mic/cam/share buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2" onClick={e => e.stopPropagation()}>
          {/* Mic */}
          <Tooltip text={isMicOn ? 'Matikan Mic' : 'Nyalakan Mic'}>
            <button onClick={toggleMic}
              className={`glass-button rounded-full h-12 w-12 flex items-center justify-center ${!isMicOn ? '!bg-red-500/20 !border-red-500/30 !text-red-400' : ''}`}>
              {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>
          </Tooltip>

          {/* Cam */}
          <Tooltip text={isCamOn ? 'Matikan Kamera' : 'Nyalakan Kamera'}>
            <button onClick={toggleCam}
              className={`glass-button rounded-full h-12 w-12 flex items-center justify-center ${!isCamOn ? '!bg-red-500/20 !border-red-500/30 !text-red-400' : ''}`}>
              {isCamOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>
          </Tooltip>

          {/* Screen share — desktop */}
          <div className="hidden md:block">
            <Tooltip text={canShare ? (sharing ? 'Stop Share' : 'Share Layar') : 'Screen share dinonaktifkan'}>
              <button onClick={canShare ? toggleShare : undefined} disabled={!canShare}
                className={`glass-button rounded-full h-12 w-12 flex items-center justify-center ${!canShare ? 'opacity-30 cursor-not-allowed' : sharing ? '!bg-green-500/20 !border-green-500/30 !text-green-400' : ''}`}>
                {sharing ? <ScreenShareOff className="h-5 w-5" /> : <ScreenShare className="h-5 w-5" />}
              </button>
            </Tooltip>
          </div>

          {/* Reactions desktop */}
          <div className="hidden md:block">
            <Tooltip text={canReact ? 'Reaksi' : 'Reaksi dinonaktifkan'}>
              <button onClick={canReact ? () => setShowReactions(v => !v) : undefined} disabled={!canReact}
                className={`glass-button rounded-full h-12 w-12 flex items-center justify-center ${!canReact ? 'opacity-30 cursor-not-allowed' : showReactions ? 'active' : ''}`}>
                <Smile className="h-5 w-5" />
              </button>
            </Tooltip>
          </div>

          {/* CC desktop */}


          {/* Hand desktop */}
          <div className="hidden md:block">
            <Tooltip text={handRaised ? 'Turunkan Tangan' : 'Angkat Tangan'}>
              <button onClick={onToggleHand}
                className={`glass-button rounded-full h-12 w-12 flex items-center justify-center ${handRaised ? 'active !bg-yellow-500/20 !border-yellow-500/30 !text-yellow-400' : ''}`}>
                <Hand className="h-5 w-5" />
              </button>
            </Tooltip>
          </div>

          {/* Record desktop */}
          {onRecordToggle && (
            <div className="hidden md:block">
              <Tooltip text={isRecording ? 'Hentikan Rekaman' : 'Mulai Rekaman'}>
                <button onClick={onRecordToggle}
                  className={`glass-button rounded-full h-12 w-12 flex items-center justify-center ${isRecording ? '!bg-red-500/20 !border-red-500/30 !text-red-400 animate-pulse' : ''}`}>
                  <Disc className="h-5 w-5" />
                </button>
              </Tooltip>
            </div>
          )}

          {/* Leave */}
          <Tooltip text="Tinggalkan">
            <button onClick={onLeave} className="ml-1 h-12 px-5 sm:px-7 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-400 text-white shadow-[0_0_20px_rgba(234,67,53,0.3)] active:scale-95 transition-all">
              <PhoneOff className="h-5 w-5" />
            </button>
          </Tooltip>
        </div>

        {/* RIGHT desktop */}
        <div className="hidden md:flex items-center gap-1.5 min-w-[200px] justify-end" onClick={e => e.stopPropagation()}>
          {(isHost && onTimerClick) && (
             <Tooltip text={timerActive ? "Timer Aktif" : "Set Timer"}><button onClick={onTimerClick} className={`glass-button rounded-full h-10 w-10 flex items-center justify-center ${timerActive ? 'active' : ''}`}><Timer className="h-5 w-5" /></button></Tooltip>
          )}
          <Tooltip text="Info"><button onClick={() => toggle('info')} className={`glass-button rounded-full h-10 w-10 flex items-center justify-center ${activePanel === 'info' ? 'active' : ''}`}><Info className="h-5 w-5" /></button></Tooltip>
          <Tooltip text="Peserta">
            <button onClick={() => toggle('participants')} className={`glass-button rounded-full h-10 w-10 flex items-center justify-center relative ${activePanel === 'participants' ? 'active' : ''}`}>
              <Users className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 text-[10px] bg-[#8ab4f8] text-black rounded-full h-4 min-w-[16px] flex items-center justify-center font-bold px-1">{participants.length}</span>
            </button>
          </Tooltip>
          <Tooltip text="Chat">
            <button onClick={() => toggle('chat')} className={`glass-button rounded-full h-10 w-10 flex items-center justify-center relative ${activePanel === 'chat' ? 'active' : ''}`}>
              <MessageSquare className="h-5 w-5" />
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 text-[10px] bg-red-500 text-white rounded-full h-4 min-w-[16px] flex items-center justify-center font-bold px-1 animate-pulse">{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </button>
          </Tooltip>
          {(permissions.allowWhiteboard || isHost) && (
             <Tooltip text="Whiteboard"><button onClick={() => toggle('whiteboard')} className={`glass-button rounded-full h-10 w-10 flex items-center justify-center ${activePanel === 'whiteboard' ? 'active' : ''}`}><PenTool className="h-5 w-5" /></button></Tooltip>
          )}
          <Tooltip text="Pengaturan"><button onClick={() => toggle('settings')} className={`glass-button rounded-full h-10 w-10 flex items-center justify-center ${activePanel === 'settings' ? 'active' : ''}`}><Settings className="h-5 w-5" /></button></Tooltip>
          <Tooltip text="Tampilan"><button onClick={() => toggle('view')} className={`glass-button rounded-full h-10 w-10 flex items-center justify-center ${activePanel === 'view' ? 'active' : ''}`}><LayoutGrid className="h-5 w-5" /></button></Tooltip>
        </div>

        {/* RIGHT mobile */}
        <div className="flex md:hidden items-center" onClick={e => e.stopPropagation()}>
          {unreadCount > 0 && activePanel !== 'chat' && (
            <button onClick={() => toggle('chat')} className="relative p-2.5 rounded-full text-white/60">
              <MessageSquare className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 text-[9px] bg-red-500 text-white rounded-full h-3.5 min-w-[14px] flex items-center justify-center font-bold px-0.5 animate-pulse">{unreadCount > 99 ? '99+' : unreadCount}</span>
            </button>
          )}
          <button onClick={() => setShowMobileMore(v => !v)}
            className={`p-2.5 rounded-full transition-colors ${showMobileMore ? 'text-[#8ab4f8] bg-[#8ab4f8]/10' : 'text-white/60'}`}>
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>
    </>
  );
}

function MItem({ icon, label, active, onClick, badge }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void; badge?: number }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm transition-all ${active ? 'bg-[#8ab4f8]/15 text-[#8ab4f8]' : 'text-white/60 hover:bg-white/[0.05]'}`}>
      {icon}<span className="font-medium flex-1 text-left">{label}</span>
      {badge && badge > 0 ? <span className="text-[10px] bg-red-500 text-white rounded-full h-4 min-w-[16px] flex items-center justify-center font-bold px-1">{badge}</span> : null}
    </button>
  );
}
