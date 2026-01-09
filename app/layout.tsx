import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lajme AI - Latest News from Telegrafi',
  description: 'Stay updated with the latest news from Telegrafi',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sq">
      <body>{children}</body>
    </html>
  );
}



