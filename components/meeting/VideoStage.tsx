'use client';

import { useState, useMemo } from 'react';
import { useTracks, useLocalParticipant, GridLayout, ParticipantTile } from '@livekit/components-react';
import { Track } from 'livekit-client';
import Draggable from 'react-draggable';
import { Maximize2 } from 'lucide-react';
import type { ViewMode } from './BottomBar';

export function VideoStage({ viewMode, hideSelf, enhanceLight, focusedIdentity, onFocusParticipant }: {
  viewMode: ViewMode; hideSelf: boolean; enhanceLight: boolean;
  focusedIdentity: string | null; onFocusParticipant: (id: string | null) => void;
}) {
  const { localParticipant } = useLocalParticipant();

  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }, { source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: false }
  );

  const localCam = tracks.find(t => t.participant.identity === localParticipant.identity && t.source === Track.Source.Camera);
  const screenShareTrack = tracks.find(t => t.source === Track.Source.ScreenShare);
  let remoteTracks = tracks.filter(t => !(t.participant.identity === localParticipant.identity && t.source === Track.Source.Camera));
  const isAlone = remoteTracks.length === 0;
  const fc = enhanceLight ? 'video-enhance-light' : '';

  // === ALONE: full screen self ===
  if (isAlone && localCam) {
    return (
      <div className={`relative h-full w-full flex items-center justify-center p-2 ${fc}`}>
        <div className="relative w-full h-full max-w-5xl rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <GridLayout tracks={[localCam]} className="h-full w-full outline-none" style={{ height: '100%', width: '100%' }}>
            <ParticipantTile />
          </GridLayout>
        </div>
      </div>
    );
  }

  // === GALLERY VIEW ===
  if (viewMode === 'gallery') {
    const allTracks = hideSelf ? remoteTracks : tracks;
    return (
      <div className={`h-full w-full p-2 ${fc}`}>
        <GridLayout tracks={allTracks.slice(0, 16)} className="h-full w-full outline-none" style={{ height: '100%', width: '100%' }}>
          <ParticipantTile />
        </GridLayout>
      </div>
    );
  }

  // === SPEAKER / STANDARD — determine main track ===
  // Priority: screen share > clicked participant > first remote
  const mainTrack = screenShareTrack
    || (focusedIdentity ? remoteTracks.find(t => t.participant.identity === focusedIdentity) : null)
    || (remoteTracks.length > 0 ? remoteTracks[0] : null);

  const stripTracks = remoteTracks.filter(t => t !== mainTrack).slice(0, 11);

  // 1-on-1
  if (remoteTracks.length === 1 && mainTrack) {
    return (
      <div className={`relative h-full w-full p-2 ${fc}`}>
        <div className="h-full w-full rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <ParticipantTile trackRef={mainTrack} className="h-full w-full" />
        </div>
        {!hideSelf && localCam && <Pip trackRef={localCam} onClick={() => onFocusParticipant(null)} />}
      </div>
    );
  }

  // Small group standard
  if (viewMode === 'standard' && remoteTracks.length <= 4 && !screenShareTrack && !focusedIdentity) {
    const allTracks = hideSelf ? remoteTracks : tracks;
    return (
      <div className={`h-full w-full p-2 ${fc}`}>
        <GridLayout tracks={allTracks.slice(0, 9)} className="h-full w-full outline-none" style={{ height: '100%', width: '100%' }}>
          <ParticipantTile />
        </GridLayout>
      </div>
    );
  }

  // Main + side strip
  return (
    <div className={`relative h-full w-full flex flex-col md:flex-row gap-2 p-2 ${fc}`}>
      {mainTrack && (
        <div className="flex-1 min-h-0 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative">
          <ParticipantTile trackRef={mainTrack} className="h-full w-full" />
          {screenShareTrack && (
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-white/80 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              {mainTrack.participant.name || 'Peserta'} sedang berbagi layar
            </div>
          )}
        </div>
      )}
      {stripTracks.length > 0 && (
        <div className="flex md:flex-col gap-2 md:w-48 lg:w-56 overflow-x-auto md:overflow-y-auto md:overflow-x-hidden meet-scrollbar shrink-0">
          {stripTracks.map(tr => (
            <div key={`${tr.participant.identity}-${tr.source}`}
              className="pip-container shrink-0 w-36 h-24 md:w-full md:h-32 cursor-pointer hover:ring-2 hover:ring-[#8ab4f8]/40 rounded-2xl transition-all"
              onClick={() => onFocusParticipant(tr.participant.identity === focusedIdentity ? null : tr.participant.identity)}>
              <ParticipantTile trackRef={tr} className="h-full w-full" />
            </div>
          ))}
        </div>
      )}
      {!hideSelf && localCam && <Pip trackRef={localCam} onClick={() => onFocusParticipant(null)} />}
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
