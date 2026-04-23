import Link from 'next/link';
import { HomeHero } from '@/components/HomeHero';

export default function HomePage() {
  return (
    <main className="homepage min-h-dvh flex flex-col relative overflow-hidden">
      {/* Navbar */}
      <header className="relative z-20 mx-auto w-full max-w-5xl px-4 sm:px-6 pt-6">
        <nav className="flex items-center justify-between px-5 py-3 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.06]">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 transition-transform group-hover:scale-110 group-hover:rotate-3">
              <span className="text-white font-black text-sm">:P</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base font-bold text-white/90 tracking-tight">Portal SI</span>
              <span className="text-[10px] font-semibold text-emerald-400/80 tracking-[0.2em] uppercase">MEET</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-[11px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Open Source
            </span>
          </div>
        </nav>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <HomeHero />
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 pb-6">
        <div className="text-center py-4 border-t border-white/[0.06]">
          <p className="text-xs text-white/20 font-medium">
            &copy; {new Date().getFullYear()} Portal SI Meet &middot; Built with LiveKit
          </p>
        </div>
      </footer>
    </main>
  );
}
