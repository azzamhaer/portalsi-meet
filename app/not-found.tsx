import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <div className="card max-w-md w-full text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
          <span className="text-5xl">🔍</span>
        </div>
        <h1 className="mt-4 text-2xl font-bold">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-ink-300">Sepertinya kamu tersesat di ruang kosong.</p>
        <Link href="/" className="btn-primary mt-6 w-full">
          Kembali ke Beranda
        </Link>
      </div>
    </main>
  );
}
