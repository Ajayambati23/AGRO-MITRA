import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AgroMitra Buyer Portal',
  description: 'Browse and buy crops directly from farmers',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
