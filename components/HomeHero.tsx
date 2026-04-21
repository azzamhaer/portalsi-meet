'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, Video, ArrowRight, Smile } from 'lucide-react';
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
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      {/* LEFT: TEXT CONTENT */}
      <div className="text-center lg:text-left">
        <h1 className="text-5xl font-black tracking-tight sm:text-7xl !leading-[1.1] text-black">
          RAPAT<br />
          <span className="inline-block bg-primary px-4 py-1 border-4 border-black rotate-[-2deg] shadow-brutal-lg mt-2 mb-2">
            MENDADAK?
          </span>
          <br />GAS AJA!
        </h1>
        <p className="mt-8 max-w-xl text-lg text-ink-300 font-bold border-l-4 border-black pl-4 text-left mx-auto lg:mx-0">
          Buat ruang rapat dadakan dalam 2 detik. <br />
          Gratis, anti-ribet, gak perlu daftar!
        </p>
        
        <div className="mt-8 flex items-center justify-center lg:justify-start gap-4">
          <div className="h-16 w-16 bg-secondary flex items-center justify-center rounded-full border-4 border-black shadow-brutal translate-y-2 animate-bounce">
            <Smile className="h-8 w-8 text-black" />
          </div>
          <div className="h-12 w-12 bg-primary flex items-center justify-center rounded-full border-4 border-black shadow-brutal animate-bounce" style={{ animationDelay: '200ms' }}>
            <Video className="h-5 w-5 text-black" />
          </div>
        </div>
      </div>

      {/* RIGHT: ACTION FORM */}
      <div className="w-full max-w-md mx-auto relative">
        {/* Background shapes for comic pop */}
        <div className="absolute -inset-4 bg-secondary rounded-[32px] border-4 border-black shadow-brutal-lg translate-y-4 -translate-x-2 rotate-[-1deg]" />
        
        <div className="relative rounded-3xl border-4 border-black bg-white p-6 shadow-brutal z-10">
          {/* TABS */}
          <div className="mb-6 flex gap-2">
            <button
              type="button"
              onClick={() => setMode('create')}
              className={`flex-1 rounded-xl py-3 text-sm font-black border-2 border-black transition-all ${
                mode === 'create'
                  ? 'bg-primary text-black shadow-brutal translate-y-[-2px]'
                  : 'bg-white text-ink-300 hover:bg-[#f8f9fa] shadow-brutal-active'
              }`}
            >
              BUAT ROOM
            </button>
            <button
              type="button"
              onClick={() => setMode('join')}
              className={`flex-1 rounded-xl py-3 text-sm font-black border-2 border-black transition-all ${
                mode === 'join'
                  ? 'bg-secondary text-black shadow-brutal translate-y-[-2px]'
                  : 'bg-white text-ink-300 hover:bg-[#f8f9fa] shadow-brutal-active'
              }`}
            >
              JOIN ROOM
            </button>
          </div>

          {mode === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-black text-black tracking-widest uppercase">Nama Kamu</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Misal: Spiderman"
                  maxLength={40}
                  className="input-field shadow-brutal-active"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-4 py-2 border-2 border-black rounded-xl px-4 bg-[#f8f9fa]">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={usePassword}
                    onChange={(e) => setUsePassword(e.target.checked)}
                    className="h-5 w-5 rounded border-2 border-black focus:ring-0 accent-primary"
                  />
                  <span className="text-sm font-bold text-black">Password</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={useLobby}
                    onChange={(e) => setUseLobby(e.target.checked)}
                    className="h-5 w-5 rounded border-2 border-black focus:ring-0 accent-secondary"
                  />
                  <span className="text-sm font-bold text-black">Lobby</span>
                </label>
              </div>
              {usePassword && (
                <div className="animate-fade-in">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tulis password..."
                    maxLength={64}
                    className="input-field !border-secondary"
                  />
                </div>
              )}
              {error && (
                <div className="rounded-xl border-2 border-black bg-red-400 p-3 text-sm font-bold text-black shadow-brutal">
                  WOOPS! {error}
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full text-lg py-4 !bg-primary uppercase tracking-widest mt-2">
                {loading ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" /> Sedang Buat...
                  </>
                ) : (
                  <>
                    Mulai Sekarang <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-black text-black tracking-widest uppercase">Nama Kamu</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Siapa ini?"
                  maxLength={40}
                  className="input-field"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-black text-black tracking-widest uppercase">Room ID</label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  placeholder="ABCDEF"
                  maxLength={12}
                  className="input-field text-center uppercase tracking-[0.4em] font-black text-2xl !py-4"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-black text-black tracking-widest uppercase">
                  Password <span className="font-medium text-ink-400">(opsional)</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ketik rahasia..."
                  maxLength={64}
                  className="input-field"
                />
              </div>
              {error && (
                <div className="rounded-xl border-2 border-black bg-red-400 p-3 text-sm font-bold text-black shadow-brutal">
                  WOOPS! {error}
                </div>
              )}
              <button type="submit" className="btn-secondary w-full text-lg py-4 !bg-secondary uppercase tracking-widest mt-2">
                <ArrowRight className="h-6 w-6" /> LET'S GO!
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
