'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { LiveKitRoom, RoomAudioRenderer, ConnectionStateToast, useLocalParticipant, useRoomContext, useParticipants, useTracks, GridLayout, ParticipantTile, useSpeakingParticipants } from '@livekit/components-react';
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
export interface Poll { id: string; question: string; options: PollOption[]; createdBy: string; voters: Record<string, string[]>; allowMultiple?: boolean; showResults?: boolean; } // voterIdentity -> optionIds[]

export interface FloatingNotif { id: number; emoji?: string; text: string; name: string; }
export interface RoomPerms { allowChat: boolean; allowScreenShare: boolean; allowJoin: boolean; allowReactions: boolean; lobbyMode: boolean; allowRename: boolean; allowWhiteboard: boolean; allowPolls: boolean; }
export interface Subtitle { id: string; identity: string; name: string; text: string; updatedAt: number; }

const baseRoomOptions: RoomOptions = {
  adaptiveStream: true, dynacast: true,
  publishDefaults: { videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360, VideoPresets.h720], videoCodec: 'vp8', simulcast: true, screenShareEncoding: { maxBitrate: 3000000, maxFramerate: 30 } },
  videoCaptureDefaults: { resolution: VideoPresets.h360.resolution, facingMode: 'user' }, // default to balanced
  audioCaptureDefaults: { autoGainControl: true, echoCancellation: true, noiseSuppression: true },
  stopLocalTrackOnUnpublish: true,
  reconnectPolicy: { nextRetryDelayInMs: (ctx) => Math.min(1000 * Math.pow(2, ctx.retryCount), 10000) },
};

export function MeetingRoom({ roomId, token, wsUrl, name, isHost, password, onLeave, initialMic, initialCam, hasMicError, hasCamError }: MeetingProps) {
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [videoQuality, setVideoQuality] = useState<'highest' | 'balanced' | 'lowest' | 'auto'>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'auto' : 'auto'
  );
  const manualDisconnectRef = useRef(false);

  const [initialQuality] = useState(videoQuality);

  const roomOptions = useMemo(() => {
    let res = VideoPresets.h360.resolution;
    if (initialQuality === 'highest') res = VideoPresets.h720.resolution;
    if (initialQuality === 'lowest') res = VideoPresets.h180.resolution;
    if (initialQuality === 'auto') res = VideoPresets.h360.resolution;
    return {
      ...baseRoomOptions,
      videoCaptureDefaults: { ...baseRoomOptions.videoCaptureDefaults, resolution: res }
    };
  }, [initialQuality]);

  if (!wsUrl) return <ErrScr title="Konfigurasi Bermasalah" msg="NEXT_PUBLIC_LIVEKIT_URL belum diset." onLeave={onLeave} />;
  if (fatalError) return <ErrScr title="Koneksi Terputus" msg={fatalError} onLeave={onLeave} />;
  return (
    <LiveKitRoom token={token} serverUrl={wsUrl} connect options={roomOptions}
      video={initialCam ?? true} audio={initialMic ?? true} data-lk-theme="default"
      onDisconnected={(r) => {
        if (manualDisconnectRef.current) return;
        if (r === DisconnectReason.ROOM_DELETED) setFatalError('Rapat ini telah diakhiri oleh Host.');
        else if (r === DisconnectReason.PARTICIPANT_REMOVED) setFatalError('Anda telah dikeluarkan dari rapat.');
        else if (r === DisconnectReason.SERVER_SHUTDOWN) setFatalError('Koneksi terputus dari server.');
        else setFatalError(`Terputus dari rapat. Alasan: ${r || 'Koneksi terputus'}`);
      }}
      onError={(e) => setFatalError(`Terjadi kesalahan: ${e.message}`)}
      className="theme-meet h-dvh w-dvw overflow-hidden text-white flex flex-col" style={{ background: '#0a0a0f' }}>
      <Shell roomId={roomId} isHost={isHost} password={password} onLeave={onLeave} videoQuality={videoQuality} setVideoQuality={setVideoQuality} onManualDisconnect={() => manualDisconnectRef.current = true} hasMicError={hasMicError} hasCamError={hasCamError} />
      <RoomAudioRenderer /><ConnectionStateToast />
    </LiveKitRoom>
  );
}
function ErrScr({ title, msg, onLeave }: { title: string; msg: string; onLeave: () => void }) {
  return <main className="theme-comic min-h-dvh flex items-center justify-center p-4"><div className="card max-w-md text-center"><h2 className="text-xl font-bold text-red-500">{title}</h2><p className="mt-2 text-ink-300">{msg}</p><button className="btn-primary mt-6 w-full" onClick={onLeave}>Kembali</button></div></main>;
}

function Shell({ roomId, isHost, password, onLeave, videoQuality, setVideoQuality, onManualDisconnect, hasMicError, hasCamError }: { roomId: string; isHost: boolean; password?: string; onLeave: () => void; videoQuality: 'highest'|'balanced'|'lowest'|'auto'; setVideoQuality: (q: 'highest'|'balanced'|'lowest'|'auto')=>void; onManualDisconnect: () => void; hasMicError?: boolean; hasCamError?: boolean; }) {
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
  const [unreadCount, setUnreadCount] = useState(0);
  const [focusedIdentity, setFocusedIdentity] = useState<string | null>(null);
  const [perms, setPerms] = useState<RoomPerms>({ allowChat: true, allowScreenShare: true, allowJoin: true, allowReactions: true, lobbyMode: false, allowRename: true, allowWhiteboard: false, allowPolls: false });
  const [joinToasts, setJoinToasts] = useState<string[]>([]);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [subtitles, setSubtitles] = useState<Map<string, Subtitle>>(new Map());
  const [noiseSuppression, setNoiseSuppression] = useState(false);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [endMessage, setEndMessage] = useState<{ title: string, msg: string } | null>(null);
  const [globalPinnedIdentity, setGlobalPinnedIdentity] = useState<string | null>(null);

  const [timer, setTimer] = useState<{ endTime: number; duration: number } | null>(null);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [admins, setAdmins] = useState<Set<string>>(new Set(isHost ? ['super_admin'] : [])); 
  const [superAdmin, setSuperAdmin] = useState<string | null>(isHost ? 'super_admin' : null);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const participants = useParticipants();
  const krisp = useKrispNoiseFilter();

  const activeSuperAdmin = useMemo(() => {
    const originalHost = participants.find(p => p.identity.startsWith('host-'));
    if (originalHost) return originalHost.identity;

    if (superAdmin && superAdmin !== 'super_admin' && participants.some(p => p.identity === superAdmin)) {
      return superAdmin;
    }

    if (participants.length > 0) {
      const sorted = [...participants].sort((a, b) => {
        const timeA = a.joinedAt?.getTime() || 0;
        const timeB = b.joinedAt?.getTime() || 0;
        if (timeA !== timeB) return timeA - timeB;
        return a.identity.localeCompare(b.identity);
      });
      return sorted[0].identity;
    }
    return null;
  }, [participants, superAdmin]);

  const isAmIAdmin = isHost || admins.has(localParticipant.identity) || activeSuperAdmin === localParticipant.identity;

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
  const superAdminRef = useRef(superAdmin);
  const handRaisedRef = useRef(handRaised);
  const subtitlesRef = useRef(subtitles);
  const raisedHandsRef = useRef(raisedHands);
  const captionsOnRef = useRef(captionsOn);
  const globalPinnedIdentityRef = useRef(globalPinnedIdentity);

  // Debounced dominant speaker (Zoom/Meet style)
  const activeSpeakers = useSpeakingParticipants();
  const [dominantSpeaker, setDominantSpeaker] = useState<string | null>(null);

  useEffect(() => {
    if (activeSpeakers.length > 0) {
      const topSpeaker = activeSpeakers[0].identity;
      if (topSpeaker !== dominantSpeaker) {
        const timer = setTimeout(() => {
          setDominantSpeaker(topSpeaker);
        }, 1500); // Hold for 1.5 seconds to prevent rapid flickering
        return () => clearTimeout(timer);
      }
    }
  }, [activeSpeakers, dominantSpeaker]);

  useEffect(() => { timerRef.current = timer; adminsRef.current = admins; superAdminRef.current = superAdmin; }, [timer, admins, superAdmin]);
  useEffect(() => { handRaisedRef.current = handRaised; }, [handRaised]);
  useEffect(() => { subtitlesRef.current = subtitles; }, [subtitles]);
  useEffect(() => { raisedHandsRef.current = raisedHands; }, [raisedHands]);
  useEffect(() => { captionsOnRef.current = captionsOn; }, [captionsOn]);
  useEffect(() => { globalPinnedIdentityRef.current = globalPinnedIdentity; }, [globalPinnedIdentity]);

  useEffect(() => {
    if (noiseSuppression !== krisp.isNoiseFilterEnabled) {
      krisp.setNoiseFilterEnabled(noiseSuppression).catch(() => {});
    }
  }, [noiseSuppression, krisp]);

  useEffect(() => { chatRef.current = chatMsgs; }, [chatMsgs]);
  useEffect(() => { activePanelRef.current = activePanel; if (activePanel === 'chat') setUnreadCount(0); }, [activePanel]);

  // Handle Video Quality Change dynamically
  useEffect(() => {
    const updateQuality = async () => {
      const trackPub = localParticipant.getTrackPublication(Track.Source.Camera);
      if (trackPub && trackPub.track) {
        let res = VideoPresets.h360.resolution;
        if (videoQuality === 'highest') res = VideoPresets.h720.resolution;
        if (videoQuality === 'lowest') res = VideoPresets.h180.resolution;
        if (videoQuality === 'auto') res = VideoPresets.h360.resolution;
        
        try {
          if (trackPub.track instanceof LocalVideoTrack) {
            const currentSettings = trackPub.track.mediaStreamTrack.getSettings();
            await trackPub.track.restartTrack({ resolution: res, facingMode: currentSettings.facingMode as any });
          } else {
            const currentSettings = (trackPub.track as any).mediaStreamTrack?.getSettings?.();
            await (trackPub.track as any).restartTrack?.({ resolution: res, facingMode: currentSettings?.facingMode as any });
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
            setChatMsgs(p => p.some(m => m.id === d.id) ? p : [...p, { id: d.id, text: d.text, senderName: d.senderName, senderIdentity: d.senderIdentity, ts: d.ts, fileUrl: d.fileUrl, fileName: d.fileName, replyToId: d.replyToId, replyToText: d.replyToText, replyToSender: d.replyToSender, isPrivate: d.isPrivate, targetIdentity: d.targetIdentity }]);
            if (activePanelRef.current !== 'chat') setUnreadCount(c => c + 1);
          } else if (d.action === 'edit') setChatMsgs(p => p.map(m => m.id === d.id ? { ...m, text: d.text, edited: true, editedAt: d.ts } : m));
          else if (d.action === 'delete') setChatMsgs(p => p.map(m => m.id === d.id ? { ...m, deleted: true, deletedAt: d.ts } : m));
        } else if (d.type === 'chat_history') {
          setChatMsgs(prev => { const ids = new Set(prev.map(m => m.id)); return [...prev, ...(d.messages as ChatMsg[]).filter(m => !ids.has(m.id))].sort((a, b) => a.ts - b.ts); });
        } else if (d.type === 'reaction') { addFloat(d.emoji, d.name); }
        else if (d.type === 'hand') { setRaisedHands(p => { const n = new Map(p); d.raised ? n.set(d.identity, d.name) : n.delete(d.identity); return n; }); if (d.raised) addFloat('✋', d.name); }
        else if (d.type === 'transcription') { if (captionsOnRef.current) { setSubtitles(prev => { const next = new Map(prev); next.set(d.identity, { ...d, updatedAt: Date.now() }); return next; }); } }
        else if (d.type === 'permissions') { setPerms(d.perms); }
        else if (d.type === 'host_action') {
          if (d.action === 'mute_all' && (!isAmIAdmin)) localParticipant.setMicrophoneEnabled(false);
          if (d.action === 'mute_video_all' && (!isAmIAdmin)) localParticipant.setCameraEnabled(false);
          if (d.action === 'stop_share' && d.target === localParticipant.identity) { const st = localParticipant.getTrackPublication(Track.Source.ScreenShare); if (st?.track) localParticipant.unpublishTrack(st.track); }
          if (d.action === 'kick' && d.target === localParticipant.identity) { onManualDisconnect(); room.disconnect(); setEndMessage({ title: 'Akses Ditolak', msg: 'Anda telah dikeluarkan dari rapat.' }); }
          if (d.action === 'kick_all' || d.action === 'end_meeting') { onManualDisconnect(); room.disconnect(); setEndMessage({ title: 'Rapat Selesai', msg: 'Rapat ini telah diakhiri oleh Host.' }); }
          if (d.action === 'promote') setAdmins(prev => new Set(prev).add(d.target));
          if (d.action === 'demote') setAdmins(prev => { const n = new Set(prev); n.delete(d.target); return n; });
          if (d.action === 'pin_global') setGlobalPinnedIdentity(d.target);
          if (d.action === 'unpin_global') setGlobalPinnedIdentity(null);
        }
        else if (d.type === 'admin_sync') { setAdmins(new Set(d.admins)); if (d.superAdmin) setSuperAdmin(d.superAdmin); if (d.pinnedIdentity) setGlobalPinnedIdentity(d.pinnedIdentity); }
        else if (d.type === 'new_super_admin') { setSuperAdmin(d.target); }
        else if (d.type === 'poll_create') { setPolls(p => [...p, d.poll]); if (activePanelRef.current !== 'chat') setUnreadCount(c => c + 1); }
        else if (d.type === 'poll_vote') { 
          setPolls(p => p.map(poll => {
            if (poll.id !== d.pollId) return poll;
            const newVoters: Record<string, string[]> = { ...poll.voters, [d.identity]: d.optionIds };
            const newOptions = poll.options.map(opt => {
              let count = 0;
              Object.values(newVoters).forEach((opts) => { if (Array.isArray(opts) && opts.includes(opt.id)) count++; });
              return { ...opt, votes: count };
            });
            return { ...poll, voters: newVoters, options: newOptions };
          })); 
        }
        else if (d.type === 'poll_delete') {
          setPolls(p => p.filter(poll => poll.id !== d.pollId));
          setChatMsgs(p => [...p, { id: Date.now().toString() + Math.random().toString(), text: '🗑️ Polling ini telah dihapus.', senderName: 'Sistem', senderIdentity: 'system', ts: Date.now() }]);
        }
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
             room.localParticipant.publishData(enc.current.encode(JSON.stringify({ type: 'admin_sync', admins: Array.from(adminsRef.current), superAdmin: superAdminRef.current, pinnedIdentity: globalPinnedIdentityRef.current })), { reliable: true });
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

  const handlePollVote = useCallback((pollId: string, optionIds: string[]) => {
    setPolls(p => p.map(poll => {
      if (poll.id !== pollId) return poll;
      const newVoters: Record<string, string[]> = { ...poll.voters, [localParticipant.identity]: optionIds };
      const newOptions = poll.options.map(opt => {
        let count = 0;
        Object.values(newVoters).forEach((opts) => { if (Array.isArray(opts) && opts.includes(opt.id)) count++; });
        return { ...opt, votes: count };
      });
      return { ...poll, voters: newVoters, options: newOptions };
    }));
    pub({ type: 'poll_vote', pollId, optionIds, identity: localParticipant.identity });
  }, [pub, localParticipant.identity]);

  const handlePollDelete = useCallback((pollId: string) => {
    setPolls(p => p.filter(poll => poll.id !== pollId));
    pub({ type: 'poll_delete', pollId });
    setChatMsgs(p => [...p, { id: Date.now().toString() + Math.random().toString(), text: '🗑️ Polling ini telah dihapus.', senderName: 'Sistem', senderIdentity: 'system', ts: Date.now() }]);
  }, [pub]);

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
      if (!text.trim() || !localParticipant.isMicrophoneEnabled) return;
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

  const toggleHand = useCallback(() => { const r = !handRaisedRef.current; setHandRaised(r); const n = localParticipant.name || 'Anonim'; setRaisedHands(p => { const m = new Map(p); r ? m.set(localParticipant.identity, n) : m.delete(localParticipant.identity); return m; }); pub({ type: 'hand', raised: r, identity: localParticipant.identity, name: n }); }, [pub, localParticipant]);

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

  const handlePromoteAction = useCallback((target: string) => {
    pub({ type: 'host_action', action: 'promote', target });
    setAdmins(prev => new Set(prev).add(target));
  }, [pub]);

  const handleDemoteAction = useCallback((target: string) => {
    pub({ type: 'host_action', action: 'demote', target });
    setAdmins(prev => { const n = new Set(prev); n.delete(target); return n; });
  }, [pub]);

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

  // Escape and Shortcuts
  useEffect(() => { 
    const pttOriginalState = { current: false };
    const h = (e: KeyboardEvent) => { 
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (e.key === 'Escape') { setActivePanel(null); setShowLeaveConfirm(false); return; } 
      if (isInput) return;
      
      if (e.ctrlKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled);
      }
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        pttOriginalState.current = localParticipant.isMicrophoneEnabled;
        if (!pttOriginalState.current) localParticipant.setMicrophoneEnabled(true);
      }
    }; 
    const kU = (e: KeyboardEvent) => {
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (isInput) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (!pttOriginalState.current && localParticipant.isMicrophoneEnabled) {
          localParticipant.setMicrophoneEnabled(false);
        }
      }
    };
    window.addEventListener('keydown', h); 
    window.addEventListener('keyup', kU);
    return () => { window.removeEventListener('keydown', h); window.removeEventListener('keyup', kU); }; 
  }, [localParticipant]);

  // === AUTO PiP ===
  useEffect(() => {
    let to: any;
    const handle = () => {
      clearTimeout(to);
      if (document.hidden) {
        to = setTimeout(async () => {
          if (pipWindow) return;
          try {
            if ('documentPictureInPicture' in window) {
              const pw = await (window as any).documentPictureInPicture.requestWindow({ width: 400, height: 300 });
              pw.addEventListener('pagehide', () => setPipWindow(null));
              [...document.styleSheets].forEach(styleSheet => {
                try {
                  const cssRules = [...styleSheet.cssRules].map(rule => rule.cssText).join('');
                  const style = document.createElement('style');
                  style.textContent = cssRules;
                  pw.document.head.appendChild(style);
                } catch (e) {
                  const link = document.createElement('link');
                  link.rel = 'stylesheet'; link.type = styleSheet.type;
                  if (styleSheet.media.mediaText) link.media = styleSheet.media.mediaText;
                  link.href = styleSheet.href!;
                  pw.document.head.appendChild(link);
                }
              });
              pw.document.body.className = document.body.className;
              setPipWindow(pw);
            } else {
              const v = document.querySelector('.lk-participant-tile video') as HTMLVideoElement | null;
              if (v?.requestPictureInPicture) await v.requestPictureInPicture();
            }
          } catch {}
        }, 100);
      } else {
        try { if (pipWindow) { pipWindow.close(); setPipWindow(null); } if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {}); } catch {}
      }
    };
    document.addEventListener('visibilitychange', handle);
    window.addEventListener('blur', handle);
    window.addEventListener('focus', handle);
    return () => { clearTimeout(to); document.removeEventListener('visibilitychange', handle); window.removeEventListener('blur', handle); window.removeEventListener('focus', handle); if (pipWindow) { pipWindow.close(); setPipWindow(null); } };
  }, [pipWindow]);

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
    if (activeSuperAdmin === localParticipant.identity || (superAdmin === 'super_admin' && isHost)) {
      const otherAdmins = Array.from(admins).filter(id => id !== localParticipant.identity && id !== 'super_admin' && room.remoteParticipants.has(id));
      if (otherAdmins.length > 0) {
        pub({ type: 'new_super_admin', target: otherAdmins[0] });
      } else {
        const others = Array.from(room.remoteParticipants.values());
        if (others.length > 0) {
           pub({ type: 'host_action', action: 'promote', target: others[0].identity });
           pub({ type: 'new_super_admin', target: others[0].identity });
        }
      }
    }
    onLeave();
  };

  const handleEndForEveryone = async () => {
    setShowLeaveConfirm(false);
    pub({ type: 'host_action', action: 'end_meeting' });
    onManualDisconnect();
    setTimeout(() => room.disconnect(), 150);
    try {
      await fetch(`/api/rooms/${roomId}`, { method: 'DELETE' });
    } catch {}
    setEndMessage({ title: 'Rapat Selesai', msg: 'Anda telah mengakhiri rapat ini.' });
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden relative">
      {/* End Meeting Modal */}
      {endMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative glass-panel rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl border border-white/10 animate-scale-in">
            <h3 className="text-xl font-bold text-white mb-2">{endMessage.title}</h3>
            <p className="text-white/70 mb-6">{endMessage.msg}</p>
            <button onClick={() => { onLeave(); }} className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-[#8ab4f8] hover:bg-[#8ab4f8]/90 transition-all active:scale-95">Kembali ke Beranda</button>
          </div>
        </div>
      )}

      {/* Floating reactions */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] pointer-events-none flex flex-col items-center gap-2">
        {floats.map(f => <div key={f.id} className="reaction-float flex flex-col items-center"><span className="text-4xl">{f.emoji}</span><span className="text-xs text-white/70 font-medium bg-black/40 px-2 py-0.5 rounded-full mt-0.5">{f.name}</span></div>)}
      </div>

      {/* Raised hands bar */}
      {raisedHands.size > 0 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50">
          <div className="glass-panel rounded-2xl px-4 py-2 flex items-center gap-3 animate-scale-in">
            <span className="text-lg">✋</span><span className="text-sm text-white/80">{Array.from(raisedHands.values()).join(', ')} mengangkat tangan</span>
          </div>
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
        <TimerOverlay endTime={timer.endTime} isHost={isAmIAdmin} onStop={handleStopTimer} />
      )}

      <div className="relative flex flex-1 overflow-hidden pb-[80px]">
        <div className="relative flex-1 overflow-hidden">
          <VideoStage viewMode={viewMode} hideSelf={hideSelf} enhanceLight={enhanceLight}
            focusedIdentity={focusedIdentity} onFocusParticipant={setFocusedIdentity} globalPinnedIdentity={globalPinnedIdentity}
            dominantSpeaker={dominantSpeaker} />
          
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
        </div>

        {/* Chat always mounted */}
        <div style={{ display: activePanel === 'chat' ? undefined : 'none' }}
             className="fixed inset-0 z-50 md:relative md:inset-auto md:z-auto md:my-2 md:mr-2 md:shrink-0">
          <ChatPanel messages={chatMsgs} localIdentity={localParticipant.identity} localName={localParticipant.name || 'Anonim'}
            onSend={sendChat} onEdit={editChat} onDelete={deleteChat} onClose={() => setActivePanel(null)}
            disabled={!isAmIAdmin && !perms.allowChat}
            polls={polls} isHost={isAmIAdmin} pub={pub} allowPolls={perms.allowPolls} onPollCreate={handlePollCreate} onPollVote={handlePollVote} onPollDelete={handlePollDelete} admins={admins} />
        </div>

        {activePanel && activePanel !== 'chat' && (
          <>
            <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setActivePanel(null)} />
            <div className="fixed inset-0 z-50 md:relative md:inset-auto md:z-auto md:my-2 md:mr-2 md:shrink-0">
              {activePanel === 'participants' && <ParticipantsPanel 
                isHost={isAmIAdmin} 
                isSuperAdmin={activeSuperAdmin === localParticipant.identity}
                roomId={roomId} 
                onClose={() => setActivePanel(null)} 
                onStopShare={stopShare} 
                admins={admins} 
                pub={pub} 
                localIdentity={localParticipant.identity} 
                onPromote={handlePromoteAction}
                onDemote={handleDemoteAction}
                globalPinnedIdentity={globalPinnedIdentity}
                onPinGlobal={(id) => { pub({ type: 'host_action', action: 'pin_global', target: id }); setGlobalPinnedIdentity(id); }}
                onUnpinGlobal={() => { pub({ type: 'host_action', action: 'unpin_global' }); setGlobalPinnedIdentity(null); }}
                focusedIdentity={focusedIdentity}
                onFocusParticipant={setFocusedIdentity}
                superAdminIdentity={activeSuperAdmin}
              />}
              {activePanel === 'info' && <InfoPanel roomId={roomId} isHost={isAmIAdmin} password={password} startTime={meetingStartTime} onClose={() => setActivePanel(null)} allowRename={isAmIAdmin || perms.allowRename} onRename={(n) => { localParticipant.setName(n); pub({ type: 'rename', identity: localParticipant.identity, name: n }); }} />}
              {activePanel === 'settings' && <SettingsPanel onClose={() => setActivePanel(null)} enhanceLight={enhanceLight} onToggleEnhanceLight={() => setEnhanceLight(v => !v)} isHost={isAmIAdmin} perms={perms} onPermsChange={broadcastPerms} onMuteAll={muteAll} onMuteVideoAll={muteVideoAll} noiseSuppression={noiseSuppression} onToggleNoiseSuppression={() => setNoiseSuppression(v => !v)} captionsOn={captionsOn} onToggleCaptions={() => setCaptionsOn(!captionsOn)} videoQuality={videoQuality} onVideoQualityChange={setVideoQuality} />}
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
        permissions={perms} isHost={isAmIAdmin} isRecording={isRecording} onRecordToggle={toggleRecord}
        onTimerClick={handleTimerClick} timerActive={!!timer} hasMicError={hasMicError} hasCamError={hasCamError} />

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
              {(isAmIAdmin) && (
                <button onClick={handleEndForEveryone} className="w-full py-3 rounded-xl text-sm font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all active:scale-95">Akhiri untuk Semua</button>
              )}
            </div>
          </div>
        </div>
      )}

      {pipWindow && createPortal(
        <PipGrid 
          onLeave={() => { window.focus(); pipWindow.close(); setPipWindow(null); setShowLeaveConfirm(true); }}
          onChat={() => { window.focus(); setActivePanel('chat'); pipWindow.close(); setPipWindow(null); }}
          onToggleMic={() => { if (!hasMicError) localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled) }}
          onToggleCam={() => { if (!hasCamError) localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled) }}
          isMicOn={localParticipant.isMicrophoneEnabled}
          isCamOn={localParticipant.isCameraEnabled}
          hasMicError={hasMicError}
          hasCamError={hasCamError}
        />, 
        pipWindow.document.body
      )}
    </div>
  );
}

import { Mic, MicOff, Video, VideoOff, MessageSquare, PhoneOff, Settings, User, LayoutGrid, TriangleAlert } from 'lucide-react';

function PipGrid({ onLeave, onChat, onToggleMic, onToggleCam, isMicOn, isCamOn, hasMicError, hasCamError }: any) {
  const [pipViewMode, setPipViewMode] = useState<'standard'|'gallery'>('standard');
  const [pipHideSelf, setPipHideSelf] = useState(false);
  const [pipHideAllVideo, setPipHideAllVideo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { localParticipant } = useLocalParticipant();
  const allTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }, { source: Track.Source.ScreenShare, withPlaceholder: false }], { onlySubscribed: false });
  
  const tracks = pipHideSelf ? allTracks.filter(t => t.participant.identity !== localParticipant.identity) : allTracks;
  const screenShareTrack = tracks.find(t => t.source === Track.Source.ScreenShare);
  const otherTracks = (pipHideAllVideo && screenShareTrack) ? [] : tracks.filter(t => t.source !== Track.Source.ScreenShare);
  const hasOtherParticipants = allTracks.some(t => t.participant.identity !== localParticipant.identity);

  return (
    <div className="fixed inset-0 overflow-hidden text-white flex flex-col bg-[#0a0a0f] group" data-lk-theme="default">
       <div className="flex-1 min-h-0 relative" onClick={() => setShowSettings(false)}>
          {screenShareTrack ? (
             <div className="flex flex-col h-full w-full bg-[#0a0a0f]">
                <div className="flex-1 overflow-hidden relative">
                   <ParticipantTile trackRef={screenShareTrack} disableSpeakingIndicator className="h-full w-full [&>video]:object-contain [&_.lk-participant-metadata]:hidden !rounded-none !border-none !shadow-none" />
                </div>
                {otherTracks.length > 0 && (
                   <div className="flex gap-1 overflow-x-auto meet-scrollbar h-20 shrink-0 p-1">
                      {otherTracks.map(t => (
                         <div key={`${t.participant.identity}-${t.source}`} className="aspect-video bg-[#121218] rounded-lg overflow-hidden shrink-0">
                            <ParticipantTile trackRef={t} disableSpeakingIndicator className="h-full w-full [&_.lk-participant-metadata]:hidden !border-none !shadow-none" />
                         </div>
                      ))}
                   </div>
                )}
             </div>
          ) : pipViewMode === 'gallery' ? (
             <div className="w-full h-full bg-[#0a0a0f]">
                <GridLayout tracks={tracks.slice(0, 16)} className="h-full w-full outline-none !p-0 !gap-0.5" style={{ height: '100%', width: '100%' }}>
                  <ParticipantTile disableSpeakingIndicator className="h-full w-full [&_.lk-participant-metadata]:hidden !rounded-none !border-none !shadow-none" />
                </GridLayout>
             </div>
          ) : (
             <div className="w-full h-full bg-[#0a0a0f]">
                <GridLayout tracks={tracks.slice(0, 9)} className="h-full w-full outline-none !p-0 !gap-0.5" style={{ height: '100%', width: '100%' }}>
                 <ParticipantTile disableSpeakingIndicator className="h-full w-full [&_.lk-participant-metadata]:hidden !rounded-none !border-none !shadow-none" />
                </GridLayout>
             </div>
          )}
       </div>
       
       {showSettings && (
         <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50">
           <div className="bg-black/70 backdrop-blur-xl rounded-2xl border border-white/10 p-3 flex flex-col gap-3 min-w-[200px] shadow-2xl animate-scale-in">
              <div className="flex justify-between items-center bg-white/5 rounded-xl p-1 gap-1">
                 <button onClick={() => setPipViewMode('standard')} className={`flex-1 flex justify-center py-1.5 rounded-lg transition-all text-xs font-medium ${pipViewMode === 'standard' ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>Fokus</button>
                 <button onClick={() => setPipViewMode('gallery')} className={`flex-1 flex justify-center py-1.5 rounded-lg transition-all text-xs font-medium ${pipViewMode === 'gallery' ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>Galeri</button>
              </div>
              {hasOtherParticipants && (
                <button onClick={() => setPipHideSelf(!pipHideSelf)} className="flex items-center gap-3 text-xs font-medium text-white/80 hover:text-white transition-all px-1">
                   <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${pipHideSelf ? 'bg-white border-white text-black' : 'border-white/30'}`}>
                     {pipHideSelf && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>}
                   </div>
                   Sembunyikan saya
                </button>
              )}
              {screenShareTrack && (
                <button onClick={() => setPipHideAllVideo(!pipHideAllVideo)} className="flex items-center gap-3 text-xs font-medium text-white/80 hover:text-white transition-all px-1">
                   <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${pipHideAllVideo ? 'bg-white border-white text-black' : 'border-white/30'}`}>
                     {pipHideAllVideo && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>}
                   </div>
                   Sembunyikan kamera
                </button>
              )}
           </div>
         </div>
       )}

       <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-y-0 translate-y-4">
          <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-1.5 rounded-full flex items-center justify-center gap-1.5 shadow-2xl">
             <button onClick={onToggleMic} disabled={hasMicError} className={`h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-full ${hasMicError ? 'bg-yellow-500/20 text-yellow-500 opacity-80 cursor-not-allowed' : isMicOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white hover:bg-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]'} transition-all`}>{hasMicError ? <TriangleAlert className="h-4 w-4" /> : isMicOn ? <Mic className="h-4 w-4"/> : <MicOff className="h-4 w-4"/>}</button>
             <button onClick={onToggleCam} disabled={hasCamError} className={`h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-full ${hasCamError ? 'bg-yellow-500/20 text-yellow-500 opacity-80 cursor-not-allowed' : isCamOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white hover:bg-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]'} transition-all`}>{hasCamError ? <TriangleAlert className="h-4 w-4" /> : isCamOn ? <Video className="h-4 w-4"/> : <VideoOff className="h-4 w-4"/>}</button>
             <div className="w-px h-5 sm:h-6 bg-white/10 mx-0.5 sm:mx-1" />
             <button onClick={onChat} className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"><MessageSquare className="h-4 w-4"/></button>
             <button onClick={() => setShowSettings(!showSettings)} className={`h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-full transition-all ${showSettings ? 'bg-white text-black shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}><Settings className="h-4 w-4"/></button>
             <div className="w-px h-5 sm:h-6 bg-white/10 mx-0.5 sm:mx-1" />
             <button onClick={onLeave} className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-400 transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)]"><PhoneOff className="h-4 w-4"/></button>
          </div>
       </div>
    </div>
  )
}
