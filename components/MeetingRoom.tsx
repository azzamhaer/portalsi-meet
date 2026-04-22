'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { LiveKitRoom, RoomAudioRenderer, ConnectionStateToast, useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { VideoPresets, DisconnectReason, RoomOptions, Track, RoomEvent } from 'livekit-client';
import type { MeetingProps, PanelType } from './meeting/types';
import type { ViewMode } from './meeting/BottomBar';
import { VideoStage } from './meeting/VideoStage';
import { BottomBar } from './meeting/BottomBar';
import { ChatPanel } from './meeting/ChatPanel';
import { ParticipantsPanel } from './meeting/ParticipantsPanel';
import { InfoPanel } from './meeting/InfoPanel';
import { SettingsPanel } from './meeting/SettingsPanel';

export interface ChatMsg {
  id: string; text: string; senderName: string; senderIdentity: string; ts: number;
  edited?: boolean; editedAt?: number; deleted?: boolean; deletedAt?: number;
}

export interface FloatingNotif {
  id: number; emoji?: string; text: string; name: string;
}

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
  if (!wsUrl) return <ErrorScreen title="Konfigurasi Bermasalah" msg="NEXT_PUBLIC_LIVEKIT_URL belum diset." onLeave={onLeave} />;
  if (fatalError) return <ErrorScreen title="Koneksi Gagal" msg={fatalError} onLeave={onLeave} />;

  return (
    <LiveKitRoom token={token} serverUrl={wsUrl} connect={true} options={roomOptions}
      video={true} audio={true} data-lk-theme="default"
      onDisconnected={(r) => { if (r === DisconnectReason.SERVER_SHUTDOWN || r === DisconnectReason.PARTICIPANT_REMOVED || r === DisconnectReason.ROOM_DELETED) onLeave(); }}
      onError={(err) => setFatalError(err.message)}
      className="theme-meet h-dvh w-dvw overflow-hidden text-white flex flex-col" style={{ background: '#0a0a0f' }}>
      <MeetingShell roomId={roomId} isHost={isHost} password={password} onLeave={onLeave} />
      <RoomAudioRenderer /><ConnectionStateToast />
    </LiveKitRoom>
  );
}

function ErrorScreen({ title, msg, onLeave }: { title: string; msg: string; onLeave: () => void }) {
  return (
    <main className="theme-comic min-h-dvh flex items-center justify-center p-4">
      <div className="card max-w-md text-center">
        <h2 className="text-xl font-bold text-red-500">{title}</h2>
        <p className="mt-2 text-ink-300">{msg}</p>
        <button className="btn-primary mt-6 w-full" onClick={onLeave}>Kembali ke Beranda</button>
      </div>
    </main>
  );
}

function MeetingShell({ roomId, isHost, password, onLeave }: {
  roomId: string; isHost: boolean; password?: string; onLeave: () => void;
}) {
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('standard');
  const [hideSelf, setHideSelf] = useState(false);
  const [enhanceLight, setEnhanceLight] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [meetingStartTime] = useState(() => Date.now());
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [raisedHands, setRaisedHands] = useState<Map<string, string>>(new Map()); // identity -> name
  const [floats, setFloats] = useState<FloatingNotif[]>([]);
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const pipWindowRef = useRef<any>(null);
  const chatRef = useRef<ChatMsg[]>([]);
  const enc = useRef(new TextEncoder());
  const dec = useRef(new TextDecoder());

  useEffect(() => { chatRef.current = chatMsgs; }, [chatMsgs]);

  // === Unified data handler ===
  useEffect(() => {
    const onData = (payload: Uint8Array, participant: any) => {
      try {
        const d = JSON.parse(dec.current.decode(payload));
        switch (d.type) {
          case 'chat':
            if (d.action === 'send') {
              setChatMsgs(p => {
                if (p.some(m => m.id === d.id)) return p;
                return [...p, { id: d.id, text: d.text, senderName: d.senderName, senderIdentity: d.senderIdentity, ts: d.ts }];
              });
            } else if (d.action === 'edit') {
              setChatMsgs(p => p.map(m => m.id === d.id ? { ...m, text: d.text, edited: true, editedAt: d.ts } : m));
            } else if (d.action === 'delete') {
              setChatMsgs(p => p.map(m => m.id === d.id ? { ...m, deleted: true, deletedAt: d.ts } : m));
            }
            break;
          case 'chat_history':
            setChatMsgs(prev => {
              const ids = new Set(prev.map(m => m.id));
              const fresh = (d.messages as ChatMsg[]).filter(m => !ids.has(m.id));
              return [...prev, ...fresh].sort((a, b) => a.ts - b.ts);
            });
            break;
          case 'reaction':
            addFloat(d.emoji, d.name);
            break;
          case 'hand':
            setRaisedHands(prev => {
              const next = new Map(prev);
              if (d.raised) { next.set(d.identity, d.name); addFloat('✋', d.name); }
              else next.delete(d.identity);
              return next;
            });
            break;
        }
      } catch {}
    };

    const onJoin = (p: any) => {
      // Send chat history to new joiner
      setTimeout(() => {
        if (chatRef.current.length > 0) {
          const payload = enc.current.encode(JSON.stringify({ type: 'chat_history', messages: chatRef.current }));
          room.localParticipant.publishData(payload, { reliable: true, destinationIdentities: [p.identity] });
        }
      }, 1000);
    };

    room.on(RoomEvent.DataReceived, onData);
    room.on(RoomEvent.ParticipantConnected, onJoin);
    return () => { room.off(RoomEvent.DataReceived, onData); room.off(RoomEvent.ParticipantConnected, onJoin); };
  }, [room]);

  const addFloat = (emoji: string, name: string) => {
    const id = Date.now() + Math.random();
    setFloats(p => [...p, { id, emoji, text: emoji, name }]);
    setTimeout(() => setFloats(p => p.filter(f => f.id !== id)), 3500);
  };

  // === Chat send/edit/delete ===
  const sendChat = useCallback((text: string) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const msg: ChatMsg = { id, text, senderName: localParticipant.name || 'Anonim', senderIdentity: localParticipant.identity, ts: Date.now() };
    setChatMsgs(p => [...p, msg]);
    room.localParticipant.publishData(enc.current.encode(JSON.stringify({ type: 'chat', action: 'send', ...msg })), { reliable: true });
  }, [room, localParticipant]);

  const editChat = useCallback((id: string, text: string) => {
    const ts = Date.now();
    setChatMsgs(p => p.map(m => m.id === id ? { ...m, text, edited: true, editedAt: ts } : m));
    room.localParticipant.publishData(enc.current.encode(JSON.stringify({ type: 'chat', action: 'edit', id, text, ts })), { reliable: true });
  }, [room]);

  const deleteChat = useCallback((id: string) => {
    const ts = Date.now();
    setChatMsgs(p => p.map(m => m.id === id ? { ...m, deleted: true, deletedAt: ts } : m));
    room.localParticipant.publishData(enc.current.encode(JSON.stringify({ type: 'chat', action: 'delete', id, ts })), { reliable: true });
  }, [room]);

  // === Reaction ===
  const sendReaction = useCallback((emoji: string) => {
    const name = localParticipant.name || 'Anonim';
    addFloat(emoji, name);
    room.localParticipant.publishData(enc.current.encode(JSON.stringify({ type: 'reaction', emoji, name })), { reliable: true });
  }, [room, localParticipant]);

  // === Hand raise ===
  const [handRaised, setHandRaised] = useState(false);
  const toggleHand = useCallback(() => {
    const raised = !handRaised;
    setHandRaised(raised);
    const name = localParticipant.name || 'Anonim';
    if (raised) {
      setRaisedHands(p => { const n = new Map(p); n.set(localParticipant.identity, name); return n; });
    } else {
      setRaisedHands(p => { const n = new Map(p); n.delete(localParticipant.identity); return n; });
    }
    room.localParticipant.publishData(enc.current.encode(JSON.stringify({
      type: 'hand', raised, identity: localParticipant.identity, name,
    })), { reliable: true });
  }, [handRaised, room, localParticipant]);

  // Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { setActivePanel(null); setShowLeaveConfirm(false); } };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);

  // === AUTO PiP ===
  useEffect(() => {
    const handle = async () => {
      if (document.hidden) {
        try {
          if ('documentPictureInPicture' in window) {
            const pw = await (window as any).documentPictureInPicture.requestWindow({ width: 380, height: 300 });
            pipWindowRef.current = pw;
            buildPipWindow(pw, roomId, localParticipant, onLeave);
            pw.addEventListener('pagehide', () => { pipWindowRef.current = null; });
          } else {
            const vid = document.querySelector('.lk-participant-tile video') as HTMLVideoElement | null;
            if (vid?.requestPictureInPicture) await vid.requestPictureInPicture();
          }
        } catch {}
      } else {
        try {
          if (pipWindowRef.current) { pipWindowRef.current.close(); pipWindowRef.current = null; }
          if (document.pictureInPictureElement) await document.exitPictureInPicture();
        } catch {}
      }
    };
    document.addEventListener('visibilitychange', handle);
    return () => { document.removeEventListener('visibilitychange', handle); if (pipWindowRef.current) { pipWindowRef.current.close(); pipWindowRef.current = null; } };
  }, [localParticipant, roomId, onLeave]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden relative">
      {/* Floating reactions + hand raise notifications */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] pointer-events-none flex flex-col items-center gap-2">
        {floats.map(f => (
          <div key={f.id} className="reaction-float flex flex-col items-center">
            <span className="text-4xl">{f.emoji}</span>
            <span className="text-xs text-white/70 font-medium bg-black/40 px-2 py-0.5 rounded-full mt-0.5">{f.name}</span>
          </div>
        ))}
      </div>

      {/* Raised hands bar */}
      {raisedHands.size > 0 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 glass-panel rounded-2xl px-4 py-2 flex items-center gap-3 animate-scale-in">
          <span className="text-lg">✋</span>
          <span className="text-sm text-white/80">
            {Array.from(raisedHands.values()).join(', ')} mengangkat tangan
          </span>
        </div>
      )}

      <div className="relative flex flex-1 overflow-hidden pb-[80px]">
        <div className="relative flex-1 overflow-hidden">
          <VideoStage viewMode={viewMode} hideSelf={hideSelf} enhanceLight={enhanceLight} />
        </div>

        {/* Chat - always mounted for history */}
        <div style={{ display: activePanel === 'chat' ? undefined : 'none' }}
             className="fixed inset-0 z-50 md:relative md:inset-auto md:z-auto md:my-2 md:mr-2 md:shrink-0">
          <ChatPanel messages={chatMsgs} localIdentity={localParticipant.identity}
            onSend={sendChat} onEdit={editChat} onDelete={deleteChat} onClose={() => setActivePanel(null)} />
        </div>

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
        {activePanel === 'chat' && <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setActivePanel(null)} />}
      </div>

      <BottomBar roomId={roomId} activePanel={activePanel} onPanelChange={setActivePanel}
        onLeave={() => setShowLeaveConfirm(true)} viewMode={viewMode} onViewModeChange={setViewMode}
        hideSelf={hideSelf} onToggleHideSelf={() => setHideSelf(v => !v)}
        onReaction={sendReaction} handRaised={handRaised} onToggleHand={toggleHand} />

      {/* Leave Confirmation */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowLeaveConfirm(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
          <div className="relative glass-panel rounded-3xl p-6 w-full max-w-sm animate-scale-in text-center" onClick={e => e.stopPropagation()}>
            <div className="mx-auto w-14 h-14 rounded-full bg-red-500/15 flex items-center justify-center mb-4">
              <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white/90 mb-1">Tinggalkan Meeting?</h3>
            <p className="text-sm text-white/40 mb-6">Anda yakin ingin meninggalkan meeting ini?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLeaveConfirm(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white/80 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.06] transition-all active:scale-95">Tetap di Meeting</button>
              <button onClick={onLeave} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-400 transition-all active:scale-95 shadow-[0_0_20px_rgba(234,67,53,0.3)]">Tinggalkan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// === Document PiP builder (with SVG icons, not emoji) ===
function buildPipWindow(pw: any, roomId: string, lp: any, onLeave: () => void) {
  const s = pw.document.createElement('style');
  s.textContent = `*{margin:0;box-sizing:border-box;font-family:system-ui,-apple-system,sans-serif}
body{background:#0a0a0f;overflow:hidden}
.w{display:flex;flex-direction:column;height:100vh}
.v{flex:1;position:relative;overflow:hidden;background:#0a0a0f;display:flex;align-items:center;justify-content:center}
video{width:100%;height:100%;object-fit:cover}
.nv{color:rgba(255,255,255,0.2);font-size:13px;display:flex;flex-direction:column;align-items:center;gap:8px}
.nv svg{width:32px;height:32px;opacity:0.3}
.nav{display:flex;gap:8px;padding:10px 16px;justify-content:center;align-items:center;background:rgba(10,10,15,0.85);backdrop-filter:blur(12px);position:absolute;bottom:0;left:0;right:0;opacity:0;transition:opacity 0.2s}
.w:hover .nav{opacity:1}
.b{width:40px;height:40px;border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s}
.bd{background:rgba(255,255,255,0.1);color:#e8eaed}.bd:hover{background:rgba(255,255,255,0.18)}
.br{background:rgba(234,67,53,0.85);color:#fff}.br:hover{background:#ea4335}
.ba{background:rgba(234,67,53,0.7);color:#fff}
.id{text-align:center;font-size:11px;color:rgba(255,255,255,0.25);padding:6px;letter-spacing:0.08em}
svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}`;
  pw.document.head.appendChild(s);

  const micSvg = '<svg viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>';
  const micOffSvg = '<svg viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.5-.35 2.18"/><line x1="12" y1="19" x2="12" y2="22"/></svg>';
  const camSvg = '<svg viewBox="0 0 24 24"><path d="m16 6 5-3v18l-5-3Z"/><rect x="2" y="4" width="14" height="16" rx="2"/></svg>';
  const camOffSvg = '<svg viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16 6.12V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10"/><path d="m22 8-5 3.07"/></svg>';
  const phoneSvg = '<svg viewBox="0 0 24 24"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 2.59 3.4Z"/></svg>';

  const wrap = pw.document.createElement('div'); wrap.className = 'w';
  const id = pw.document.createElement('div'); id.className = 'id'; id.textContent = roomId; wrap.appendChild(id);
  const vid = pw.document.createElement('div'); vid.className = 'v';

  const camTrack = lp.getTrackPublication(Track.Source.Camera)?.track;
  if (camTrack?.mediaStreamTrack) {
    const v = pw.document.createElement('video');
    v.srcObject = new MediaStream([camTrack.mediaStreamTrack]);
    v.autoplay = true; v.muted = true; v.playsInline = true;
    vid.appendChild(v);
  } else {
    const nv = pw.document.createElement('div'); nv.className = 'nv';
    nv.innerHTML = camOffSvg + '<span>Kamera mati</span>'; vid.appendChild(nv);
  }

  const nav = pw.document.createElement('div'); nav.className = 'nav';
  let micOff = lp.getTrackPublication(Track.Source.Microphone)?.isMuted ?? true;
  let camOff = !camTrack;

  const mb = pw.document.createElement('button'); mb.className = `b ${micOff ? 'ba' : 'bd'}`;
  mb.innerHTML = micOff ? micOffSvg : micSvg;
  mb.onclick = () => { micOff = !micOff; lp.setMicrophoneEnabled(!micOff); mb.innerHTML = micOff ? micOffSvg : micSvg; mb.className = `b ${micOff ? 'ba' : 'bd'}`; };

  const cb = pw.document.createElement('button'); cb.className = `b ${camOff ? 'ba' : 'bd'}`;
  cb.innerHTML = camOff ? camOffSvg : camSvg;
  cb.onclick = () => { camOff = !camOff; lp.setCameraEnabled(!camOff); cb.innerHTML = camOff ? camOffSvg : camSvg; cb.className = `b ${camOff ? 'ba' : 'bd'}`; };

  const lb = pw.document.createElement('button'); lb.className = 'b br'; lb.innerHTML = phoneSvg;
  lb.onclick = () => { pw.close(); onLeave(); };

  nav.appendChild(mb); nav.appendChild(cb); nav.appendChild(lb);
  vid.appendChild(nav); wrap.appendChild(vid); pw.document.body.appendChild(wrap);
}
