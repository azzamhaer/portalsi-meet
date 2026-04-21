'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Video, Lock } from 'lucide-react';
import Link from 'next/link';
import { MeetingRoom } from './MeetingRoom';

interface ConnectionInfo {
  token: string;
  wsUrl: string;
  name: string;
  isHost: boolean;
}

export function RoomClient({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'need-name' | 'need-password' | 'joining' | 'connected' | 'error' | 'not-found'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [conn, setConn] = useState<ConnectionInfo | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [hostName, setHostName] = useState<string | undefined>();

  const performJoin = useCallback(
    async (n: string, pw?: string) => {
      setState('joining');
      setError(null);
      try {
        const res = await fetch(`/api/rooms/${roomId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: n, password: pw }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 401 && data.requiresPassword) {
            setRequiresPassword(true);
            setState('need-password');
            setError('Password salah.');
            return;
          }
          if (res.status === 404) {
            setState('not-found');
            return;
          }
          throw new Error(data.error || 'Gagal bergabung.');
        }
        setConn({
          token: data.token,
          wsUrl: data.wsUrl,
          name: n,
          isHost: false,
        });
        setState('connected');
      } catch (e: any) {
        setError(e.message || 'Terjadi kesalahan.');
        setState('error');
      }
    },
    [roomId]
  );

  useEffect(() => {
    const hostData = sessionStorage.getItem(`lk-${roomId}`);
    if (hostData) {
      try {
        const parsed = JSON.parse(hostData);
        setConn(parsed);
        setName(parsed.name);
        setState('connected');
        return;
      } catch {}
    }

    const joinData = sessionStorage.getItem(`lk-join-${roomId}`);
    if (joinData) {
      try {
        const parsed = JSON.parse(joinData);
        sessionStorage.removeItem(`lk-join-${roomId}`);
        setName(parsed.name);
        performJoin(parsed.name, parsed.password);
        return;
      } catch {}
    }

    // No preset: fetch room info
    (async () => {
      try {
        const res = await fetch(`/api/rooms/${roomId}`);
        if (res.status === 404) {
          setState('not-found');
          return;
        }
        const data = await res.json();
        setRequiresPassword(Boolean(data.requiresPassword));
        setHostName(data.hostName);
        setState(data.requiresPassword ? 'need-password' : 'need-name');
      } catch {
        setState('error');
        setError('Tidak bisa memuat info ruang.');
      }
    })();
  }, [roomId, performJoin]);

  function onSubmitName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    performJoin(name.trim(), password || undefined);
  }

  if (state === 'loading' || state === 'joining') {
    return <LoadingScreen label={state === 'joining' ? 'Menghubungkan ke ruang…' : 'Memuat…'} />;
  }

  if (state === 'not-found') {
    return <ErrorScreen title="Ruang tidak ditemukan" message="Room ID salah atau meeting sudah berakhir." />;
  }

  if (state === 'error') {
    return <ErrorScreen title="Terjadi kesalahan" message={error || 'Unknown error.'} />;
  }

  if (state === 'connected' && conn) {
    return <MeetingRoom roomId={roomId} token={conn.token} wsUrl={conn.wsUrl} name={conn.name} isHost={conn.isHost} onLeave={() => router.push('/')} />;
  }

  // need-name / need-password
  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm text-ink-300 hover:text-white transition">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        <div className="card relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-secondary border-4 border-black" />
          <div className="relative">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary border-2 border-black shadow-brutal active:shadow-brutal-active">
                <Video className="h-6 w-6 text-black" />
              </div>
              <div>
                <p className="text-xs text-ink-400">Bergabung ke Ruang</p>
                <p className="font-mono text-lg font-bold tracking-widest text-primary">{roomId}</p>
              </div>
            </div>
            {hostName && <p className="mb-5 text-sm text-ink-300">Host: <span className="text-white font-medium">{hostName}</span></p>}

            <form onSubmit={onSubmitName} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-200">Nama Kamu</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  placeholder="cth. Budi"
                  maxLength={40}
                  autoFocus
                  required
                />
              </div>
              {requiresPassword && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-200 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" /> Password Ruang
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field"
                    placeholder="Masukkan password"
                    maxLength={64}
                    required
                  />
                </div>
              )}
              {error && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}
              <button type="submit" className="btn-primary w-full">
                Gabung Meeting
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <main className="min-h-dvh flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 bg-white p-6 rounded-3xl border-4 border-black shadow-brutal-lg">
        <div className="relative">
          <Loader2 className="relative h-12 w-12 animate-spin text-black" />
        </div>
        <p className="text-black font-black uppercase tracking-widest">{label}</p>
      </div>
    </main>
  );
}

function ErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <div className="card max-w-md w-full text-center !bg-[#ffeaa7]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-400 border-4 border-black shadow-brutal translate-y-[-20px]">
          <span className="text-4xl leading-none">😲</span>
        </div>
        <h1 className="text-2xl font-black text-black uppercase tracking-widest">{title}</h1>
        <p className="mt-2 font-bold text-ink-300 border-2 border-black bg-white p-2 rounded-xl">{message}</p>
        <Link href="/" className="btn-primary mt-6 w-full text-lg uppercase">
          KEMBALI KE PORTAL
        </Link>
      </div>
    </main>
  );
}
