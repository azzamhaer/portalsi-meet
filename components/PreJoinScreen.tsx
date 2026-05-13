'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, Loader2, TriangleAlert } from 'lucide-react';

interface PreJoinResult {
  micEnabled: boolean;
  camEnabled: boolean;
  hasMicError: boolean;
  hasCamError: boolean;
}

export function PreJoinScreen({ roomId, name, onJoin, isWaiting, waitingStatus }: {
  roomId: string; name: string;
  onJoin: (result: PreJoinResult) => void;
  isWaiting?: boolean;
  waitingStatus?: 'waiting' | 'rejected' | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [hasMicError, setHasMicError] = useState(false);
  const [hasCamError, setHasCamError] = useState(false);
  const [devices, setDevices] = useState<{ audio: MediaDeviceInfo[]; video: MediaDeviceInfo[] }>({ audio: [], video: [] });

  useEffect(() => {
    startPreview();
    navigator.mediaDevices?.enumerateDevices().then(all => {
      setDevices({ audio: all.filter(d => d.kind === 'audioinput'), video: all.filter(d => d.kind === 'videoinput') });
    }).catch(() => {});
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  async function startPreview() {
    let audioStream: MediaStream | null = null;
    let videoStream: MediaStream | null = null;

    try {
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicOn(true);
      setHasMicError(false);
    } catch {
      setHasMicError(true);
      setMicOn(false);
    }

    try {
      videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCamOn(true);
      setHasCamError(false);
    } catch {
      setHasCamError(true);
      setCamOn(false);
    }

    if (audioStream || videoStream) {
      const tracks = [...(audioStream?.getTracks() || []), ...(videoStream?.getTracks() || [])];
      if (tracks.length > 0) {
        const combined = new MediaStream(tracks);
        streamRef.current = combined;
        if (videoRef.current && videoStream) {
          videoRef.current.srcObject = combined;
        }
      }
    }
  }

  function toggleMic() {
    if (hasMicError) return;
    const next = !micOn;
    setMicOn(next);
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = next; });
  }

  function toggleCam() {
    if (hasCamError) return;
    const next = !camOn;
    setCamOn(next);
    streamRef.current?.getVideoTracks().forEach(t => { t.enabled = next; });
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-4" style={{ background: '#0a0a0f' }}>
      <div className="w-full max-w-4xl flex flex-col md:flex-row items-center gap-8">
        {/* LEFT: Video Preview */}
        <div className="relative w-full md:w-[60%] aspect-video bg-[#141418] rounded-3xl overflow-hidden border border-white/[0.06] shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
          {!camOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#141418] text-white/20">
              <VideoOff className="h-12 w-12 mb-2 opacity-40" />
              <p className="text-sm">Kamera mati</p>
            </div>
          )}
          {/* Name badge */}
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm text-white/90 font-medium">{name}</div>
          {/* Controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
            <button onClick={toggleMic} disabled={hasMicError}
              className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${hasMicError ? 'bg-yellow-500/20 text-yellow-500 opacity-80 cursor-not-allowed' : micOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500 text-white'}`}>
              {hasMicError ? <TriangleAlert className="h-5 w-5" /> : micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>
            <button onClick={toggleCam} disabled={hasCamError}
              className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${hasCamError ? 'bg-yellow-500/20 text-yellow-500 opacity-80 cursor-not-allowed' : camOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500 text-white'}`}>
              {hasCamError ? <TriangleAlert className="h-5 w-5" /> : camOn ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* RIGHT: Join Panel */}
        <div className="w-full md:w-[40%] text-center md:text-left">
          <h2 className="text-2xl font-bold text-white/90 mb-2">Siap bergabung?</h2>
          <p className="text-sm text-white/40 mb-6 font-mono tracking-wider">Room: {roomId}</p>

          {isWaiting ? (
            <div className="space-y-4">
              {waitingStatus === 'rejected' ? (
                <div className="bg-red-500/15 border border-red-500/20 rounded-2xl p-4 text-center">
                  <p className="text-red-400 font-semibold">Permintaan Ditolak</p>
                  <p className="text-sm text-white/40 mt-1">Host menolak akses Anda ke meeting ini.</p>
                </div>
              ) : (
                <div className="bg-[#8ab4f8]/10 border border-[#8ab4f8]/20 rounded-2xl p-6 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-[#8ab4f8] mx-auto mb-3" />
                  <p className="text-white/80 font-semibold">Menunggu persetujuan host...</p>
                  <p className="text-sm text-white/30 mt-1">Host akan menerima Anda sebentar lagi</p>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => onJoin({ micEnabled: micOn, camEnabled: camOn, hasMicError, hasCamError })}
              className="w-full py-4 rounded-2xl text-base font-bold bg-[#8ab4f8] hover:bg-[#aecbfa] text-black transition-all active:scale-95 shadow-[0_0_24px_rgba(138,180,248,0.3)]">
              Gabung Sekarang
            </button>
          )}

          {/* Device selectors */}
          <div className="mt-6 space-y-3">
            <DevSel label="Mikrofon" devices={devices.audio} icon={<Mic className="h-3.5 w-3.5" />} />
            <DevSel label="Kamera" devices={devices.video} icon={<VideoIcon className="h-3.5 w-3.5" />} />
          </div>
        </div>
      </div>
    </main>
  );
}

function DevSel({ label, devices, icon }: { label: string; devices: MediaDeviceInfo[]; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-white/30">{icon}</span>
      <select className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white/70 outline-none truncate appearance-none cursor-pointer">
        {devices.length > 0 ? devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || label}</option>) : <option>Default {label}</option>}
      </select>
    </div>
  );
}
