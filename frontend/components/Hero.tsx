'use client';

import { Star } from 'lucide-react';

export default function Hero() {
  return (
    <header className="text-center mb-10 animate-slide-up">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-stellar-500/30 bg-stellar-500/10 text-stellar-400 text-xs font-mono mb-5">
        <Star size={11} fill="currentColor" />
        Stellar Journey to Mastery · Yellow Belt
        <Star size={11} fill="currentColor" />
      </div>

      {/* Title */}
      <h1
        className="text-4xl sm:text-5xl font-extrabold mb-3 leading-tight"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        <span className="bg-gradient-to-r from-sky-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
          Stellar
        </span>{' '}
        <span className="text-[#e6edf3]">Live Poll</span>
      </h1>

      {/* Subtitle */}
      <p className="text-sm text-[#8b949e] max-w-md mx-auto leading-relaxed font-mono">
        Decentralized, real-time polling powered by{' '}
        <span className="text-stellar-400">Soroban smart contracts</span> on the Stellar
        blockchain.
      </p>

      {/* Decorative line */}
      <div className="mt-6 flex items-center justify-center gap-3">
        <div className="h-px w-16 bg-gradient-to-r from-transparent to-stellar-500/40" />
        <div className="w-1.5 h-1.5 rounded-full bg-stellar-500" />
        <div className="h-px w-16 bg-gradient-to-l from-transparent to-stellar-500/40" />
      </div>
    </header>
  );
}
