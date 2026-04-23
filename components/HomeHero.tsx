'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Loader2, ArrowRight, Eye, EyeOff, Video, Users, Shield, Zap, Globe, Sparkles } from 'lucide-react';
import { normalizeRoomId, isValidRoomId } from '@/lib/room-id';

// Floating orbs background
function FloatingOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div className="orb orb-4" />
    </div>
  );
}

// Animated counter
function AnimCounter({ end, duration = 2000, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        let start = 0;
        const step = end / (duration / 16);
        const timer = setInterval(() => {
          start += step;
          if (start >= end) { setCount(end); clearInterval(timer); }
          else setCount(Math.floor(start));
        }, 16);
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref} className="tabular-nums">{count.toLocaleString()}{suffix}</span>;
}

export function HomeHero() {
  const router = useRouter();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Nama tidak boleh kosong.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: name.trim(), password: usePassword && password ? password : undefined, lobby: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat ruang.');
      sessionStorage.setItem(`lk-${data.roomId}`, JSON.stringify({ token: data.token, wsUrl: data.wsUrl, name: name.trim(), isHost: true, password: usePassword && password ? password : undefined }));
      router.push(`/room/${data.roomId}`);
    } catch (err: any) { setError(err.message); setLoading(false); }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const id = normalizeRoomId(roomId);
    if (!isValidRoomId(id)) { setError('Room ID tidak valid.'); return; }
    if (!name.trim()) { setError('Nama tidak boleh kosong.'); return; }
    sessionStorage.setItem(`lk-join-${id}`, JSON.stringify({ name: name.trim(), password: password || undefined }));
    router.push(`/room/${id}`);
  }

  return (
    <>
      <FloatingOrbs />

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-8 px-4 sm:px-6 text-center">
        <div className="hero-badge">
          <Sparkles className="h-3.5 w-3.5" />
          <span>100% Gratis & Open Source</span>
        </div>

        <h1 className="hero-title mt-6">
          <span className="hero-title-line">Video Call</span>
          <span className="hero-title-accent">Tanpa Ribet</span>
        </h1>

        <p className="hero-subtitle mt-6 max-w-2xl mx-auto">
          Buat ruang meeting dalam hitungan detik. Tanpa install, tanpa daftar,
          langsung konek. <span className="text-white font-semibold">Sesimpel itu.</span>
        </p>
      </section>

      {/* Form Card */}
      <section className="relative z-10 max-w-lg mx-auto px-4 sm:px-6 pb-12">
        <div className="form-card">
          {/* Glow effect */}
          <div className="form-card-glow" />

          {/* Tab switcher */}
          <div className="flex p-1 bg-white/[0.04] rounded-2xl mb-8">
            <button type="button" onClick={() => setMode('create')}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${mode === 'create'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_4px_20px_rgba(16,185,129,0.3)]'
                : 'text-white/40 hover:text-white/70'}`}>
              Buat Room
            </button>
            <button type="button" onClick={() => setMode('join')}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${mode === 'join'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-[0_4px_20px_rgba(245,158,11,0.3)]'
                : 'text-white/40 hover:text-white/70'}`}>
              Join Room
            </button>
          </div>

          {mode === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-5" autoComplete="off">
              <InputField label="Nama Kamu" value={name} onChange={setName} placeholder="Mau dipanggil siapa?" maxLength={40} autoFocus />

              <div className="flex items-center gap-4 py-3 px-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <label className="flex items-center gap-2.5 cursor-pointer select-none flex-1">
                  <input type="checkbox" checked={usePassword} onChange={e => setUsePassword(e.target.checked)}
                    className="h-5 w-5 rounded-md border-2 border-white/20 bg-transparent focus:ring-0 accent-emerald-500 cursor-pointer" />
                  <span className="text-sm font-medium text-white/60">Pasang Password</span>
                </label>
                <Shield className="h-4 w-4 text-white/15" />
              </div>

              {usePassword && (
                <div className="animate-slideDown">
                  <PasswordField value={password} onChange={setPassword} showPw={showPw} togglePw={() => setShowPw(v => !v)} placeholder="Buat password..." />
                </div>
              )}

              {error && <ErrorMsg text={error} />}

              <button type="submit" disabled={loading}
                className="form-btn from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-[0_0_32px_rgba(16,185,129,0.25)] hover:shadow-[0_0_48px_rgba(16,185,129,0.4)]">
                {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Membuat...</> : <>Mulai Meeting <ArrowRight className="h-5 w-5" /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-5" autoComplete="off">
              <InputField label="Nama Kamu" value={name} onChange={setName} placeholder="Mau dipanggil siapa?" maxLength={40} autoFocus />

              <div>
                <label className="form-label">Room ID</label>
                <input type="text" value={roomId} onChange={e => setRoomId(e.target.value.toUpperCase())}
                  placeholder="ABCDEF" maxLength={12} autoComplete="off"
                  className="form-input text-center uppercase tracking-[0.35em] font-bold text-xl !py-4" />
              </div>

              <PasswordField label="Password (jika ada)" value={password} onChange={setPassword} showPw={showPw} togglePw={() => setShowPw(v => !v)} placeholder="Ketik password..." />

              {error && <ErrorMsg text={error} />}

              <button type="submit"
                className="form-btn from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 shadow-[0_0_32px_rgba(245,158,11,0.25)] hover:shadow-[0_0_48px_rgba(245,158,11,0.4)]">
                <ArrowRight className="h-5 w-5" /> Gabung Sekarang
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FeatureCard icon={<Zap className="h-5 w-5" />} title="Instan" desc="2 detik buat room. Langsung pakai." color="emerald" />
          <FeatureCard icon={<Shield className="h-5 w-5" />} title="Aman" desc="Enkripsi E2E. Password protected." color="blue" />
          <FeatureCard icon={<Globe className="h-5 w-5" />} title="Tanpa Install" desc="Buka browser, langsung jalan." color="purple" />
        </div>

        {/* Stats */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          <StatItem value={<AnimCounter end={100} suffix="%" />} label="Gratis" />
          <div className="h-8 w-px bg-white/10 hidden sm:block" />
          <StatItem value={<AnimCounter end={50} suffix="ms" />} label="Latency" />
          <div className="h-8 w-px bg-white/10 hidden sm:block" />
          <StatItem value={<AnimCounter end={256} />} label="Bit Enkripsi" />
        </div>
      </section>
    </>
  );
}

// Reusable sub-components
function InputField({ label, value, onChange, placeholder, maxLength, autoFocus }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; maxLength?: number; autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        maxLength={maxLength} autoFocus={autoFocus} autoComplete="off" className="form-input" />
    </div>
  );
}

function PasswordField({ label, value, onChange, showPw, togglePw, placeholder }: {
  label?: string; value: string; onChange: (v: string) => void; showPw: boolean; togglePw: () => void; placeholder: string;
}) {
  return (
    <div>
      {label && <label className="form-label">{label}</label>}
      <div className="relative">
        <input type={showPw ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} maxLength={64} autoComplete="off" data-1p-ignore
          className="form-input !pr-12" />
        <button type="button" onClick={togglePw}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white/60 transition-colors">
          {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

function ErrorMsg({ text }: { text: string }) {
  return <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 font-medium animate-shake">{text}</div>;
}

function FeatureCard({ icon, title, desc, color }: { icon: React.ReactNode; title: string; desc: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/10 text-emerald-400',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/10 text-blue-400',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/10 text-purple-400',
  };
  return (
    <div className={`feature-card bg-gradient-to-br ${colors[color]} border`}>
      <div className="mb-3">{icon}</div>
      <h3 className="text-base font-bold text-white/90">{title}</h3>
      <p className="text-sm text-white/40 mt-1">{desc}</p>
    </div>
  );
}

function StatItem({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl sm:text-3xl font-black text-white/90">{value}</p>
      <p className="text-xs text-white/30 font-medium uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}
