// ─── Poll Types ───────────────────────────────────────────────────────────────

export interface PollData {
  question: string;
  options: string[];
  voteCounts: number[];
  totalVotes: number;
}

export interface PollOption {
  index: number;
  label: string;
  votes: number;
  percentage: number;
}

// ─── Transaction Types ────────────────────────────────────────────────────────

export type TxStatus = 'idle' | 'pending' | 'success' | 'failed';

export interface TxState {
  status: TxStatus;
  hash?: string;
  error?: string;
}

// ─── Event Types ─────────────────────────────────────────────────────────────

export interface PollEvent {
  id: string;
  type: 'vote' | 'init';
  voter?: string;
  optionIndex?: number;
  optionLabel?: string;
  timestamp: Date;
  txHash?: string;
}

// ─── Wallet Types ─────────────────────────────────────────────────────────────

export interface WalletState {
  connected: boolean;
  address: string | null;
  kit: unknown | null;
}

// ─── Error Types ──────────────────────────────────────────────────────────────

export type PollError =
  | { type: 'WALLET_NOT_FOUND'; message: string }
  | { type: 'USER_REJECTED'; message: string }
  | { type: 'INSUFFICIENT_BALANCE'; message: string }
  | { type: 'ALREADY_VOTED'; message: string }
  | { type: 'NETWORK_ERROR'; message: string }
  | { type: 'CONTRACT_ERROR'; message: string }
  | { type: 'UNKNOWN'; message: string };
