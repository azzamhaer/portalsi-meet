'use client';

import { useState } from 'react';
import { useTracks, useLocalParticipant, GridLayout, ParticipantTile } from '@livekit/components-react';
import { Track } from 'livekit-client';
import Draggable from 'react-draggable';
import { Maximize2 } from 'lucide-react';
import type { ViewMode } from './BottomBar';

export function VideoStage({ viewMode, hideSelf, enhanceLight }: {
  viewMode: ViewMode;
  hideSelf: boolean;
  enhanceLight: boolean;
}) {
  const { localParticipant } = useLocalParticipant();
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }, { source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: false }
  );

  const localCam = tracks.find(t => t.participant.identity === localParticipant.identity && t.source === Track.Source.Camera);
  let remoteTracks = tracks.filter(t => !(t.participant.identity === localParticipant.identity && t.source === Track.Source.Camera));
  const isAlone = remoteTracks.length === 0;
  const filterClass = enhanceLight ? 'video-enhance-light' : '';

  // === ALONE: full screen self ===
  if (isAlone && localCam) {
    return (
      <div className={`relative h-full w-full flex items-center justify-center p-2 ${filterClass}`}>
        <div className="relative w-full h-full max-w-5xl rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <GridLayout tracks={[localCam]} className="h-full w-full outline-none" style={{ height: '100%', width: '100%' }}>
            <ParticipantTile />
          </GridLayout>
        </div>
      </div>
    );
  }

  // === GALLERY VIEW: equal grid for everyone ===
  if (viewMode === 'gallery') {
    const allTracks = hideSelf ? remoteTracks : tracks;
    return (
      <div className={`h-full w-full p-2 ${filterClass}`}>
        <GridLayout tracks={allTracks.slice(0, 16)} className="h-full w-full outline-none" style={{ height: '100%', width: '100%' }}>
          <ParticipantTile />
        </GridLayout>
      </div>
    );
  }

  // === SPEAKER VIEW: focused speaker + strip ===
  const focused = focusedId ? remoteTracks.find(t => t.participant.identity === focusedId) : null;
  const mainTrack = focused || (remoteTracks.length > 0 ? remoteTracks[0] : null);
  const stripTracks = remoteTracks.filter(t => t !== mainTrack).slice(0, 11);

  // 1-on-1
  if (remoteTracks.length === 1 && mainTrack) {
    return (
      <div className={`relative h-full w-full p-2 ${filterClass}`}>
        <div className="h-full w-full rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <ParticipantTile trackRef={mainTrack} className="h-full w-full" />
        </div>
        {!hideSelf && localCam && <Pip trackRef={localCam} onClick={() => setFocusedId(null)} />}
      </div>
    );
  }

  // Standard or Speaker with multiple participants
  if (viewMode === 'standard' && remoteTracks.length <= 4) {
    // Small group: grid layout
    const allTracks = hideSelf ? remoteTracks : tracks;
    return (
      <div className={`h-full w-full p-2 ${filterClass}`}>
        <GridLayout tracks={allTracks.slice(0, 9)} className="h-full w-full outline-none" style={{ height: '100%', width: '100%' }}>
          <ParticipantTile />
        </GridLayout>
      </div>
    );
  }

  // Speaker / Standard with many participants: main + side strip
  return (
    <div className={`relative h-full w-full flex flex-col md:flex-row gap-2 p-2 ${filterClass}`}>
      {mainTrack && (
        <div className="flex-1 min-h-0 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative">
          <ParticipantTile trackRef={mainTrack} className="h-full w-full" />
        </div>
      )}
      {stripTracks.length > 0 && (
        <div className="flex md:flex-col gap-2 md:w-48 lg:w-56 overflow-x-auto md:overflow-y-auto md:overflow-x-hidden meet-scrollbar shrink-0">
          {stripTracks.map(tr => (
            <div key={`${tr.participant.identity}-${tr.source}`}
              className="pip-container shrink-0 w-36 h-24 md:w-full md:h-32 cursor-pointer"
              onClick={() => setFocusedId(tr.participant.identity)}>
              <ParticipantTile trackRef={tr} className="h-full w-full" />
            </div>
          ))}
        </div>
      )}
      {!hideSelf && localCam && <Pip trackRef={localCam} onClick={() => {}} />}
    </div>
  );
}

function Pip({ trackRef, onClick }: { trackRef: any; onClick: () => void }) {
  return (
    <>
      <div className="hidden md:block absolute bottom-4 right-4 z-40 pip-container w-56 h-36 group" onClick={onClick}>
        <ParticipantTile trackRef={trackRef} disableSpeakingIndicator className="h-full w-full" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Maximize2 className="h-5 w-5 text-white drop-shadow" />
        </div>
      </div>
      <div className="md:hidden block absolute z-40" style={{ bottom: 8, right: 8 }}>
        <Draggable bounds="parent" defaultPosition={{ x: 0, y: 0 }}>
          <div className="pip-container w-28 h-40 cursor-move touch-none" onClick={onClick}>
            <ParticipantTile trackRef={trackRef} disableSpeakingIndicator className="h-full w-full" />
          </div>
        </Draggable>
      </div>
    </>
  );
}
