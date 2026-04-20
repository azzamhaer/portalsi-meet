import { Zap, Monitor, MessageSquare, Lock, Smartphone, Globe } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Real-time & Low Latency',
    desc: 'Streaming WebRTC langsung peer-to-SFU. Tanpa buffer, tanpa delay panjang.',
    color: 'primary' as const,
  },
  {
    icon: Monitor,
    title: 'Screen Sharing',
    desc: 'Presentasi layar penuh, window tertentu, atau tab browser dengan audio.',
    color: 'secondary' as const,
  },
  {
    icon: MessageSquare,
    title: 'Live Chat',
    desc: 'Chat real-time dalam ruang tanpa perlu aplikasi terpisah.',
    color: 'primary' as const,
  },
  {
    icon: Lock,
    title: 'Password & Lobby',
    desc: 'Lindungi ruang dengan password atau approve peserta satu per satu.',
    color: 'secondary' as const,
  },
  {
    icon: Smartphone,
    title: 'Mobile Ready',
    desc: 'Berjalan mulus di Chrome Android dan Safari iOS. Tidak perlu install.',
    color: 'primary' as const,
  },
  {
    icon: Globe,
    title: 'Cross Platform',
    desc: 'Windows, macOS, Linux, iOS, Android — cukup buka link di browser.',
    color: 'secondary' as const,
  },
];

export function FeatureGrid() {
  return (
    <section id="fitur" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Fitur Lengkap</p>
        <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
          Semua yang kamu butuhkan untuk meeting
        </h2>
        <p className="mt-4 text-ink-300">Tidak kurang, tidak lebih. Yang penting jalan stabil.</p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="card group transition-all hover:border-white/20 hover:bg-ink-800/90 hover:-translate-y-0.5"
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                f.color === 'primary'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-secondary/10 text-secondary'
              } transition-all group-hover:scale-110`}
            >
              <f.icon className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-ink-300 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
