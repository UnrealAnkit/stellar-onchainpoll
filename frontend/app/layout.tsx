import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stellar Live Poll — Vote on Stellar Blockchain',
  description:
    'A real-time decentralized polling dApp built on Stellar / Soroban. Connect your wallet, cast your vote, and watch results update live from the blockchain.',
  openGraph: {
    title: 'Stellar Live Poll',
    description: 'Real-time voting on Stellar blockchain. Powered by Soroban smart contracts.',
    type: 'website',
  },
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
