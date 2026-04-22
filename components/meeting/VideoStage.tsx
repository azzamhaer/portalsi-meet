'use client';

import { useState } from 'react';
import { useTracks, useLocalParticipant, GridLayout, ParticipantTile } from '@livekit/components-react';
import { Track } from 'livekit-client';
import Draggable from 'react-draggable';
import { Maximize2, Minimize2 } from 'lucide-react';

export function VideoStage() {
  const { localParticipant } = useLocalParticipant();
  const [focusedIdentity, setFocusedIdentity] = useState<string | null>(null);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const localCamTrack = tracks.find(
    (t) => t.participant.identity === localParticipant.identity && t.source === Track.Source.Camera
  );

  // Separate remote tracks
  let remoteTracks = tracks.filter(
    (t) => !(t.participant.identity === localParticipant.identity && t.source === Track.Source.Camera)
  );

  // If alone, show self full screen
  const isAlone = remoteTracks.length === 0;

  if (isAlone && localCamTrack) {
    return (
      <div className="relative h-full w-full flex items-center justify-center p-2">
        <div className="relative w-full h-full max-w-5xl rounded-2xl overflow-hidden shadow-glass-lg">
          <GridLayout tracks={[localCamTrack]} className="h-full w-full outline-none" style={{ height: '100%', width: '100%' }}>
            <ParticipantTile />
          </GridLayout>
        </div>
      </div>
    );
  }

  // Find focused track if set
  const focusedTrack = focusedIdentity
    ? remoteTracks.find((t) => t.participant.identity === focusedIdentity) || null
    : null;

  // Split into main view and grid
  let mainTrack = focusedTrack || (remoteTracks.length > 0 ? remoteTracks[0] : null);
  let gridTracks = remoteTracks.filter((t) => t !== mainTrack);

  // Limit grid
  if (gridTracks.length > 11) gridTracks = gridTracks.slice(0, 11);

  // If only 1 remote participant (1-on-1 call), show them big + self as PiP
  if (remoteTracks.length === 1 && mainTrack) {
    return (
      <div className="relative h-full w-full p-2">
        {/* Main video */}
        <div className="h-full w-full rounded-2xl overflow-hidden shadow-glass-lg">
          <ParticipantTile trackRef={mainTrack} className="h-full w-full" />
        </div>

        {/* Self PiP */}
        {localCamTrack && <PipOverlay trackRef={localCamTrack} onSwap={() => setFocusedIdentity(
          focusedIdentity === localParticipant.identity ? null : localParticipant.identity
        )} />}
      </div>
    );
  }

  // Multi-participant: main + sidebar/grid
  return (
    <div className="relative h-full w-full flex flex-col md:flex-row gap-2 p-2">
      {/* Main speaker */}
      {mainTrack && (
        <div className="flex-1 min-h-0 rounded-2xl overflow-hidden shadow-glass-lg relative">
          <ParticipantTile trackRef={mainTrack} className="h-full w-full" />
        </div>
      )}

      {/* Side strip - other participants */}
      {gridTracks.length > 0 && (
        <div className="flex md:flex-col gap-2 md:w-48 lg:w-56 overflow-x-auto md:overflow-y-auto md:overflow-x-hidden meet-scrollbar shrink-0">
          {gridTracks.map((tr) => (
            <div
              key={`${tr.participant.identity}-${tr.source}`}
              className="pip-container shrink-0 w-36 h-24 md:w-full md:h-32 cursor-pointer"
              onClick={() => setFocusedIdentity(tr.participant.identity)}
            >
              <ParticipantTile trackRef={tr} className="h-full w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Self PiP */}
      {localCamTrack && <PipOverlay trackRef={localCamTrack} onSwap={() => {}} />}
    </div>
  );
}

function PipOverlay({ trackRef, onSwap }: { trackRef: any; onSwap: () => void }) {
  return (
    <>
      {/* Desktop PiP */}
      <div className="hidden md:block absolute bottom-4 right-4 z-40 pip-container w-56 h-36 group" onClick={onSwap}>
        <ParticipantTile trackRef={trackRef} disableSpeakingIndicator className="h-full w-full" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Maximize2 className="h-5 w-5 text-white drop-shadow" />
        </div>
      </div>

      {/* Mobile Draggable PiP */}
      <div className="md:hidden block absolute z-40" style={{ bottom: 8, right: 8 }}>
        <Draggable bounds="parent" defaultPosition={{ x: 0, y: 0 }}>
          <div className="pip-container w-28 h-40 cursor-move touch-none" onClick={onSwap}>
            <ParticipantTile trackRef={trackRef} disableSpeakingIndicator className="h-full w-full" />
          </div>
        </Draggable>
      </div>
    </>
  );
}
