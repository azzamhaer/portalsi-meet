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
import Draggable from 'react-draggable';
import {
  RoomEvent,
  Track,
  VideoPresets,
  DisconnectReason,
  RoomOptions,
  ConnectionState,
} from 'livekit-client';
import {
  Users,
  MessageSquare,
  PhoneOff,
  X,
  Crown,
  Info,
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
      className="theme-meet h-dvh w-dvw overflow-hidden bg-[#202124] text-white flex flex-col"
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
  const participants = useParticipants();
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);

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

  return (
    <div className="flex h-full w-full flex-col overflow-hidden relative">
      {/* MAIN AREA */}
      <div className="relative flex flex-1 overflow-hidden pb-[80px]">
        {/* VIDEO GRID */}
        <div className="relative flex-1 p-4 overflow-hidden">
          <VideoStage />
        </div>

        {/* SIDEBAR - CHAT */}
        {showChat && (
          <aside className="fixed inset-0 z-50 md:relative md:inset-auto md:z-auto w-full md:w-[360px] bg-[#fff] md:bg-white text-black flex flex-col md:my-4 md:mr-4 md:rounded-2xl overflow-hidden shadow-2xl animate-slide-up md:animate-none">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-base font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Pesan dalam panggilan
              </h2>
              <button onClick={() => setShowChat(false)} className="rounded-full p-2 hover:bg-gray-100 text-gray-600 transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden bg-white text-black">
              <Chat className="h-full" />
            </div>
          </aside>
        )}

        {/* SIDEBAR - PARTICIPANTS */}
        {showParticipants && (
          <aside className="fixed inset-0 z-50 md:relative md:inset-auto md:z-auto w-full md:w-[360px] bg-[#fff] md:bg-white text-black flex flex-col md:my-4 md:mr-4 md:rounded-2xl overflow-hidden shadow-2xl animate-slide-up md:animate-none">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-base font-medium flex items-center gap-2">
                <Users className="h-4 w-4" /> Orang ({participants.length})
              </h2>
              <button
                onClick={() => setShowParticipants(false)}
                className="rounded-full p-2 hover:bg-gray-100 text-gray-600 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ParticipantList isHost={isHost} roomId={roomId} />
          </aside>
        )}
      </div>

      {/* BOTTOM CONTROLS (Google Meet Style) */}
      <BottomBar
        roomId={roomId}
        onToggleChat={() => setShowChat((v) => !v)}
        onToggleParticipants={() => setShowParticipants((v) => !v)}
        chatOpen={showChat}
        participantsOpen={showParticipants}
        onLeave={onLeave}
      />
    </div>
  );
}

function VideoStage() {
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  // Filter out local camera for PiP
  const localCamTrack = tracks.find(
    (t) => t.participant.identity === localParticipant.identity && t.source === Track.Source.Camera
  );

  let gridTracks = tracks.filter((t) => {
    if (t.participant.identity === localParticipant.identity && t.source === Track.Source.Camera) {
      return false; // separate local camera
    }
    return true;
  });

  // Limit to max 8 items on screen to prevent tiny video squares on Mobile
  if (gridTracks.length > 8) {
    gridTracks = gridTracks.slice(0, 8);
  }

  // If we are completely alone, just show our camera in the main grid
  const isAlone = gridTracks.length === 0;

  if (isAlone && localCamTrack) {
    return (
      <GridLayout tracks={tracks} className="h-full w-full outline-none" style={{ height: '100%', width: '100%' }}>
        <ParticipantTile trackRef={localCamTrack} />
      </GridLayout>
    );
  }

  return (
    <div className="relative h-full w-full bg-[#202124]">
      {gridTracks.length > 0 ? (
        <GridLayout
          tracks={gridTracks}
          className="h-full w-full outline-none"
          style={{ height: '100%', width: '100%' }}
        >
          <ParticipantTile />
        </GridLayout>
      ) : (
        <div className="flex h-full items-center justify-center text-white/50">
          Belum ada yang mengaktifkan kamera atau presentasi.
        </div>
      )}

      {localCamTrack && (
        <>
          {/* Desktop Fixed PiP (Top Right) */}
          <div className="hidden md:block absolute top-4 right-4 z-40 w-64 h-36 border border-white/10 rounded-xl overflow-hidden shadow-xl bg-[#3c4043]">
             <ParticipantTile 
                 trackRef={localCamTrack}
                 disableSpeakingIndicator
             />
          </div>

          {/* Mobile Draggable PiP (Bottom Right) */}
          <div className="md:hidden block absolute z-40">
            <Draggable bounds="parent" defaultPosition={{ x: 0, y: 0 }}>
              <div className="absolute right-2 bottom-[90px] w-28 h-40 cursor-move shadow-2xl rounded-xl overflow-hidden border border-white/20 bg-[#3c4043] touch-none">
                <ParticipantTile 
                    trackRef={localCamTrack}
                    disableSpeakingIndicator
                />
              </div>
            </Draggable>
          </div>
        </>
      )}
    </div>
  );
}

function BottomBar({
  roomId,
  onToggleChat,
  onToggleParticipants,
  chatOpen,
  participantsOpen,
  onLeave,
}: {
  roomId: string;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  chatOpen: boolean;
  participantsOpen: boolean;
  onLeave: () => void;
}) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const iv = setInterval(updateTime, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-[80px] bg-[#202124] flex items-center justify-between px-4 sm:px-6">
      {/* Left: Time and Room Name */}
      <div className="hidden md:flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-white text-base">
        <span className="font-medium tracking-wide">{time}</span>
        <span className="hidden sm:block text-white/40">|</span>
        <span className="font-medium opacity-90">{roomId}</span>
      </div>

      {/* Center: LiveKit Contol Bar */}
      <div className="flex flex-1 justify-center relative z-20">
        <ControlBar
          controls={{ microphone: true, camera: true, screenShare: true, chat: false, leave: false }}
          variation="minimal"
          className="!bg-transparent !p-0"
        />
        <button
          onClick={onLeave}
          className="ml-2 inline-flex h-11 sm:h-12 px-6 sm:px-8 items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white shadow-md active:scale-95 transition-all"
        >
          <PhoneOff className="h-5 w-5" />
        </button>
      </div>

      {/* Right: Tools */}
      <div className="hidden md:flex items-center gap-1 sm:gap-3">
        <button className="h-10 w-10 flex items-center justify-center rounded-full text-white hover:bg-[#3c4043] transition-all">
          <Info className="h-5 w-5" />
        </button>
        <button 
          onClick={onToggleParticipants}
          className={`h-10 w-10 flex items-center justify-center rounded-full transition-all ${participantsOpen ? 'bg-[#8ab4f8] text-[#202124]' : 'text-white hover:bg-[#3c4043]'}`}
        >
          <Users className="h-5 w-5" />
        </button>
        <button 
          onClick={onToggleChat}
          className={`h-10 w-10 flex items-center justify-center rounded-full transition-all ${chatOpen ? 'bg-[#8ab4f8] text-[#202124]' : 'text-white hover:bg-[#3c4043]'}`}
        >
           <MessageSquare className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile Right Tools (Compact) */}
      <div className="flex md:hidden items-center gap-1">
        <button 
          onClick={onToggleParticipants}
          className={`p-2 rounded-full ${participantsOpen ? 'text-[#8ab4f8]' : 'text-white'}`}
        >
          <Users className="h-5 w-5" />
        </button>
        <button 
          onClick={onToggleChat}
          className={`p-2 rounded-full ${chatOpen ? 'text-[#8ab4f8]' : 'text-white'}`}
        >
           <MessageSquare className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function ParticipantList({ isHost, roomId }: { isHost: boolean, roomId: string }) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  async function kickParticipant(identity: string) {
    if (!isHost) return;
    if (!confirm('Keluarkan peserta ini?')) return;
    try {
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
    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white text-black">
      {participants.map((p) => {
        const isLocal = p.identity === localParticipant.identity;
        const isTheHost = p.identity.startsWith('host-');
        const mic = p.getTrackPublication(Track.Source.Microphone);
        const cam = p.getTrackPublication(Track.Source.Camera);
        
        return (
          <div
            key={p.identity}
            className="flex items-center gap-3 p-2 group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
              {p.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate flex items-center gap-1.5 text-gray-900">
                {p.name || 'Anonim'}
                {isLocal && <span className="text-[11px] text-gray-500 font-normal">(Anda)</span>}
                {isTheHost && <Crown className="h-3.5 w-3.5 text-yellow-500" />}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusDot label="Mic" active={!!mic && !mic.isMuted} />
                <StatusDot label="Cam" active={!!cam && !cam.isMuted} />
              </div>
            </div>
            {isHost && !isLocal && !isTheHost && (
              <button
                onClick={() => kickParticipant(p.identity)}
                className="hidden group-hover:flex rounded-full p-2 text-red-500 hover:bg-red-50 transition-all"
                title="Keluarkan dari panggilan"
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
    <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-gray-300'}`} />
      {label}
    </span>
  );
}
