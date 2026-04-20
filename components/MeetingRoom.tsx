'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  LiveKitRoom,
  useRoomContext,
  useParticipants,
  useLocalParticipant,
  RoomAudioRenderer,
  useTracks,
  GridLayout,
  ParticipantTile,
  ControlBar,
  Chat,
  ConnectionStateToast,
} from '@livekit/components-react';
import {
  RoomEvent,
  Track,
  VideoPresets,
  DisconnectReason,
  RoomOptions,
  ConnectionState,
} from 'livekit-client';
import {
  Copy,
  Check,
  Users,
  MessageSquare,
  PhoneOff,
  X,
  Crown,
} from 'lucide-react';

interface Props {
  roomId: string;
  token: string;
  wsUrl: string;
  name: string;
  isHost: boolean;
  onLeave: () => void;
}

const roomOptions: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  publishDefaults: {
    // VP8 + simulcast 3 layer = kompatibilitas universal + adaptive bitrate
    videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360, VideoPresets.h720],
    videoCodec: 'vp8',
    simulcast: true,
    dtx: true,
    red: true,
  },
  videoCaptureDefaults: {
    resolution: VideoPresets.h720.resolution,
    facingMode: 'user',
  },
  audioCaptureDefaults: {
    autoGainControl: true,
    echoCancellation: true,
    noiseSuppression: true,
  },
  stopLocalTrackOnUnpublish: true,
  reconnectPolicy: {
    nextRetryDelayInMs: (ctx) => Math.min(1000 * Math.pow(2, ctx.retryCount), 10000),
  },
};

export function MeetingRoom({ roomId, token, wsUrl, name, isHost, onLeave }: Props) {
  const [connected, setConnected] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);

  if (!wsUrl) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-4">
        <div className="card max-w-md text-center">
          <h2 className="text-xl font-bold text-red-400">Konfigurasi Bermasalah</h2>
          <p className="mt-2 text-ink-300">NEXT_PUBLIC_LIVEKIT_URL belum diset.</p>
        </div>
      </main>
    );
  }

  if (fatalError) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-4">
        <div className="card max-w-md text-center">
          <h2 className="text-xl font-bold text-red-400">Koneksi Gagal</h2>
          <p className="mt-2 text-ink-300">{fatalError}</p>
          <button className="btn-primary mt-6 w-full" onClick={onLeave}>
            Kembali ke Beranda
          </button>
        </div>
      </main>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={wsUrl}
      connect={true}
      options={roomOptions}
      video={true}
      audio={true}
      data-lk-theme="default"
      onConnected={() => setConnected(true)}
      onDisconnected={(reason) => {
        if (
          reason === DisconnectReason.SERVER_SHUTDOWN ||
          reason === DisconnectReason.PARTICIPANT_REMOVED ||
          reason === DisconnectReason.ROOM_DELETED
        ) {
          onLeave();
        }
      }}
      onError={(err) => {
        setFatalError(err.message);
      }}
      className="min-h-dvh !bg-ink-900"
    >
      <MeetingShell roomId={roomId} isHost={isHost} onLeave={onLeave} />
      <RoomAudioRenderer />
      <ConnectionStateToast />
    </LiveKitRoom>
  );
}

function MeetingShell({
  roomId,
  isHost,
  onLeave,
}: {
  roomId: string;
  isHost: boolean;
  onLeave: () => void;
}) {
  const room = useRoomContext();
  const participants = useParticipants();
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-close panels on mobile when opening the other
  useEffect(() => {
    if (showChat && showParticipants && window.innerWidth < 768) {
      setShowParticipants(false);
    }
  }, [showChat]);

  useEffect(() => {
    if (showParticipants && showChat && window.innerWidth < 768) {
      setShowChat(false);
    }
  }, [showParticipants]);

  const copyRoomId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [roomId]);

  const leave = useCallback(async () => {
    try {
      await room.disconnect();
    } catch {}
    onLeave();
  }, [room, onLeave]);

  return (
    <div className="flex min-h-dvh flex-col bg-ink-900">
      {/* TOP BAR */}
      <header className="flex items-center justify-between border-b border-white/5 bg-ink-800/60 backdrop-blur-xl px-3 py-2.5 sm:px-5 sm:py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-brand">
            <span className="text-ink-900 font-black">P</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold truncate">PortalSI Meet</h1>
              {isHost && (
                <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 border border-primary/30 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  <Crown className="h-2.5 w-2.5" /> Host
                </span>
              )}
            </div>
            <button
              onClick={copyRoomId}
              className="group flex items-center gap-1.5 text-xs text-ink-300 hover:text-primary transition"
            >
              <span className="font-mono tracking-widest font-bold">{roomId}</span>
              {copied ? (
                <Check className="h-3 w-3 text-secondary" />
              ) : (
                <Copy className="h-3 w-3 opacity-60 group-hover:opacity-100" />
              )}
              <span className="text-ink-500">· {copied ? 'Tersalin!' : 'Klik untuk salin'}</span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-800 px-2.5 py-1.5">
            <Users className="h-3.5 w-3.5 text-secondary" />
            <span className="text-xs font-medium">{participants.length}</span>
          </div>
          <ConnectionBadge />
        </div>
      </header>

      {/* MAIN AREA */}
      <div className="relative flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="relative flex-1 overflow-hidden p-2 sm:p-4">
            <VideoStage />
          </div>

          {/* BOTTOM CONTROLS */}
          <BottomBar
            onToggleChat={() => setShowChat((v) => !v)}
            onToggleParticipants={() => setShowParticipants((v) => !v)}
            chatOpen={showChat}
            participantsOpen={showParticipants}
            onLeave={leave}
            isHost={isHost}
          />
        </div>

        {/* SIDEBAR - CHAT */}
        {showChat && (
          <aside className="fixed md:relative inset-0 md:inset-auto z-30 md:z-auto w-full md:w-[360px] border-l border-white/5 bg-ink-800 backdrop-blur-xl md:flex flex-col animate-slide-up md:animate-none">
            <div className="flex items-center justify-between border-b border-white/5 p-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" /> Chat
              </h2>
              <button onClick={() => setShowChat(false)} className="rounded-lg p-1.5 hover:bg-white/5">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <Chat className="h-full" />
            </div>
          </aside>
        )}

        {/* SIDEBAR - PARTICIPANTS */}
        {showParticipants && (
          <aside className="fixed md:relative inset-0 md:inset-auto z-30 md:z-auto w-full md:w-[320px] border-l border-white/5 bg-ink-800 backdrop-blur-xl flex flex-col animate-slide-up md:animate-none">
            <div className="flex items-center justify-between border-b border-white/5 p-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-secondary" /> Peserta ({participants.length})
              </h2>
              <button
                onClick={() => setShowParticipants(false)}
                className="rounded-lg p-1.5 hover:bg-white/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ParticipantList isHost={isHost} />
          </aside>
        )}
      </div>
    </div>
  );
}

function VideoStage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <GridLayout
      tracks={tracks}
      className="h-full"
      style={{ height: '100%' }}
    >
      <ParticipantTile />
    </GridLayout>
  );
}

function ConnectionBadge() {
  const room = useRoomContext();
  const [state, setState] = useState<ConnectionState>(room.state);

  useEffect(() => {
    const update = () => setState(room.state);
    room.on(RoomEvent.ConnectionStateChanged, update);
    return () => {
      room.off(RoomEvent.ConnectionStateChanged, update);
    };
  }, [room]);

  const config: Record<ConnectionState, { label: string; color: string; dot: string }> = {
    [ConnectionState.Disconnected]: { label: 'Offline', color: 'text-red-300 border-red-500/30 bg-red-500/10', dot: 'bg-red-400' },
    [ConnectionState.Connecting]: { label: 'Menghubungkan', color: 'text-primary border-primary/30 bg-primary/10', dot: 'bg-primary animate-pulse' },
    [ConnectionState.Connected]: { label: 'Stabil', color: 'text-secondary border-secondary/30 bg-secondary/10', dot: 'bg-secondary' },
    [ConnectionState.Reconnecting]: { label: 'Menyambung ulang', color: 'text-primary border-primary/30 bg-primary/10', dot: 'bg-primary animate-pulse' },
    [ConnectionState.SignalReconnecting]: { label: 'Sinkronisasi', color: 'text-primary border-primary/30 bg-primary/10', dot: 'bg-primary animate-pulse' },
  };

  const c = config[state];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${c.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      <span className="hidden sm:inline">{c.label}</span>
    </span>
  );
}

function BottomBar({
  onToggleChat,
  onToggleParticipants,
  chatOpen,
  participantsOpen,
  onLeave,
  isHost,
}: {
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  chatOpen: boolean;
  participantsOpen: boolean;
  onLeave: () => void;
  isHost: boolean;
}) {
  return (
    <div className="relative z-10 border-t border-white/5 bg-ink-800/80 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2 px-2 py-2 sm:px-4 sm:py-3">
        {/* Center LiveKit controls */}
        <div className="flex-1 flex justify-center">
          <ControlBar
            controls={{ microphone: true, camera: true, screenShare: true, chat: false, leave: false }}
            variation="minimal"
            className="!bg-transparent !border-none"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <ToolButton onClick={onToggleParticipants} active={participantsOpen} label="Peserta">
            <Users className="h-5 w-5" />
          </ToolButton>
          <ToolButton onClick={onToggleChat} active={chatOpen} label="Chat">
            <MessageSquare className="h-5 w-5" />
          </ToolButton>
          <button
            onClick={onLeave}
            className="inline-flex items-center gap-2 rounded-xl bg-red-500 hover:bg-red-600 px-3 py-2.5 font-medium text-white transition active:scale-95"
            aria-label="Keluar"
          >
            <PhoneOff className="h-5 w-5" />
            <span className="hidden sm:inline text-sm">Keluar</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ToolButton({
  children,
  onClick,
  active,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-xl p-2.5 transition active:scale-95 ${
        active ? 'bg-primary text-ink-900' : 'bg-ink-700 hover:bg-ink-600 text-ink-100'
      }`}
    >
      {children}
    </button>
  );
}

function ParticipantList({ isHost }: { isHost: boolean }) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  async function kickParticipant(identity: string) {
    if (!isHost) return;
    if (!confirm('Keluarkan peserta ini?')) return;
    try {
      const roomId = window.location.pathname.split('/').pop();
      await fetch(`/api/rooms/${roomId}/kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity }),
      });
    } catch (e) {
      console.error('[kick]', e);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      {participants.map((p) => {
        const isLocal = p.identity === localParticipant.identity;
        const isTheHost = p.identity.startsWith('host-');
        const mic = p.getTrackPublication(Track.Source.Microphone);
        const cam = p.getTrackPublication(Track.Source.Camera);
        return (
          <div
            key={p.identity}
            className="flex items-center gap-3 rounded-xl border border-white/5 bg-ink-900/60 p-2.5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-brand text-ink-900 font-bold text-sm">
              {p.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate flex items-center gap-1.5">
                {p.name || 'Anonim'}
                {isLocal && <span className="text-xs text-ink-400">(kamu)</span>}
                {isTheHost && <Crown className="h-3 w-3 text-primary" />}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusDot label="Mic" active={!!mic && !mic.isMuted} />
                <StatusDot label="Cam" active={!!cam && !cam.isMuted} />
              </div>
            </div>
            {isHost && !isLocal && !isTheHost && (
              <button
                onClick={() => kickParticipant(p.identity)}
                className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10 transition"
                title="Keluarkan peserta"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatusDot({ label, active }: { label: string; active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-ink-400">
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-secondary' : 'bg-ink-500'}`} />
      {label}
    </span>
  );
}
