'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { LiveKitRoom, RoomAudioRenderer, ConnectionStateToast, useLocalParticipant, useRoomContext, useParticipants } from '@livekit/components-react';
import { useKrispNoiseFilter } from '@livekit/components-react/krisp';
import { BackgroundBlur } from '@livekit/track-processors';
import { VideoPresets, DisconnectReason, RoomOptions, Track, RoomEvent, LocalVideoTrack } from 'livekit-client';
import type { MeetingProps, PanelType } from './meeting/types';
import type { ViewMode } from './meeting/BottomBar';
import { VideoStage } from './meeting/VideoStage';
import { BottomBar } from './meeting/BottomBar';
import { ChatPanel } from './meeting/ChatPanel';
import { ParticipantsPanel } from './meeting/ParticipantsPanel';
import { InfoPanel } from './meeting/InfoPanel';
import { SettingsPanel } from './meeting/SettingsPanel';
import { ViewPanel } from './meeting/ViewPanel';
import { WhiteboardPanel } from './meeting/WhiteboardPanel';
import { DynamicWatermark } from './meeting/DynamicWatermark';
import { TimerOverlay } from './meeting/TimerOverlay';
import { TimerModal } from './meeting/TimerModal';

export interface ChatMsg {
  id: string; text: string; senderName: string; senderIdentity: string; ts: number;
  edited?: boolean; editedAt?: number; deleted?: boolean; deletedAt?: number;
  replyToId?: string; replyToText?: string; replyToSender?: string;
  fileUrl?: string; fileName?: string;
  isPrivate?: boolean; targetIdentity?: string;
}
export interface PollOption { id: string; text: string; votes: number; }
export interface Poll { id: string; question: string; options: PollOption[]; createdBy: string; voters: Record<string, string>; } // voterIdentity -> optionId

export interface FloatingNotif { id: number; emoji?: string; text: string; name: string; }
export interface RoomPerms { allowChat: boolean; allowScreenShare: boolean; allowJoin: boolean; allowReactions: boolean; lobbyMode: boolean; allowRename: boolean; allowWhiteboard: boolean; watermarkOn: boolean; allowPolls: boolean; }
export interface Subtitle { id: string; identity: string; name: string; text: string; updatedAt: number; }

const baseRoomOptions: RoomOptions = {
  adaptiveStream: true, dynacast: true,
  publishDefaults: { videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360, VideoPresets.h720], videoCodec: 'vp8', simulcast: true, dtx: true, red: true },
  videoCaptureDefaults: { resolution: VideoPresets.h360.resolution, facingMode: 'user' }, // default to balanced
  audioCaptureDefaults: { autoGainControl: true, echoCancellation: true, noiseSuppression: true },
  stopLocalTrackOnUnpublish: true,
  reconnectPolicy: { nextRetryDelayInMs: (ctx) => Math.min(1000 * Math.pow(2, ctx.retryCount), 10000) },
};

export function MeetingRoom({ roomId, token, wsUrl, name, isHost, password, onLeave }: MeetingProps) {
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [videoQuality, setVideoQuality] = useState<'highest' | 'balanced' | 'lowest'>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'lowest' : 'balanced'
  );

  const [initialQuality] = useState(videoQuality);

  const roomOptions = useMemo(() => {
    let res = VideoPresets.h360.resolution;
    if (initialQuality === 'highest') res = VideoPresets.h720.resolution;
    if (initialQuality === 'lowest') res = VideoPresets.h180.resolution;
    return {
      ...baseRoomOptions,
      videoCaptureDefaults: { ...baseRoomOptions.videoCaptureDefaults, resolution: res }
    };
  }, [initialQuality]);

  if (!wsUrl) return <ErrScr title="Konfigurasi Bermasalah" msg="NEXT_PUBLIC_LIVEKIT_URL belum diset." onLeave={onLeave} />;
  if (fatalError) return <ErrScr title="Koneksi Gagal" msg={fatalError} onLeave={onLeave} />;
  return (
    <LiveKitRoom token={token} serverUrl={wsUrl} connect options={roomOptions}
      video audio data-lk-theme="default"
      onDisconnected={(r) => { if ([DisconnectReason.SERVER_SHUTDOWN, DisconnectReason.PARTICIPANT_REMOVED, DisconnectReason.ROOM_DELETED].includes(r!)) onLeave(); }}
      onError={(e) => setFatalError(e.message)}
      className="theme-meet h-dvh w-dvw overflow-hidden text-white flex flex-col" style={{ background: '#0a0a0f' }}>
      <Shell roomId={roomId} isHost={isHost} password={password} onLeave={onLeave} videoQuality={videoQuality} setVideoQuality={setVideoQuality} />
      <RoomAudioRenderer /><ConnectionStateToast />
    </LiveKitRoom>
  );
}
function ErrScr({ title, msg, onLeave }: { title: string; msg: string; onLeave: () => void }) {
  return <main className="theme-comic min-h-dvh flex items-center justify-center p-4"><div className="card max-w-md text-center"><h2 className="text-xl font-bold text-red-500">{title}</h2><p className="mt-2 text-ink-300">{msg}</p><button className="btn-primary mt-6 w-full" onClick={onLeave}>Kembali</button></div></main>;
}

function Shell({ roomId, isHost, password, onLeave, videoQuality, setVideoQuality }: { roomId: string; isHost: boolean; password?: string; onLeave: () => void; videoQuality: 'highest'|'balanced'|'lowest'; setVideoQuality: (q: 'highest'|'balanced'|'lowest')=>void; }) {
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('standard');
  const [hideSelf, setHideSelf] = useState(false);
  const [enhanceLight, setEnhanceLight] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [meetingStartTime] = useState(() => Date.now());
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [raisedHands, setRaisedHands] = useState<Map<string, string>>(new Map());
  const [floats, setFloats] = useState<FloatingNotif[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [virtualBg, setVirtualBg] = useState<string>('none');
  const bgProcessorRef = useRef<any>(null);
  const appliedBgRef = useRef<{ trackId: string, bg: string }>({ trackId: '', bg: '' });
  const [unreadCount, setUnreadCount] = useState(0);
  const [focusedIdentity, setFocusedIdentity] = useState<string | null>(null);
  const [perms, setPerms] = useState<RoomPerms>({ allowChat: true, allowScreenShare: true, allowJoin: true, allowReactions: true, lobbyMode: false, allowRename: true, allowWhiteboard: false, watermarkOn: false, allowPolls: false });
  const [joinToasts, setJoinToasts] = useState<string[]>([]);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [subtitles, setSubtitles] = useState<Map<string, Subtitle>>(new Map());
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [polls, setPolls] = useState<Poll[]>([]);

  const [timer, setTimer] = useState<{ endTime: number; duration: number } | null>(null);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [admins, setAdmins] = useState<Set<string>>(new Set(isHost ? ['super_admin'] : [])); 
  
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const krisp = useKrispNoiseFilter();
  const pipRef = useRef<any>(null);
  const chatRef = useRef<ChatMsg[]>([]);
  const activePanelRef = useRef(activePanel);
  const enc = useRef(new TextEncoder());
  const dec = useRef(new TextDecoder());
  const joinBatch = useRef<string[]>([]);
  const joinTimer = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<{ endTime: number; duration: number } | null>(null);
  const adminsRef = useRef<Set<string>>(new Set(isHost ? ['super_admin'] : []));

  useEffect(() => { timerRef.current = timer; adminsRef.current = admins; }, [timer, admins]);

  useEffect(() => {
    if (noiseSuppression !== krisp.isNoiseFilterEnabled) {
      krisp.setNoiseFilterEnabled(noiseSuppression).catch(() => {});
    }
  }, [noiseSuppression, krisp]);

  useEffect(() => { chatRef.current = chatMsgs; }, [chatMsgs]);
  useEffect(() => { activePanelRef.current = activePanel; if (activePanel === 'chat') setUnreadCount(0); }, [activePanel]);

  useEffect(() => {
    const applyBg = async () => {
      const track = localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack;
      if (!track) return;
      
      const trackId = track.mediaStreamTrack?.id || track.sid || '';
      
      if (appliedBgRef.current.trackId === trackId && appliedBgRef.current.bg === virtualBg) return;

      try {
        if (virtualBg === 'blur') {
          if (!bgProcessorRef.current) { bgProcessorRef.current = BackgroundBlur(10); }
          await track.setProcessor(bgProcessorRef.current);
        } else {
          await track.setProcessor(undefined as any);
        }
        appliedBgRef.current = { trackId, bg: virtualBg };
      } catch (e) { console.error("BG Error:", e); }
    };
    applyBg();
  }, [virtualBg, localParticipant]);

  // Handle Video Quality Change dynamically
  useEffect(() => {
    const updateQuality = async () => {
      const trackPub = localParticipant.getTrackPublication(Track.Source.Camera);
      if (trackPub && trackPub.track) {
        let res = VideoPresets.h360.resolution;
        if (videoQuality === 'highest') res = VideoPresets.h720.resolution;
        if (videoQuality === 'lowest') res = VideoPresets.h180.resolution;
        
        try {
          if (trackPub.track instanceof LocalVideoTrack) {
            await trackPub.track.restartTrack({ resolution: res });
          } else {
            await (trackPub.track as any).restartTrack?.({ resolution: res });
          }
        } catch (e) {
          console.error("Failed to restart track with new quality", e);
        }
      }
    };
    updateQuality();
  }, [videoQuality, localParticipant]);

  // === UNIFIED DATA HANDLER ===
  useEffect(() => {
    const onData = (payload: Uint8Array) => {
      try {
        const d = JSON.parse(dec.current.decode(payload));
        if (d.type === 'chat') {
          if (d.action === 'send') {
            setChatMsgs(p => p.some(m => m.id === d.id) ? p : [...p, { id: d.id, text: d.text, senderName: d.senderName, senderIdentity: d.senderIdentity, ts: d.ts }]);
            if (activePanelRef.current !== 'chat') setUnreadCount(c => c + 1);
          } else if (d.action === 'edit') setChatMsgs(p => p.map(m => m.id === d.id ? { ...m, text: d.text, edited: true, editedAt: d.ts } : m));
          else if (d.action === 'delete') setChatMsgs(p => p.map(m => m.id === d.id ? { ...m, deleted: true, deletedAt: d.ts } : m));
        } else if (d.type === 'chat_history') {
          setChatMsgs(prev => { const ids = new Set(prev.map(m => m.id)); return [...prev, ...(d.messages as ChatMsg[]).filter(m => !ids.has(m.id))].sort((a, b) => a.ts - b.ts); });
        } else if (d.type === 'reaction') { addFloat(d.emoji, d.name); }
        else if (d.type === 'hand') { setRaisedHands(p => { const n = new Map(p); d.raised ? n.set(d.identity, d.name) : n.delete(d.identity); return n; }); if (d.raised) addFloat('✋', d.name); }
        else if (d.type === 'transcription') { setSubtitles(prev => { const next = new Map(prev); next.set(d.identity, { ...d, updatedAt: Date.now() }); return next; }); }
        else if (d.type === 'permissions') { if (!isHost) setPerms(d.perms); }
        else if (d.type === 'host_action') {
          if (d.action === 'mute_all' && (!isHost && !admins.has(localParticipant.identity))) localParticipant.setMicrophoneEnabled(false);
          if (d.action === 'mute_video_all' && (!isHost && !admins.has(localParticipant.identity))) localParticipant.setCameraEnabled(false);
          if (d.action === 'stop_share' && d.target === localParticipant.identity) { const st = localParticipant.getTrackPublication(Track.Source.ScreenShare); if (st?.track) localParticipant.unpublishTrack(st.track); }
          if (d.action === 'kick' && d.target === localParticipant.identity) { onLeave(); }
          if (d.action === 'kick_all' || d.action === 'end_meeting') { onLeave(); }
          if (d.action === 'promote') setAdmins(prev => new Set(prev).add(d.target));
          if (d.action === 'demote') setAdmins(prev => { const n = new Set(prev); n.delete(d.target); return n; });
        }
        else if (d.type === 'admin_sync') { setAdmins(new Set(d.admins)); }
        else if (d.type === 'poll_create') { setPolls(p => [...p, d.poll]); if (activePanelRef.current !== 'chat') setUnreadCount(c => c + 1); }
        else if (d.type === 'poll_vote') { setPolls(p => p.map(poll => poll.id === d.pollId ? { ...poll, voters: { ...poll.voters, [d.identity]: d.optionId }, options: poll.options.map(opt => ({ ...opt, votes: opt.id === d.optionId ? opt.votes + 1 : (poll.voters[d.identity] === opt.id ? opt.votes - 1 : opt.votes) })) } : poll)); }
        else if (d.type === 'timer_start') { setTimer({ endTime: d.endTime, duration: d.duration }); }
        else if (d.type === 'timer_stop') { setTimer(null); }
      } catch {}
    };
    const onJoin = (p: any) => {
      setTimeout(() => { if (chatRef.current.length > 0) room.localParticipant.publishData(enc.current.encode(JSON.stringify({ type: 'chat_history', messages: chatRef.current })), { reliable: true, destinationIdentities: [p.identity] }); }, 1000);
      // Batched join notification
      joinBatch.current.push(p.name || 'Anonim');
      clearTimeout(joinTimer.current);
      joinTimer.current = setTimeout(() => {
        const names = [...joinBatch.current]; joinBatch.current = [];
        const label = names.length <= 2 ? names.join(' dan ') : `${names[0]}, ${names[1]}, dan ${names.length - 2} lainnya`;
        setJoinToasts(prev => [label]);
        setTimeout(() => setJoinToasts([]), 4000);
        
        // Host syncs state to new joiners
        if (isHost) {
          setTimeout(() => {
             room.localParticipant.publishData(enc.current.encode(JSON.stringify({ type: 'admin_sync', admins: Array.from(adminsRef.current) })), { reliable: true });
             if (timerRef.current) room.localParticipant.publishData(enc.current.encode(JSON.stringify({ type: 'timer_start', endTime: timerRef.current.endTime, duration: timerRef.current.duration })), { reliable: true });
          }, 1500);
        }
      }, 2000);
    };
    room.on(RoomEvent.DataReceived, onData);
    room.on(RoomEvent.ParticipantConnected, onJoin);
    return () => { room.off(RoomEvent.DataReceived, onData); room.off(RoomEvent.ParticipantConnected, onJoin); };
  }, [room, isHost, localParticipant]);

  const addFloat = (emoji: string, name: string) => { const id = Date.now() + Math.random(); setFloats(p => [...p, { id, emoji, text: emoji, name }]); setTimeout(() => setFloats(p => p.filter(f => f.id !== id)), 3500); };
  const pub = useCallback((d: any, dests?: string[]) => room.localParticipant.publishData(enc.current.encode(JSON.stringify(d)), { reliable: true, destinationIdentities: dests }), [room]);
  const sendChat = useCallback((text: string, opts?: Partial<ChatMsg>) => { const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6); const msg: ChatMsg = { id, text, senderName: localParticipant.name || 'Anonim', senderIdentity: localParticipant.identity, ts: Date.now(), ...opts }; setChatMsgs(p => [...p, msg]); pub({ type: 'chat', action: 'send', ...msg }, msg.isPrivate && msg.targetIdentity ? [msg.targetIdentity] : undefined); }, [pub, localParticipant]);
  const editChat = useCallback((id: string, text: string) => { const ts = Date.now(); setChatMsgs(p => p.map(m => m.id === id ? { ...m, text, edited: true, editedAt: ts } : m)); pub({ type: 'chat', action: 'edit', id, text, ts }); }, [pub]);
  const deleteChat = useCallback((id: string) => { const ts = Date.now(); setChatMsgs(p => p.map(m => m.id === id ? { ...m, deleted: true, deletedAt: ts } : m)); pub({ type: 'chat', action: 'delete', id, ts }); }, [pub]);
  const sendReaction = useCallback((emoji: string) => { if (!isHost && !perms.allowReactions) return; const name = localParticipant.name || 'Anonim'; addFloat(emoji, name); pub({ type: 'reaction', emoji, name }); }, [pub, localParticipant, perms, isHost]);

  const handlePollCreate = useCallback((poll: Poll) => {
    setPolls(p => [...p, poll]);
    sendChat('📊 Polling baru telah dibuat! Silakan cek tab Polls.');
  }, [sendChat]);

  // === LIVE CAPTIONS ===
  useEffect(() => {
    if (!captionsOn) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser Anda tidak mendukung Live Captions.");
      setCaptionsOn(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'id-ID';

    let lastId = '';
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }
      const text = finalTranscript || interimTranscript;
      if (!text.trim()) return;
      if (event.results[event.results.length - 1].isFinal || !lastId) lastId = Date.now().toString();

      const payload = { type: 'transcription', id: lastId, identity: localParticipant.identity, name: localParticipant.name || 'Anonim', text: text.trim() };
      setSubtitles(prev => { const next = new Map(prev); next.set(payload.identity, { ...payload, updatedAt: Date.now() }); return next; });
      pub(payload);
    };

    recognition.onerror = () => {};
    recognition.onend = () => { if (captionsOn) try { recognition.start(); } catch {} };
    try { recognition.start(); } catch {}
    return () => { recognition.onend = null; recognition.stop(); };
  }, [captionsOn, localParticipant, pub]);

  useEffect(() => {
    if (subtitles.size === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      let changed = false;
      setSubtitles(prev => {
        const next = new Map(prev);
        for (const [key, sub] of Array.from(next.entries())) {
          if (now - sub.updatedAt > 5000) { next.delete(key); changed = true; }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [subtitles]);

  const [handRaised, setHandRaised] = useState(false);
  const toggleHand = useCallback(() => { const r = !handRaised; setHandRaised(r); const n = localParticipant.name || 'Anonim'; setRaisedHands(p => { const m = new Map(p); r ? m.set(localParticipant.identity, n) : m.delete(localParticipant.identity); return m; }); pub({ type: 'hand', raised: r, identity: localParticipant.identity, name: n }); }, [handRaised, pub, localParticipant]);

  // Host actions — broadcast + persist to Redis
  const broadcastPerms = useCallback((p: RoomPerms) => {
    setPerms(p); pub({ type: 'permissions', perms: p });
    // Persist to Redis so new joiners get the latest settings
    fetch(`/api/rooms/${roomId}/permissions`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostIdentity: localParticipant.identity, permissions: p }),
    }).catch(() => {});
  }, [pub, roomId, localParticipant.identity]);
  const muteAll = useCallback(() => { pub({ type: 'host_action', action: 'mute_all' }); }, [pub]);
  const muteVideoAll = useCallback(() => { pub({ type: 'host_action', action: 'mute_video_all' }); }, [pub]);
  const stopShare = useCallback((identity: string) => { pub({ type: 'host_action', action: 'stop_share', target: identity }); }, [pub]);

  // === RECORDING ===
  const toggleRecord = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'browser' }, audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        stream.getTracks().forEach(t => t.stop());
        
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const formData = new FormData();
        formData.append('file', blob, `Rekaman-${new Date().toISOString().replace(/:/g, '-')}.webm`);
        
        addFloat('⏳', 'Mengunggah rekaman...');
        try {
          const res = await fetch('/api/upload', { method: 'POST', body: formData });
          const data = await res.json();
          if (data.success) {
            sendChat('Rekaman meeting telah tersedia.', { fileUrl: data.url, fileName: data.name });
          } else { alert('Gagal mengunggah rekaman: ' + data.error); }
        } catch (e) { console.error(e); alert('Terjadi kesalahan saat mengunggah rekaman.'); }
      };
      
      mediaRecorder.start(1000);
      setIsRecording(true);
      
      stream.getVideoTracks()[0].onended = () => {
        if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
      };
    } catch (err) {
      console.error('Recording error:', err);
      alert('Gagal memulai rekaman. Pastikan Anda memberikan izin akses layar & audio sistem.');
    }
  };

  // Escape
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { setActivePanel(null); setShowLeaveConfirm(false); } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, []);

  // === AUTO PiP ===
  useEffect(() => {
    let to: any;
    const handle = () => {
      clearTimeout(to);
      if (document.hidden) {
        to = setTimeout(async () => {
          if (pipRef.current) return;
          try {
            if ('documentPictureInPicture' in window) {
              const pw = await (window as any).documentPictureInPicture.requestWindow({ width: 340, height: 260 });
              pipRef.current = pw;
              buildPip(pw, localParticipant, () => { pw.close(); pipRef.current = null; setShowLeaveConfirm(true); });
              pw.addEventListener('pagehide', () => { pipRef.current = null; });
            } else {
              const v = document.querySelector('.lk-participant-tile video') as HTMLVideoElement | null;
              if (v?.requestPictureInPicture) await v.requestPictureInPicture();
            }
          } catch {}
        }, 100);
      } else {
        try { if (pipRef.current) { pipRef.current.close(); pipRef.current = null; } if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {}); } catch {}
      }
    };
    document.addEventListener('visibilitychange', handle);
    window.addEventListener('blur', handle);
    window.addEventListener('focus', handle);
    return () => { clearTimeout(to); document.removeEventListener('visibilitychange', handle); window.removeEventListener('blur', handle); window.removeEventListener('focus', handle); if (pipRef.current) { pipRef.current.close(); pipRef.current = null; } };
  }, [localParticipant]);

  const handleTimerClick = () => {
    setShowTimerModal(true);
  };

  const startTimer = (totalSeconds: number) => {
    const duration = totalSeconds;
    const endTime = Date.now() + duration * 1000;
    pub({ type: 'timer_start', endTime, duration });
    setTimer({ endTime, duration });
  };

  const handleStopTimer = () => {
    pub({ type: 'timer_stop' });
    setTimer(null);
  };

  const handleLeaveAction = () => {
    if (admins.has(localParticipant.identity) && admins.size === 1) {
      const others = Array.from(room.remoteParticipants.values());
      if (others.length > 0) {
        pub({ type: 'host_action', action: 'promote', target: others[0].identity });
      }
    }
    onLeave();
  };

  const handleEndForEveryone = async () => {
    pub({ type: 'host_action', action: 'end_meeting' });
    try {
      await fetch(`/api/rooms/${roomId}`, { method: 'DELETE' });
    } catch {}
    onLeave();
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden relative">
      {/* Floating reactions */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] pointer-events-none flex flex-col items-center gap-2">
        {floats.map(f => <div key={f.id} className="reaction-float flex flex-col items-center"><span className="text-4xl">{f.emoji}</span><span className="text-xs text-white/70 font-medium bg-black/40 px-2 py-0.5 rounded-full mt-0.5">{f.name}</span></div>)}
      </div>

      {/* Raised hands bar */}
      {raisedHands.size > 0 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 glass-panel rounded-2xl px-4 py-2 flex items-center gap-3 animate-scale-in">
          <span className="text-lg">✋</span><span className="text-sm text-white/80">{Array.from(raisedHands.values()).join(', ')} mengangkat tangan</span>
        </div>
      )}

      {/* Join toast */}
      {joinToasts.length > 0 && (
        <div className="absolute top-3 right-3 z-50 glass-panel rounded-xl px-4 py-2.5 animate-scale-in flex items-center gap-2 text-sm text-white/80 max-w-sm">
          <span className="text-lg">👋</span>{joinToasts[0]} bergabung
        </div>
      )}

      {/* Timer Overlay */}
      {timer && (
        <TimerOverlay endTime={timer.endTime} isHost={isHost || admins.has(localParticipant.identity)} onStop={handleStopTimer} />
      )}

      <div className="relative flex flex-1 overflow-hidden pb-[80px]">
        <div className="relative flex-1 overflow-hidden">
          <VideoStage viewMode={viewMode} hideSelf={hideSelf} enhanceLight={enhanceLight}
            focusedIdentity={focusedIdentity} onFocusParticipant={setFocusedIdentity} />
          
          {/* Subtitles Overlay */}
          {subtitles.size > 0 && (
            <div className="absolute bottom-[20px] left-0 right-0 z-40 flex flex-col items-center gap-2 pointer-events-none px-4">
              {Array.from(subtitles.values()).sort((a, b) => a.updatedAt - b.updatedAt).slice(-3).map(sub => (
                <div key={sub.id} className="bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-xl text-center max-w-[80%] animate-fade-in shadow-[0_4px_20px_rgba(0,0,0,0.5)] border border-white/10">
                  <span className="text-[11px] font-bold text-[#8ab4f8] block mb-0.5">{sub.name}</span>
                  <span className="text-sm md:text-base font-medium text-white drop-shadow-lg leading-snug">{sub.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Dynamic Watermark */}
          {perms.watermarkOn && (
            <DynamicWatermark name={localParticipant.name || 'Peserta'} roomId={roomId} />
          )}
        </div>

        {/* Chat always mounted */}
        <div style={{ display: activePanel === 'chat' ? undefined : 'none' }}
             className="fixed inset-0 z-50 md:relative md:inset-auto md:z-auto md:my-2 md:mr-2 md:shrink-0">
          <ChatPanel messages={chatMsgs} localIdentity={localParticipant.identity} localName={localParticipant.name || 'Anonim'}
            onSend={sendChat} onEdit={editChat} onDelete={deleteChat} onClose={() => setActivePanel(null)}
            disabled={!isHost && !perms.allowChat && !admins.has(localParticipant.identity)}
            polls={polls} isHost={isHost || admins.has(localParticipant.identity)} pub={pub} allowPolls={perms.allowPolls} onPollCreate={handlePollCreate} />
        </div>

        {activePanel && activePanel !== 'chat' && (
          <>
            <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setActivePanel(null)} />
            <div className="fixed inset-0 z-50 md:relative md:inset-auto md:z-auto md:my-2 md:mr-2 md:shrink-0">
              {activePanel === 'participants' && <ParticipantsPanel 
                isHost={isHost || admins.has(localParticipant.identity)} 
                isSuperAdmin={isHost}
                roomId={roomId} 
                onClose={() => setActivePanel(null)} 
                onStopShare={stopShare} 
                admins={admins} 
                pub={pub} 
                localIdentity={localParticipant.identity} 
              />}
              {activePanel === 'info' && <InfoPanel roomId={roomId} isHost={isHost} password={password} startTime={meetingStartTime} onClose={() => setActivePanel(null)} allowRename={isHost || perms.allowRename} onRename={(n) => { localParticipant.setName(n); pub({ type: 'rename', identity: localParticipant.identity, name: n }); }} />}
              {activePanel === 'settings' && <SettingsPanel onClose={() => setActivePanel(null)} enhanceLight={enhanceLight} onToggleEnhanceLight={() => setEnhanceLight(v => !v)} isHost={isHost} perms={perms} onPermsChange={broadcastPerms} onMuteAll={muteAll} onMuteVideoAll={muteVideoAll} virtualBg={virtualBg} onVirtualBgChange={setVirtualBg} noiseSuppression={noiseSuppression} onToggleNoiseSuppression={() => setNoiseSuppression(v => !v)} captionsOn={captionsOn} onToggleCaptions={() => setCaptionsOn(!captionsOn)} videoQuality={videoQuality} onVideoQualityChange={setVideoQuality} />}
              {activePanel === 'view' && <ViewPanel viewMode={viewMode} onViewModeChange={setViewMode} hideSelf={hideSelf} onToggleHideSelf={() => setHideSelf(v => !v)} onClose={() => setActivePanel(null)} />}
              {activePanel === 'whiteboard' && <WhiteboardPanel roomId={roomId} onClose={() => setActivePanel(null)} allowWhiteboard={perms.allowWhiteboard} />}
            </div>
          </>
        )}
        {activePanel === 'chat' && <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setActivePanel(null)} />}
      </div>

      <BottomBar roomId={roomId} activePanel={activePanel} onPanelChange={setActivePanel}
        onLeave={() => setShowLeaveConfirm(true)} onReaction={sendReaction}
        handRaised={handRaised} onToggleHand={toggleHand} unreadCount={unreadCount}
        permissions={perms} isHost={isHost || admins.has(localParticipant.identity)} isRecording={isRecording} onRecordToggle={toggleRecord}
        onTimerClick={handleTimerClick} timerActive={!!timer} />

      {/* Timer Modal */}
      {showTimerModal && (
        <TimerModal onClose={() => setShowTimerModal(false)} onStart={startTimer} />
      )}

      {/* Leave Confirmation */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowLeaveConfirm(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
          <div className="relative glass-panel rounded-3xl p-6 w-full max-w-sm animate-scale-in text-center" onClick={e => e.stopPropagation()}>
            <div className="mx-auto w-14 h-14 rounded-full bg-red-500/15 flex items-center justify-center mb-4">
              <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
            </div>
            <h3 className="text-lg font-semibold text-white/90 mb-1">Tinggalkan Meeting?</h3>
            <p className="text-sm text-white/40 mb-6">Anda yakin ingin meninggalkan meeting ini?</p>
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <button onClick={() => setShowLeaveConfirm(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white/80 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.06] transition-all active:scale-95">Batal</button>
                <button onClick={handleLeaveAction} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-400 transition-all active:scale-95 shadow-[0_0_20px_rgba(234,67,53,0.3)]">Tinggalkan</button>
              </div>
              {(isHost || admins.has(localParticipant.identity)) && (
                <button onClick={handleEndForEveryone} className="w-full py-3 rounded-xl text-sm font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all active:scale-95">Akhiri untuk Semua</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// === PiP builder — no room ID, polling sync, leave confirmation ===
function buildPip(pw: any, lp: any, onLeave: () => void) {
  const s = pw.document.createElement('style');
  s.textContent = `*{margin:0;box-sizing:border-box;font-family:system-ui}body{background:#0a0a0f;overflow:hidden}.w{height:100vh;position:relative}.v{height:100%;display:flex;align-items:center;justify-content:center}video{width:100%;height:100%;object-fit:cover}.nv{color:rgba(255,255,255,0.2);font-size:13px;text-align:center}.nav{display:flex;gap:8px;padding:10px 16px;justify-content:center;position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);opacity:0;transition:opacity 0.2s}.w:hover .nav{opacity:1}.b{width:40px;height:40px;border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s}.bd{background:rgba(255,255,255,0.12);color:#e8eaed}.bd:hover{background:rgba(255,255,255,0.2)}.ba{background:rgba(234,67,53,0.8);color:#fff}.br{background:rgba(234,67,53,0.85);color:#fff}.br:hover{background:#ea4335}svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}`;
  pw.document.head.appendChild(s);
  const MI='<svg viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>';
  const MO='<svg viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.5-.35 2.18"/></svg>';
  const CI='<svg viewBox="0 0 24 24"><path d="m16 6 5-3v18l-5-3Z"/><rect x="2" y="4" width="14" height="16" rx="2"/></svg>';
  const CO='<svg viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16 6.12V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10"/><path d="m22 8-5 3"/></svg>';
  const PH='<svg viewBox="0 0 24 24"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 2.59 3.4Z"/></svg>';

  const wrap = pw.document.createElement('div'); wrap.className='w';
  const vid = pw.document.createElement('div'); vid.className='v';
  const videoEl = pw.document.createElement('video'); videoEl.autoplay=true; videoEl.muted=true; videoEl.playsInline=true;
  const noVid = pw.document.createElement('div'); noVid.className='nv'; noVid.textContent='Kamera mati';
  let lastTrackId = '';

  const updateVideo = () => {
    const t = lp.getTrackPublication?.(Track.Source.Camera)?.track;
    const tid = t?.mediaStreamTrack?.id || '';
    if (tid && tid !== lastTrackId) { videoEl.srcObject = new MediaStream([t.mediaStreamTrack]); lastTrackId = tid; if (!videoEl.parentNode) { noVid.remove(); vid.prepend(videoEl); } }
    else if (!tid && !noVid.parentNode) { videoEl.remove(); vid.prepend(noVid); lastTrackId = ''; }
  };
  updateVideo();

  const nav = pw.document.createElement('div'); nav.className='nav';
  const mb = pw.document.createElement('button');
  const cb = pw.document.createElement('button');
  const sync = () => { const m=lp.isMicrophoneEnabled,c=lp.isCameraEnabled; mb.innerHTML=m?MI:MO; mb.className=`b ${m?'bd':'ba'}`; cb.innerHTML=c?CI:CO; cb.className=`b ${c?'bd':'ba'}`; };
  sync();
  mb.onclick = () => { lp.setMicrophoneEnabled(!lp.isMicrophoneEnabled); setTimeout(sync,100); };
  cb.onclick = () => { lp.setCameraEnabled(!lp.isCameraEnabled); setTimeout(()=>{sync();updateVideo();},300); };
  const lb = pw.document.createElement('button'); lb.className='b br'; lb.innerHTML=PH;
  lb.onclick = () => { onLeave(); };
  nav.appendChild(mb); nav.appendChild(cb); nav.appendChild(lb);
  vid.appendChild(nav); wrap.appendChild(vid); pw.document.body.appendChild(wrap);
  const iv = setInterval(() => { try { sync(); updateVideo(); } catch { clearInterval(iv); } }, 500);
  pw.addEventListener('pagehide', () => clearInterval(iv));
}
