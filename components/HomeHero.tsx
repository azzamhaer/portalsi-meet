'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, ArrowRight, Eye, EyeOff, Video, Shield, Zap, Lock } from 'lucide-react';
import { normalizeRoomId, isValidRoomId } from '@/lib/room-id';

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
  
  const [createMode, setCreateMode] = useState<'instant' | 'later' | 'schedule'>('instant');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [createdRoomInfo, setCreatedRoomInfo] = useState<{ id: string, password?: string, url: string, scheduledFor?: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (createdRoomInfo) {
      navigator.clipboard.writeText(createdRoomInfo.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Nama tidak boleh kosong.'); return; }
    
    let scheduledFor: number | undefined;
    if (createMode === 'schedule') {
      if (!scheduledDate || !scheduledTime) { setError('Pilih tanggal dan waktu rapat.'); return; }
      scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`).getTime();
      if (scheduledFor < Date.now()) { setError('Waktu rapat tidak boleh di masa lalu.'); return; }
    }

    setLoading(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: name.trim(), password: usePassword && password ? password : undefined, lobby: false, scheduledFor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat ruang.');
      sessionStorage.setItem(`lk-${data.roomId}`, JSON.stringify({ token: data.token, wsUrl: data.wsUrl, name: name.trim(), isHost: true, password: usePassword && password ? password : undefined }));
      
      if (createMode === 'instant') {
        router.push(`/room/${data.roomId}`);
      } else {
        setLoading(false);
        setCreatedRoomInfo({ 
          id: data.roomId, 
          password: usePassword && password ? password : undefined, 
          url: window.location.origin + `/room/${data.roomId}`,
          scheduledFor
        });
      }
    } catch (err: any) { setError(err.message); setLoading(false); }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const id = normalizeRoomId(roomId);
    if (!isValidRoomId(id)) { setError('Room ID tidak valid.'); return; }
    if (!name.trim()) { setError('Nama tidak boleh kosong.'); return; }
    sessionStorage.setItem(`lk-join-${id}`, JSON.stringify({ name: name.trim() }));
    router.push(`/room/${id}`);
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-12 sm:py-20">
      <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">

        {/* LEFT — Copy */}
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-[1.15] tracking-tight">
            Buat video meeting<br />
            <span className="hp-gradient-text">tercepat dan tersimpel yang pernah ada.</span>
          </h1>
          <p className="mt-5 text-lg text-gray-500 leading-relaxed max-w-md">
            Buat atau gabung meeting dalam hitungan detik. Gratis, tanpa perlu install atau daftar akun.
          </p>

          {/* Feature pills */}
          <div className="mt-8 flex flex-wrap gap-3">
            <Pill icon={<Zap className="h-3.5 w-3.5" />} text="Instan" />
            <Pill icon={<Shield className="h-3.5 w-3.5" />} text="Terenkripsi" />
            <Pill icon={<Video className="h-3.5 w-3.5" />} text="HD Video" />
          </div>
        </div>

        {/* RIGHT — Form */}
        <div>
          <div className="hp-card">
            {/* Tab switcher */}
            <div className="flex border-b border-gray-100 mb-6">
              <button type="button" onClick={() => { setMode('create'); setError(null); }}
                className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-colors ${mode === 'create' ? 'border-dove-green text-dove-green' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                Buat Meeting
              </button>
              <button type="button" onClick={() => { setMode('join'); setError(null); }}
                className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-colors ${mode === 'join' ? 'border-dove-orange text-dove-orange' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                Gabung Meeting
              </button>
            </div>

            {mode === 'create' ? (
              createdRoomInfo ? (
                <div className="space-y-4 animate-scale-in">
                  <div className="text-center mb-4">
                    <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                      <Shield className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Rapat Berhasil Dibuat</h3>
                    {createdRoomInfo.scheduledFor && (
                      <p className="text-sm text-gray-500 mt-1">Dijadwalkan untuk: {new Date(createdRoomInfo.scheduledFor).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="hp-label">Link Rapat (Bagikan ini)</label>
                    <div className="flex items-center mt-1">
                      <input type="text" readOnly value={createdRoomInfo.url} className="hp-input w-full flex-1 rounded-r-none border-r-0 text-sm font-mono text-gray-600" />
                      <button type="button" onClick={handleCopy} className="hp-btn hp-btn-green !w-auto !mt-0 rounded-l-none px-4 shrink-0 shadow-none h-[42px] sm:h-[46px] border border-dove-green min-w-[80px]">
                        {copied ? 'Disalin!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase">Room ID</p>
                      <p className="text-sm font-bold text-gray-800 font-mono mt-0.5">{createdRoomInfo.id}</p>
                    </div>
                    {createdRoomInfo.password && (
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <p className="text-[10px] text-gray-400 font-semibold uppercase">Password</p>
                        <p className="text-sm font-bold text-gray-800 font-mono mt-0.5">{createdRoomInfo.password}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setCreatedRoomInfo(null)} className="flex-1 py-3 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Buat Lainnya</button>
                    {!createdRoomInfo.scheduledFor && (
                      <button type="button" onClick={() => router.push(`/room/${createdRoomInfo.id}`)} className="flex-1 py-3 text-sm font-semibold text-white bg-dove-green hover:bg-dove-green/90 rounded-xl shadow-[0_4px_14px_rgba(16,185,129,0.3)] transition-all">Mulai Sekarang</button>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreate} className="space-y-4" autoComplete="off">
                  <div className="flex bg-gray-50 p-1 rounded-xl mb-4 border border-gray-100">
                    <button type="button" onClick={() => setCreateMode('instant')} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${createMode === 'instant' ? 'bg-white shadow border border-gray-200 text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Instan</button>
                    <button type="button" onClick={() => setCreateMode('later')} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${createMode === 'later' ? 'bg-white shadow border border-gray-200 text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Buat Nanti</button>
                    <button type="button" onClick={() => setCreateMode('schedule')} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${createMode === 'schedule' ? 'bg-white shadow border border-gray-200 text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Jadwalkan</button>
                  </div>

                  <Field label="Nama Anda (Host)" value={name} onChange={setName} placeholder="Masukkan nama" maxLength={40} autoFocus />

                  {createMode === 'schedule' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="hp-label">Tanggal</label>
                        <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="hp-input text-sm" required={createMode === 'schedule'} />
                      </div>
                      <div>
                        <label className="hp-label">Waktu</label>
                        <input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="hp-input text-sm" required={createMode === 'schedule'} />
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-3 cursor-pointer select-none py-2">
                    <input type="checkbox" checked={usePassword} onChange={e => setUsePassword(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-dove-green focus:ring-dove-green/30 cursor-pointer" />
                    <span className="text-sm text-gray-600">Buat password room</span>
                  </label>

                  {usePassword && (
                    <PwField value={password} onChange={setPassword} showPw={showPw} toggle={() => setShowPw(v => !v)} placeholder="Buat password..." />
                  )}

                  {error && <ErrBox text={error} />}

                  <button type="submit" disabled={loading} className="hp-btn hp-btn-green mt-2">
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> {createMode === 'instant' ? 'Memulai...' : 'Membuat...'}</> : <>
                      {createMode === 'instant' ? 'Mulai Rapat Instan' : (createMode === 'later' ? 'Dapatkan Info Rapat' : 'Jadwalkan Rapat')} 
                      <ArrowRight className="h-4 w-4" />
                    </>}
                  </button>
                </form>
              )
            ) : (
              <form onSubmit={handleJoin} className="space-y-4" autoComplete="off">
                <Field label="Nama Anda" value={name} onChange={setName} placeholder="Masukkan nama" maxLength={40} autoFocus />

                <div>
                  <label className="hp-label">Kode Meeting</label>
                  <input type="text" value={roomId} onChange={e => setRoomId(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase())}
                    placeholder="Contoh: ABCDEF" maxLength={6} autoComplete="off"
                    className="hp-input text-center uppercase tracking-[0.3em] font-semibold text-lg" />
                </div>

                {error && <ErrBox text={error} />}

                <button type="submit" className="hp-btn hp-btn-orange">
                  <ArrowRight className="h-4 w-4" /> Gabung Sekarang
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, maxLength, autoFocus }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; maxLength?: number; autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="hp-label">{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        maxLength={maxLength} autoFocus={autoFocus} autoComplete="off" className="hp-input" />
    </div>
  );
}

function PwField({ label, value, onChange, showPw, toggle, placeholder }: {
  label?: string; value: string; onChange: (v: string) => void; showPw: boolean; toggle: () => void; placeholder: string;
}) {
  return (
    <div>
      {label && <label className="hp-label">{label}</label>}
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
        <input type={showPw ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} maxLength={64} autoComplete="off" data-1p-ignore
          className="hp-input !pl-10 !pr-10" />
        <button type="button" onClick={toggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function ErrBox({ text }: { text: string }) {
  return <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{text}</p>;
}

function Pill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 border border-gray-100 px-3.5 py-1.5 text-xs font-medium text-gray-500">
      {icon}{text}
    </span>
  );
}
