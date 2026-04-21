import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import '@livekit/components-styles';
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PortalSI Meet — Video Conference tanpa Login',
  description:
    'Meeting online berkualitas HD tanpa perlu install aplikasi atau daftar akun. Buat ruang rapat sekarang, share Room ID, selesai.',
  keywords: ['video conference', 'meeting online', 'webinar', 'video call', 'portalsi'],
  openGraph: {
    title: 'PortalSI Meet',
    description: 'Video conference real-time, gratis, tanpa install.',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
