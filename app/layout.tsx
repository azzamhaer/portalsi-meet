import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import '@livekit/components-styles';
import './globals.css';
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Portal SI Meet',
  description:
    'Meeting online berkualitas HD tanpa perlu install aplikasi atau daftar akun. Buat ruang rapat sekarang, share Room ID, selesai.',
  keywords: ['video conference', 'meeting online', 'webinar', 'video call', 'portalsi'],
  openGraph: {
    title: 'PortalSI Meet',
    description: 'Video conference real-time, gratis, tanpa install.',
    type: 'website',
  },
  robots: { index: true, follow: true },
  icons: {
    icon: '/logo.png',
  },
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
      <body className={`${inter.className} theme-comic`}>
        {children}</body>
    </html>
  );
}
