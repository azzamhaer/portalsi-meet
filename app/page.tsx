import Link from 'next/link';
import { HomeHero } from '@/components/HomeHero';
import { FaqButton } from '@/components/FaqButton';

export default function HomePage() {
  return (
    <main className="homepage min-h-dvh flex flex-col">
      {/* Navbar */}
      <header className="w-full border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden">
              <img
                src="/logo.png"
                alt="logo"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[15px] font-semibold text-gray-800 tracking-tight">Portal SI</span>
              <span className="text-[10px] font-medium text-dove-green tracking-[0.15em] uppercase">Meet</span>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <FaqButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center">
        <HomeHero />
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} Portal SI Meet</p>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>Gratis</span>
            <span className="text-gray-200">·</span>
            <span>Aman</span>
            <span className="text-gray-200">·</span>
            <span>Tanpa Install</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
