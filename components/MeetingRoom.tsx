'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { LiveKitRoom, RoomAudioRenderer, ConnectionStateToast, useLocalParticipant } from '@livekit/components-react';
import { VideoPresets, DisconnectReason, RoomOptions, Track } from 'livekit-client';
import type { MeetingProps, PanelType } from './meeting/types';
import type { ViewMode } from './meeting/BottomBar';
import { VideoStage } from './meeting/VideoStage';
import { BottomBar } from './meeting/BottomBar';
import { ChatPanel } from './meeting/ChatPanel';
import { ParticipantsPanel } from './meeting/ParticipantsPanel';
import { InfoPanel } from './meeting/InfoPanel';
import { SettingsPanel } from './meeting/SettingsPanel';

const roomOptions: RoomOptions = {
  adaptiveStream: true, dynacast: true,
  publishDefaults: { videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360, VideoPresets.h720], videoCodec: 'vp8', simulcast: true, dtx: true, red: true },
  videoCaptureDefaults: { resolution: VideoPresets.h720.resolution, facingMode: 'user' },
  audioCaptureDefaults: { autoGainControl: true, echoCancellation: true, noiseSuppression: true },
  stopLocalTrackOnUnpublish: true,
  reconnectPolicy: { nextRetryDelayInMs: (ctx) => Math.min(1000 * Math.pow(2, ctx.retryCount), 10000) },
};

export function MeetingRoom({ roomId, token, wsUrl, name, isHost, password, onLeave }: MeetingProps) {
  const [fatalError, setFatalError] = useState<string | null>(null);

  if (!wsUrl) {
    return (
      <main className="theme-comic min-h-dvh flex items-center justify-center p-4">
        <div className="card max-w-md text-center">
          <h2 className="text-xl font-bold text-red-500">Konfigurasi Bermasalah</h2>
          <p className="mt-2 text-ink-300">NEXT_PUBLIC_LIVEKIT_URL belum diset.</p>
        </div>
      </main>
    );
  }

  if (fatalError) {
    return (
      <main className="theme-comic min-h-dvh flex items-center justify-center p-4">
        <div className="card max-w-md text-center">
          <h2 className="text-xl font-bold text-red-500">Koneksi Gagal</h2>
          <p className="mt-2 text-ink-300">{fatalError}</p>
          <button className="btn-primary mt-6 w-full" onClick={onLeave}>Kembali ke Beranda</button>
        </div>
      </main>
    );
  }

  return (
    <LiveKitRoom
      token={token} serverUrl={wsUrl} connect={true} options={roomOptions}
      video={true} audio={true} data-lk-theme="default"
      onDisconnected={(reason) => {
        if (reason === DisconnectReason.SERVER_SHUTDOWN || reason === DisconnectReason.PARTICIPANT_REMOVED || reason === DisconnectReason.ROOM_DELETED) onLeave();
      }}
      onError={(err) => setFatalError(err.message)}
      className="theme-meet h-dvh w-dvw overflow-hidden text-white flex flex-col"
      style={{ background: '#0a0a0f' }}
    >
      <MeetingShell roomId={roomId} isHost={isHost} password={password} onLeave={onLeave} />
      <RoomAudioRenderer />
      <ConnectionStateToast />
    </LiveKitRoom>
  );
}

function MeetingShell({ roomId, isHost, password, onLeave }: {
  roomId: string; isHost: boolean; password?: string; onLeave: () => void;
}) {
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('standard');
  const [hideSelf, setHideSelf] = useState(false);
  const [enhanceLight, setEnhanceLight] = useState(false);
  const [meetingStartTime] = useState(() => Date.now());
  const { localParticipant } = useLocalParticipant();
  const pipWindowRef = useRef<any>(null);

  // Escape to close panels
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setActivePanel(null); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);

  // === AUTO PiP on tab visibility change ===
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.hidden) {
        // Tab hidden → show PiP
        try {
          // Try Document PiP first (Chrome 116+) for custom controls
          if ('documentPictureInPicture' in window) {
            const pw = await (window as any).documentPictureInPicture.requestWindow({ width: 380, height: 300 });
            pipWindowRef.current = pw;

            const style = pw.document.createElement('style');
            style.textContent = `
              *{margin:0;box-sizing:border-box;font-family:system-ui,-apple-system,sans-serif}
              body{background:#0a0a0f;color:#e8eaed;overflow:hidden}
              .wrap{display:flex;flex-direction:column;height:100vh}
              .vid{flex:1;position:relative;overflow:hidden;background:#0a0a0f}
              video{width:100%;height:100%;object-fit:cover}
              .no-vid{display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.2);font-size:14px}
              .nav{display:flex;gap:6px;padding:10px 14px;justify-content:center;align-items:center;
                   background:rgba(10,10,15,0.9);backdrop-filter:blur(12px);
                   position:absolute;bottom:0;left:0;right:0;
                   opacity:0;transition:opacity 0.2s}
              .wrap:hover .nav{opacity:1}
              .btn{width:40px;height:40px;border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;
                   font-size:16px;transition:all 0.15s}
              .btn-default{background:rgba(255,255,255,0.1);color:#e8eaed}
              .btn-default:hover{background:rgba(255,255,255,0.18)}
              .btn-danger{background:rgba(234,67,53,0.85);color:#fff}
              .btn-danger:hover{background:rgba(234,67,53,1)}
              .btn-active{background:rgba(234,67,53,0.85);color:#fff}
              .id{text-align:center;font-size:11px;color:rgba(255,255,255,0.3);padding:6px;letter-spacing:0.05em}
            `;
            pw.document.head.appendChild(style);

            const wrap = pw.document.createElement('div');
            wrap.className = 'wrap';

            // Room ID bar
            const idBar = pw.document.createElement('div');
            idBar.className = 'id';
            idBar.textContent = `Meeting: ${roomId}`;
            wrap.appendChild(idBar);

            // Video area
            const vidDiv = pw.document.createElement('div');
            vidDiv.className = 'vid';
            const camTrack = localParticipant.getTrackPublication(Track.Source.Camera)?.track;
            if (camTrack?.mediaStreamTrack) {
              const v = pw.document.createElement('video');
              v.srcObject = new MediaStream([camTrack.mediaStreamTrack]);
              v.autoplay = true; v.muted = true; v.playsInline = true;
              vidDiv.appendChild(v);
            } else {
              const noVid = pw.document.createElement('div');
              noVid.className = 'no-vid';
              noVid.textContent = '📷 Kamera mati';
              vidDiv.appendChild(noVid);
            }

            // Hover controls
            const nav = pw.document.createElement('div');
            nav.className = 'nav';

            // Mic toggle
            let micOff = localParticipant.getTrackPublication(Track.Source.Microphone)?.isMuted ?? true;
            const micBtn = pw.document.createElement('button');
            micBtn.className = `btn ${micOff ? 'btn-active' : 'btn-default'}`;
            micBtn.textContent = micOff ? '🔇' : '🎤';
            micBtn.onclick = () => {
              micOff = !micOff;
              localParticipant.setMicrophoneEnabled(!micOff);
              micBtn.textContent = micOff ? '🔇' : '🎤';
              micBtn.className = `btn ${micOff ? 'btn-active' : 'btn-default'}`;
            };

            // Cam toggle
            let camOff = !camTrack;
            const camBtn = pw.document.createElement('button');
            camBtn.className = `btn ${camOff ? 'btn-active' : 'btn-default'}`;
            camBtn.textContent = camOff ? '📷' : '🎥';
            camBtn.onclick = () => {
              camOff = !camOff;
              localParticipant.setCameraEnabled(!camOff);
              camBtn.textContent = camOff ? '📷' : '🎥';
              camBtn.className = `btn ${camOff ? 'btn-active' : 'btn-default'}`;
            };

            // Leave
            const leaveBtn = pw.document.createElement('button');
            leaveBtn.className = 'btn btn-danger';
            leaveBtn.textContent = '📞';
            leaveBtn.onclick = () => { pw.close(); pipWindowRef.current = null; onLeave(); };

            nav.appendChild(micBtn);
            nav.appendChild(camBtn);
            nav.appendChild(leaveBtn);
            vidDiv.appendChild(nav);
            wrap.appendChild(vidDiv);
            pw.document.body.appendChild(wrap);

            // Handle PiP window close
            pw.addEventListener('pagehide', () => { pipWindowRef.current = null; });
            return;
          }

          // Fallback: standard video PiP
          const vid = document.querySelector('.lk-participant-tile video') as HTMLVideoElement | null;
          if (vid?.requestPictureInPicture) {
            await vid.requestPictureInPicture();
          }
        } catch (e) { console.log('Auto-PiP:', e); }
      } else {
        // Tab visible → close PiP
        try {
          if (pipWindowRef.current) { pipWindowRef.current.close(); pipWindowRef.current = null; }
          if (document.pictureInPictureElement) await document.exitPictureInPicture();
        } catch {}
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (pipWindowRef.current) { pipWindowRef.current.close(); pipWindowRef.current = null; }
    };
  }, [localParticipant, roomId, onLeave]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden relative">
      <div className="relative flex flex-1 overflow-hidden pb-[80px]">
        <div className="relative flex-1 overflow-hidden">
          <VideoStage viewMode={viewMode} hideSelf={hideSelf} enhanceLight={enhanceLight} />
        </div>

        {/* Panels - Chat always mounted for history, others conditional */}
        {/* Chat - always rendered, hidden when not active */}
        <div style={{ display: activePanel === 'chat' ? undefined : 'none' }}
             className="fixed inset-0 z-50 md:relative md:inset-auto md:z-auto md:my-2 md:mr-2 md:shrink-0">
          <ChatPanel onClose={() => setActivePanel(null)} />
        </div>

        {/* Other panels - conditional */}
        {activePanel && activePanel !== 'chat' && (
          <>
            <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setActivePanel(null)} />
            <div className="fixed inset-0 z-50 md:relative md:inset-auto md:z-auto md:my-2 md:mr-2 md:shrink-0">
              {activePanel === 'participants' && <ParticipantsPanel isHost={isHost} roomId={roomId} onClose={() => setActivePanel(null)} />}
              {activePanel === 'info' && <InfoPanel roomId={roomId} isHost={isHost} password={password} startTime={meetingStartTime} onClose={() => setActivePanel(null)} />}
              {activePanel === 'settings' && <SettingsPanel onClose={() => setActivePanel(null)} enhanceLight={enhanceLight} onToggleEnhanceLight={() => setEnhanceLight(v => !v)} />}
            </div>
          </>
        )}

        {/* Mobile backdrop for chat */}
        {activePanel === 'chat' && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setActivePanel(null)} />
        )}
      </div>

      <BottomBar roomId={roomId} activePanel={activePanel} onPanelChange={setActivePanel}
        onLeave={onLeave} viewMode={viewMode} onViewModeChange={setViewMode}
        hideSelf={hideSelf} onToggleHideSelf={() => setHideSelf(v => !v)} />
    </div>
  );
}
