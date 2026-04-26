'use client';

import { useState, useMemo, useRef } from 'react';
import { useTracks, useLocalParticipant, GridLayout, ParticipantTile, useSpeakingParticipants } from '@livekit/components-react';
import { Track } from 'livekit-client';
import Draggable from 'react-draggable';
import { Maximize2 } from 'lucide-react';
import type { ViewMode } from './BottomBar';

export function VideoStage({ viewMode, hideSelf, enhanceLight, mirrorCamera, mirroredParticipants, focusedIdentity, onFocusParticipant }: {
  viewMode: ViewMode; hideSelf: boolean; enhanceLight: boolean; mirrorCamera?: boolean; mirroredParticipants: Set<string>;
  focusedIdentity: string | null; onFocusParticipant: (id: string | null) => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const activeSpeakers = useSpeakingParticipants();

  const CustomTile = (props: any) => {
    const id = props.trackRef?.participant?.identity;
    const isRemoteMirrored = id && id !== localParticipant.identity && mirroredParticipants.has(id);
    return <ParticipantTile {...props} className={isRemoteMirrored ? `mirror-remote-cam ${props.className || ''}` : props.className} />;
  };

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
        {mirrorCamera && <style>{`.lk-participant-tile[data-lk-local-participant="true"] video { transform: rotateY(0deg) !important; }`}</style>}
        {mirroredParticipants.size > 0 && <style>{`.mirror-remote-cam video { transform: rotateY(180deg) !important; }`}</style>}
        <div className="relative w-full h-full max-w-5xl rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <GridLayout tracks={[localCam]} className="h-full w-full outline-none" style={{ height: '100%', width: '100%' }}>
            <CustomTile />
          </GridLayout>
        </div>
      </div>
    );
  }

  if (viewMode === 'gallery') {
    const allTracks = hideSelf ? remoteTracks : tracks;
    return (
      <div className={`h-full w-full p-2 ${fc}`}>
        {mirrorCamera && <style>{`.lk-participant-tile[data-lk-local-participant="true"] video { transform: rotateY(0deg) !important; }`}</style>}
        {mirroredParticipants.size > 0 && <style>{`.mirror-remote-cam video { transform: rotateY(180deg) !important; }`}</style>}
        <GridLayout tracks={allTracks.slice(0, 16)} className="h-full w-full outline-none" style={{ height: '100%', width: '100%' }}>
          <CustomTile />
        </GridLayout>
      </div>
    );
  }

  // === SPEAKER / STANDARD — determine main track ===
  // Priority: screen share > clicked participant > first remote
  const activeSpeakerId = activeSpeakers.length > 0 ? activeSpeakers[0].identity : null;
  const mainTrack = screenShareTrack
    || (focusedIdentity ? remoteTracks.find(t => t.participant.identity === focusedIdentity) : null)
    || (activeSpeakerId ? remoteTracks.find(t => t.participant.identity === activeSpeakerId) : null)
    || (remoteTracks.length > 0 ? remoteTracks[0] : null);

  const stripTracks = remoteTracks.filter(t => t !== mainTrack).slice(0, 11);

  // 1-on-1
  if (remoteTracks.length === 1 && mainTrack) {
    return (
      <div className={`relative h-full w-full p-2 ${fc}`}>
        {mirrorCamera && <style>{`.lk-participant-tile[data-lk-local-participant="true"] video { transform: rotateY(0deg) !important; }`}</style>}
        {mirroredParticipants.size > 0 && <style>{`.mirror-remote-cam video { transform: rotateY(180deg) !important; }`}</style>}
        <div className="h-full w-full rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <CustomTile trackRef={mainTrack} className="h-full w-full" />
        </div>
        {!hideSelf && localCam && <Pip trackRef={localCam} onClick={() => onFocusParticipant(null)} mirrorCamera={mirrorCamera} />}
      </div>
    );
  }

  // Small group standard
  if (viewMode === 'standard' && remoteTracks.length <= 4 && !screenShareTrack && !focusedIdentity) {
    const allTracks = hideSelf ? remoteTracks : tracks;
    return (
      <div className={`h-full w-full p-2 ${fc}`}>
        {mirrorCamera && <style>{`.lk-participant-tile[data-lk-local-participant="true"] video { transform: rotateY(0deg) !important; }`}</style>}
        {mirroredParticipants.size > 0 && <style>{`.mirror-remote-cam video { transform: rotateY(180deg) !important; }`}</style>}
        <GridLayout tracks={allTracks.slice(0, 9)} className="h-full w-full outline-none" style={{ height: '100%', width: '100%' }}>
          <CustomTile />
        </GridLayout>
      </div>
    );
  }

  // Main + side strip
  return (
    <div className={`relative h-full w-full flex flex-col md:flex-row gap-2 p-2 ${fc}`}>
      {mirrorCamera && <style>{`.lk-participant-tile[data-lk-local-participant="true"] video { transform: rotateY(0deg) !important; }`}</style>}
      {mirroredParticipants.size > 0 && <style>{`.mirror-remote-cam video { transform: rotateY(180deg) !important; }`}</style>}
      {mainTrack && (
        <div className="flex-1 min-h-0 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative">
          <CustomTile trackRef={mainTrack} className="h-full w-full" />
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
              className="pip-container shrink-0 w-36 h-24 md:w-full md:h-32 cursor-pointer hover:ring-2 hover:ring-[#8ab4f8]/40 rounded-2xl transition-all overflow-hidden relative"
              onClick={() => onFocusParticipant(tr.participant.identity === focusedIdentity ? null : tr.participant.identity)}>
              <CustomTile trackRef={tr} className="h-full w-full" />
            </div>
          ))}
        </div>
      )}
      {!hideSelf && localCam && <Pip trackRef={localCam} onClick={() => onFocusParticipant(null)} mirrorCamera={mirrorCamera} />}
    </div>
  );
}

function Pip({ trackRef, onClick, mirrorCamera }: { trackRef: any; onClick: () => void; mirrorCamera?: boolean }) {
  const nodeRefDesktop = useRef(null);
  const nodeRefMobile = useRef(null);
  const winW = typeof window !== 'undefined' ? window.innerWidth : 1000;
  const winH = typeof window !== 'undefined' ? window.innerHeight : 800;
  
  return (
    <>
      <div className="hidden md:block fixed inset-0 z-40 pointer-events-none pb-[80px]">
        <Draggable bounds="parent" defaultPosition={{x: winW - 250, y: winH - 260}} nodeRef={nodeRefDesktop}>
          <div ref={nodeRefDesktop} className="absolute top-0 left-0 pip-container group cursor-move pointer-events-auto rounded-2xl overflow-hidden shadow-xl ring-2 ring-white/10 hover:shadow-2xl transition-shadow" onClick={onClick} style={{ touchAction: 'none', width: '224px', height: '144px', minWidth: '150px', minHeight: '100px', maxWidth: '400px', maxHeight: '300px', resize: 'both', aspectRatio: '16/9' }}>
            <div style={{ width: '100%', height: '100%' }}>
              <ParticipantTile trackRef={trackRef} disableSpeakingIndicator className="h-full w-full pointer-events-none" />
            </div>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
              <Maximize2 className="h-6 w-6 text-white drop-shadow" />
            </div>
          </div>
        </Draggable>
      </div>
      <div className="md:hidden fixed inset-0 z-40 pointer-events-none pb-[80px]">
        <Draggable bounds="parent" defaultPosition={{x: winW - 130, y: winH - 250}} nodeRef={nodeRefMobile}>
          <div ref={nodeRefMobile} className="absolute top-0 left-0 pip-container cursor-move pointer-events-auto overflow-hidden rounded-xl shadow-lg ring-2 ring-white/10" onClick={onClick} style={{ touchAction: 'none', width: '112px', height: '160px', minWidth: '80px', minHeight: '120px', maxWidth: '200px', maxHeight: '280px', resize: 'both', aspectRatio: '7/10' }}>
            <div style={{ width: '100%', height: '100%' }}>
              <ParticipantTile trackRef={trackRef} disableSpeakingIndicator className="h-full w-full pointer-events-none [&>video]:object-cover" />
            </div>
          </div>
        </Draggable>
      </div>
    </>
  );
}
