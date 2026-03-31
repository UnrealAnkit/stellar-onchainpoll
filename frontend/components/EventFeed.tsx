'use client';

import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { shortAddress, STELLAR_EXPLORER_TX } from '@/lib/stellar-contract';
import type { PollEvent } from '@/types';

interface EventFeedProps {
  events: PollEvent[];
}

export default function EventFeed({ events }: EventFeedProps) {
  return (
    <div className="rounded-2xl border border-[#1c2333] bg-[#0d1117] overflow-hidden animate-slide-up delay-400">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#1c2333] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio size={15} className="text-stellar-400" />
          <h3 className="text-sm font-semibold text-[#e6edf3]">Live Activity</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="live-dot" />
          <span className="text-xs text-[#8b949e]">Real-time</span>
        </div>
      </div>

      {/* Event list */}
      <div className="divide-y divide-[#1c2333] max-h-64 overflow-y-auto">
        {events.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-2xl mb-2">📡</p>
            <p className="text-xs text-[#8b949e]">Listening for contract events…</p>
            <p className="text-xs text-[#8b949e] mt-1">Events appear here in real time</p>
          </div>
        ) : (
          events.map((event, i) => (
            <EventRow key={event.id} event={event} index={i} />
          ))
        )}
      </div>
    </div>
  );
}

function EventRow({ event, index }: { event: PollEvent; index: number }) {
  const isNew = index === 0;

  return (
    <div
      className={cn(
        'px-5 py-3 flex items-start gap-3 transition-all duration-300',
        isNew && 'bg-stellar-500/5 animate-slide-up'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-sm',
          event.type === 'vote' ? 'bg-stellar-500/10' : 'bg-violet-500/10'
        )}
      >
        {event.type === 'vote' ? '🗳️' : '🚀'}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {event.type === 'vote' ? (
          <>
            <p className="text-xs text-[#e6edf3]">
              <span className="font-mono text-stellar-400">
                {event.voter ? shortAddress(event.voter) : 'Unknown'}
              </span>{' '}
              voted for{' '}
              <span className="font-semibold">
                {event.optionLabel ?? `Option ${(event.optionIndex ?? 0) + 1}`}
              </span>
            </p>
          </>
        ) : (
          <p className="text-xs text-[#e6edf3]">
            <span className="text-violet-400">Poll initialized</span> — contract is live
          </p>
        )}

        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-[#8b949e]">
            {formatDistanceToNow(event.timestamp, { addSuffix: true })}
          </span>

          {event.txHash && (
            <a
              href={`${STELLAR_EXPLORER_TX}${event.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[#8b949e] hover:text-stellar-400 transition-colors"
            >
              <ExternalLink size={10} />
              {shortAddress(event.txHash)}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
