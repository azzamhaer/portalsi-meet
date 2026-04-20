import Link from 'next/link';
import { HomeHero } from '@/components/HomeHero';
import { FeatureGrid } from '@/components/FeatureGrid';

export default function HomePage() {
  return (
    <main className="min-h-dvh">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-900/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand shadow-lg shadow-primary/30">
              <span className="text-ink-900 font-black text-lg">P</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base font-bold">PortalSI Meet</span>
              <span className="text-[10px] font-medium text-ink-400 tracking-wider uppercase">
                Video Conference
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <a
              href="#fitur"
              className="hidden rounded-lg px-3 py-2 text-sm text-ink-200 hover:text-white hover:bg-white/5 transition sm:inline-flex"
            >
              Fitur
            </a>
            <a
              href="#cara-pakai"
              className="hidden rounded-lg px-3 py-2 text-sm text-ink-200 hover:text-white hover:bg-white/5 transition sm:inline-flex"
            >
              Cara Pakai
            </a>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" />
              Online
            </span>
          </div>
        </div>
      </header>

      <HomeHero />
      <FeatureGrid />

      {/* CARA PAKAI */}
      <section id="cara-pakai" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Meeting dalam <span className="text-primary">3 langkah</span>
          </h2>
          <p className="mt-4 text-ink-300">Tanpa install, tanpa daftar. Buka browser, selesai.</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {[
            { step: '1', title: 'Buat Ruang', desc: 'Klik tombol "Mulai Meeting" dan dapatkan Room ID 6 huruf.' },
            { step: '2', title: 'Bagikan ID', desc: 'Kirim Room ID ke peserta via WhatsApp, email, atau chat apa pun.' },
            { step: '3', title: 'Mulai Meeting', desc: 'Peserta masukkan Room ID dan langsung bergabung. Selesai.' },
          ].map((s) => (
            <div key={s.step} className="card group transition-all hover:border-primary/40 hover:bg-ink-800/80">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand text-ink-900 font-black text-xl">
                {s.step}
              </div>
              <h3 className="mt-4 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-ink-300 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
          <p className="text-sm text-ink-400">
            &copy; {new Date().getFullYear()} PortalSI Meet. Open, fast, private.
          </p>
          <p className="text-xs text-ink-500">
            Powered by WebRTC &middot; LiveKit &middot; Next.js
          </p>
        </div>
      </footer>
    </main>
  );
}
