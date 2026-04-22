'use client';

import { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ConnectionStateToast,
} from '@livekit/components-react';
import {
  VideoPresets,
  DisconnectReason,
  RoomOptions,
} from 'livekit-client';

import type { MeetingProps, PanelType } from './meeting/types';
import { VideoStage } from './meeting/VideoStage';
import { BottomBar } from './meeting/BottomBar';
import { ChatPanel } from './meeting/ChatPanel';
import { ParticipantsPanel } from './meeting/ParticipantsPanel';
import { InfoPanel } from './meeting/InfoPanel';
import { SettingsPanel } from './meeting/SettingsPanel';

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
      className="theme-meet h-dvh w-dvw overflow-hidden text-white flex flex-col"
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
    >
      <MeetingShell roomId={roomId} isHost={isHost} password={password} onLeave={onLeave} />
      <RoomAudioRenderer />
      <ConnectionStateToast />
    </LiveKitRoom>
  );
}

function MeetingShell({ roomId, isHost, password, onLeave }: {
  roomId: string;
  isHost: boolean;
  password?: string;
  onLeave: () => void;
}) {
  const [activePanel, setActivePanel] = useState<PanelType>(null);

  // Close panel on mobile when pressing back / escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActivePanel(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // On mobile, only one panel at a time (already handled by single state)

  const renderPanel = () => {
    switch (activePanel) {
      case 'chat':
        return <ChatPanel onClose={() => setActivePanel(null)} />;
      case 'participants':
        return <ParticipantsPanel isHost={isHost} roomId={roomId} onClose={() => setActivePanel(null)} />;
      case 'info':
        return <InfoPanel roomId={roomId} isHost={isHost} password={password} onClose={() => setActivePanel(null)} />;
      case 'settings':
        return <SettingsPanel onClose={() => setActivePanel(null)} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden relative">
      {/* MAIN AREA */}
      <div className="relative flex flex-1 overflow-hidden pb-[80px]">
        {/* VIDEO */}
        <div className="relative flex-1 overflow-hidden">
          <VideoStage />
        </div>

        {/* SIDEBAR PANEL */}
        {activePanel && (
          <>
            {/* Mobile overlay backdrop */}
            <div
              className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in"
              onClick={() => setActivePanel(null)}
            />
            {/* Panel */}
            <div className="fixed inset-0 z-50 md:relative md:inset-auto md:z-auto md:my-2 md:mr-2 md:shrink-0">
              {renderPanel()}
            </div>
          </>
        )}
      </div>

      {/* BOTTOM BAR */}
      <BottomBar
        roomId={roomId}
        activePanel={activePanel}
        onPanelChange={setActivePanel}
        onLeave={onLeave}
      />
    </div>
  );
}
