import Link from 'next/link';
import { HomeHero } from '@/components/HomeHero';

export default function HomePage() {
  return (
    <main className="min-h-dvh flex flex-col pt-8">
      {/* HEADER COMIK STYLE */}
      <header className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <div className="flex items-center justify-between rounded-2xl border-2 border-black bg-white px-5 py-4 shadow-brutal">
          <Link href="/" className="flex items-center gap-3 font-bold group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black bg-primary shadow-brutal transition-transform group-hover:-translate-y-1">
              <span className="text-black font-black text-xl">:P</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-lg font-black text-black">Portal SI</span>
              <span className="text-[10px] font-bold text-ink-400 tracking-wider uppercase mt-1">
                MEET
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border-2 border-black bg-secondary px-3 py-1.5 text-xs font-bold text-black shadow-brutal">
              <span className="h-2 w-2 rounded-full bg-black animate-pulse" />
              10000% Gratis!
            </span>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <div className="flex-1 flex flex-col justify-center w-full max-w-5xl mx-auto py-12 px-4 sm:px-6">
        <HomeHero />
      </div>

      {/* FOOTER */}
      <footer className="w-full max-w-5xl mx-auto px-4 sm:px-6 pb-8">
        <div className="rounded-2xl border-2 border-black bg-white p-4 shadow-brutal text-center flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm font-bold text-ink-300">
            &copy; {new Date().getFullYear()} Portal SI Meet
          </p>
          <div className="flex gap-2">
            <span className="inline-block rounded-lg border-2 border-black bg-[#f8f9fa] px-2 py-1 text-xs font-bold shadow-brutal-active">🚀 Ga Perlu Install</span>
            <span className="inline-block rounded-lg border-2 border-black bg-[#f8f9fa] px-2 py-1 text-xs font-bold shadow-brutal-active">🔒 Aman & Terenkripsi</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
