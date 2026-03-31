

import { SorobanRpc, xdr, scValToNative } from '@stellar/stellar-sdk';
import { SOROBAN_RPC_URL, CONTRACT_ID } from './stellar-contract';
import type { PollEvent } from '@/types';

const POLL_INTERVAL_MS = 3000; // 3 seconds

// ─── Event Fetcher ────────────────────────────────────────────────────────────

/**
 * Fetch recent contract events from Soroban RPC.
 * Returns events for both 'poll' topic segments (init and vote).
 */
export async function fetchContractEvents(
  startLedger?: number
): Promise<PollEvent[]> {
  const server = new SorobanRpc.Server(SOROBAN_RPC_URL, { allowHttp: false });

  if (!CONTRACT_ID) return [];

  try {
    // Get current ledger to use as start if none provided
    let start = startLedger;
    if (!start) {
      const latest = await server.getLatestLedger();
      // Start from 500 ledgers ago (~40 mins) to get recent history
      start = Math.max(1, (latest.sequence ?? 1) - 500);
    }

    const response = await server.getEvents({
      startLedger: start,
      filters: [
        {
          type: 'contract',
          contractIds: [CONTRACT_ID],
          topics: [
            // Match any event with the first topic "poll"
            // (covers both poll/init and poll/vote)
          ],
        },
      ],
      limit: 50,
    });

    const events: PollEvent[] = [];

    for (const event of response.events ?? []) {
      try {
        const topics = event.topic?.map((t) => {
          try {
            return scValToNative(xdr.ScVal.fromXDR(t as unknown as string, 'base64'));
          } catch {
            return null;
          }
        }) ?? [];

        // topic[0] = "poll", topic[1] = "init" or "vote"
        const eventType = topics[1] as string;

        if (eventType === 'init') {
          events.push({
            id: event.id ?? String(Math.random()),
            type: 'init',
            timestamp: new Date(),
            txHash: event.txHash,
          });
        } else if (eventType === 'vote') {
          // value is [voter_address, option_index, option_label]
          let voter: string | undefined;
          let optionIndex: number | undefined;
          let optionLabel: string | undefined;

          try {
            const val = scValToNative(
              xdr.ScVal.fromXDR(event.value as unknown as string, 'base64')
            ) as [string, number, string];
            voter = String(val[0]);
            optionIndex = Number(val[1]);
            optionLabel = String(val[2]);
          } catch {
            // ignore parse error
          }

          events.push({
            id: event.id ?? String(Math.random()),
            type: 'vote',
            voter,
            optionIndex,
            optionLabel,
            timestamp: new Date(),
            txHash: event.txHash,
          });
        }
      } catch {
        // Skip malformed events
      }
    }

    return events;
  } catch (err) {
    console.warn('Event fetch error:', err);
    return [];
  }
}

// ─── Event Listener ───────────────────────────────────────────────────────────

export interface EventListenerOptions {
  onEvents: (events: PollEvent[]) => void;
  onError?: (err: unknown) => void;
}

/**
 * Starts a polling loop that fetches new contract events every POLL_INTERVAL_MS.
 * Returns a cleanup function that stops the loop.
 */
export function startEventListener(opts: EventListenerOptions): () => void {
  const { onEvents, onError } = opts;
  let stopped = false;
  let seenIds = new Set<string>();
  let startLedger: number | undefined;

  const poll = async () => {
    if (stopped) return;

    try {
      const server = new SorobanRpc.Server(SOROBAN_RPC_URL, { allowHttp: false });

      // Get current ledger on first run
      if (!startLedger) {
        const latest = await server.getLatestLedger();
        startLedger = Math.max(1, (latest.sequence ?? 1) - 500);
      }

      const events = await fetchContractEvents(startLedger);

      // Filter to only new events
      const newEvents = events.filter((e) => !seenIds.has(e.id));
      if (newEvents.length > 0) {
        newEvents.forEach((e) => seenIds.add(e.id));
        onEvents(newEvents);
      }
    } catch (err) {
      onError?.(err);
    }

    if (!stopped) {
      setTimeout(poll, POLL_INTERVAL_MS);
    }
  };

  // Start immediately
  poll();

  // Return cleanup
  return () => {
    stopped = true;
  };
}
