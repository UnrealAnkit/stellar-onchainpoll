'use client';

import { Users, BarChart3, Zap, Globe } from 'lucide-react';
import type { PollData } from '@/types';

interface StatsBarProps {
  poll: PollData | null;
}

export default function StatsBar({ poll }: StatsBarProps) {
  const leadingOption = poll
    ? poll.options.reduce(
        (best, label, i) => {
          const votes = poll.voteCounts[i] ?? 0;
          return votes > best.votes ? { label, votes } : best;
        },
        { label: '—', votes: -1 }
      )
    : null;

  const stats = [
    {
      icon: Users,
      label: 'Total Votes',
      value: poll ? poll.totalVotes.toString() : '—',
      color: 'text-stellar-400',
      bg: 'bg-stellar-500/10',
    },
    {
      icon: BarChart3,
      label: 'Options',
      value: poll ? poll.options.length.toString() : '—',
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
    },
    {
      icon: Zap,
      label: 'Leading',
      value: leadingOption && leadingOption.votes >= 0 ? leadingOption.label : '—',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      icon: Globe,
      label: 'Network',
      value: 'Testnet',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-slide-up delay-300">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-[#1c2333] bg-[#0d1117] p-4"
        >
          <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center mb-2`}>
            <stat.icon size={15} className={stat.color} />
          </div>
          <p className="text-xs text-[#8b949e]">{stat.label}</p>
          <p className={`text-sm font-bold mt-0.5 ${stat.color} font-mono truncate`}>
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
