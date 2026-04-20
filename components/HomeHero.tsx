'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, Video, ArrowRight, Shield, Users } from 'lucide-react';
import { normalizeRoomId, isValidRoomId } from '@/lib/room-id';

export function HomeHero() {
  const router = useRouter();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [useLobby, setUseLobby] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Nama tidak boleh kosong.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostName: name.trim(),
          password: usePassword && password ? password : undefined,
          lobby: useLobby,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat ruang.');
      sessionStorage.setItem(
        `lk-${data.roomId}`,
        JSON.stringify({ token: data.token, wsUrl: data.wsUrl, name: name.trim(), isHost: true })
      );
      router.push(`/room/${data.roomId}`);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan.');
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const id = normalizeRoomId(roomId);
    if (!isValidRoomId(id)) {
      setError('Room ID tidak valid.');
      return;
    }
    if (!name.trim()) {
      setError('Nama tidak boleh kosong.');
      return;
    }
    sessionStorage.setItem(
      `lk-join-${id}`,
      JSON.stringify({ name: name.trim(), password: password || undefined })
    );
    router.push(`/room/${id}`);
  }

  return (
    <section className="relative overflow-hidden">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute right-0 bottom-0 h-[400px] w-[600px] rounded-full bg-secondary/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:py-28">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* LEFT: copy */}
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Gratis &middot; Tanpa Daftar &middot; HD
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              Meeting online
              <br />
              <span className="bg-gradient-brand bg-clip-text text-transparent">
                lebih cepat
              </span>
              , tanpa ribet.
            </h1>
            <p className="mt-5 max-w-xl text-base text-ink-300 sm:text-lg leading-relaxed">
              Buat ruang rapat dalam 2 detik. Bagikan Room ID. Selesai. Langsung jalan di browser
              desktop dan mobile, tanpa install aplikasi apa pun.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Feature icon={<Users className="h-4 w-4" />} label="Hingga 50 peserta" />
              <Feature icon={<Shield className="h-4 w-4" />} label="Password & Lobby" />
              <Feature icon={<Video className="h-4 w-4" />} label="HD + Screen Share" />
            </div>
          </div>

          {/* RIGHT: card */}
          <div className="animate-slide-up">
            <div className="relative">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-brand opacity-20 blur-xl" />
              <div className="relative card border-white/10 bg-ink-800/90">
                {/* Tabs */}
                <div className="mb-6 flex rounded-xl bg-ink-900 p-1">
                  <button
                    type="button"
                    onClick={() => setMode('create')}
                    className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
                      mode === 'create'
                        ? 'bg-primary text-ink-900 shadow-lg shadow-primary/20'
                        : 'text-ink-300 hover:text-white'
                    }`}
                  >
                    Buat Meeting
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('join')}
                    className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
                      mode === 'join'
                        ? 'bg-secondary text-white shadow-lg shadow-secondary/20'
                        : 'text-ink-300 hover:text-white'
                    }`}
                  >
                    Gabung Meeting
                  </button>
                </div>

                {mode === 'create' ? (
                  <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink-200">Nama Kamu</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="cth. Budi Santoso"
                        maxLength={40}
                        className="input-field"
                        autoFocus
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={usePassword}
                          onChange={(e) => setUsePassword(e.target.checked)}
                          className="h-4 w-4 rounded border-white/20 bg-ink-900 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-ink-200">Password</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={useLobby}
                          onChange={(e) => setUseLobby(e.target.checked)}
                          className="h-4 w-4 rounded border-white/20 bg-ink-900 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-ink-200">Waiting Room</span>
                      </label>
                    </div>
                    {usePassword && (
                      <div className="animate-fade-in">
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Password ruang"
                          maxLength={64}
                          className="input-field"
                        />
                      </div>
                    )}
                    {error && (
                      <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                        {error}
                      </p>
                    )}
                    <button type="submit" disabled={loading} className="btn-primary w-full text-base py-3.5">
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" /> Membuat ruang...
                        </>
                      ) : (
                        <>
                          <Video className="h-5 w-5" /> Mulai Meeting Sekarang
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                    <p className="text-center text-xs text-ink-400">
                      Dengan melanjutkan, kamu setuju media di-stream melalui server kami.
                    </p>
                  </form>
                ) : (
                  <form onSubmit={handleJoin} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink-200">Nama Kamu</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="cth. Siti Rahma"
                        maxLength={40}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink-200">Room ID</label>
                      <input
                        type="text"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                        placeholder="cth. ABCXYZ"
                        maxLength={12}
                        className="input-field uppercase tracking-[0.3em] font-mono text-lg font-semibold"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink-200">
                        Password <span className="font-normal text-ink-400">(jika ada)</span>
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Opsional"
                        maxLength={64}
                        className="input-field"
                      />
                    </div>
                    {error && (
                      <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                        {error}
                      </p>
                    )}
                    <button type="submit" className="btn-secondary w-full text-base py-3.5">
                      <ArrowRight className="h-5 w-5" /> Gabung Meeting
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-ink-800/60 px-3 py-1.5 text-sm text-ink-200">
      <span className="text-primary">{icon}</span>
      {label}
    </span>
  );
}
