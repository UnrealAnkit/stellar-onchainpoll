/**
 * wallet.ts
 * StellarWalletsKit integration — connect, disconnect, sign.
 */

import type { PollError } from '@/types';

// ─── Kit Type (lazy-imported to avoid SSR issues) ────────────────────────────

export type WalletKitInstance = {
  openModal: (opts: {
    onWalletSelected: (option: { id: string }) => void;
    onClosed?: (err: Error) => void;
  }) => Promise<void>;
  setWallet: (walletId: string) => void;
  getAddress: () => Promise<{ address: string }>;
  signTransaction: (
    xdr: string,
    opts: { network: string; networkPassphrase: string }
  ) => Promise<{ signedTxXdr: string }>;
  disconnect: () => void;
};

// Lazy singleton — only created client-side
let _kit: WalletKitInstance | null = null;
let _connectPromise: Promise<{ address: string; kit: WalletKitInstance }> | null = null;

/**
 * Returns (or creates) the StellarWalletsKit instance.
 * Must only be called in browser context.
 */
export async function getWalletKit(): Promise<WalletKitInstance> {
  if (_kit) return _kit;

  // Dynamic import to prevent SSR errors
  const {
    StellarWalletsKit,
    WalletNetwork,
    FREIGHTER_ID,
    XBULL_ID,
    ALBEDO_ID,
    LOBSTR_ID,
    FreighterModule,
    xBullModule,
    AlbedoModule,
    LobstrModule,
  } = await import('@creit.tech/stellar-wallets-kit');

  const rawKit = new StellarWalletsKit({
    network: WalletNetwork.TESTNET,
    selectedWalletId: FREIGHTER_ID,
    modules: [
      new FreighterModule(),
      new xBullModule(),
      new AlbedoModule(),
      new LobstrModule(),
    ],
  });

  const resolveNetwork = (network: string, passphrase: string): typeof WalletNetwork[keyof typeof WalletNetwork] => {
    if (passphrase === WalletNetwork.PUBLIC || network.toUpperCase() === 'PUBLIC') {
      return WalletNetwork.PUBLIC;
    }
    if (passphrase === WalletNetwork.FUTURENET || network.toUpperCase() === 'FUTURENET') {
      return WalletNetwork.FUTURENET;
    }
    if (passphrase === WalletNetwork.SANDBOX || network.toUpperCase() === 'SANDBOX') {
      return WalletNetwork.SANDBOX;
    }
    if (passphrase === WalletNetwork.STANDALONE || network.toUpperCase() === 'STANDALONE') {
      return WalletNetwork.STANDALONE;
    }
    return WalletNetwork.TESTNET;
  };

  _kit = {
    openModal: async ({ onWalletSelected, onClosed }) => {
      await rawKit.openModal({
        onWalletSelected: (option: { id: string }) => onWalletSelected({ id: option.id }),
        onClosed,
      });
    },
    setWallet: (walletId: string) => {
      rawKit.setWallet(walletId);
    },
    getAddress: async () => {
      const address = await rawKit.getPublicKey();
      return { address };
    },
    signTransaction: async (xdr, opts) => {
      const publicKey = await rawKit.getPublicKey();
      const { result } = await rawKit.signTx({
        xdr,
        publicKeys: [publicKey],
        network: resolveNetwork(opts.network, opts.networkPassphrase),
      });
      return { signedTxXdr: result };
    },
    disconnect: () => {
      // The current wallets kit does not expose a disconnect API.
    },
  };

  return _kit;
}

// ─── Connect Wallet ───────────────────────────────────────────────────────────

/**
 * Opens the wallet selection modal and resolves to the connected address.
 * Throws a PollError on failure.
 */
export async function connectWallet(): Promise<{
  address: string;
  kit: WalletKitInstance;
}> {
  if (_connectPromise) return _connectPromise;

  const connectAttempt: Promise<{ address: string; kit: WalletKitInstance }> = (async () => {
  let kit: WalletKitInstance;

  try {
    kit = await getWalletKit();
  } catch (e: unknown) {
    const err: PollError = {
      type: 'WALLET_NOT_FOUND',
      message:
        'No supported Stellar wallet found. Please install Freighter, xBull, or Albedo.',
    };
    throw err;
  }

  return new Promise<{ address: string; kit: WalletKitInstance }>((resolve, reject) => {
    let settled = false;
    const resolveOnce = (value: { address: string; kit: WalletKitInstance }) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const rejectOnce = (reason: PollError) => {
      if (settled) return;
      settled = true;
      reject(reason);
    };

    void kit.openModal({
      onWalletSelected: async (option: { id: string }) => {
        try {
          kit.setWallet(option.id);
          const { address } = await kit.getAddress();
          if (!address) {
            rejectOnce({
              type: 'WALLET_NOT_FOUND',
              message: 'Wallet connected but no address returned.',
            } as PollError);
            return;
          }
          resolveOnce({ address, kit });
        } catch (e: unknown) {
          const msg = (e as Error)?.message ?? '';

          if (
            msg.toLowerCase().includes('not installed') ||
            msg.toLowerCase().includes('not found')
          ) {
            rejectOnce({
              type: 'WALLET_NOT_FOUND',
              message: `Wallet "${option.id}" is not installed. Please install it and try again.`,
            } as PollError);
          } else if (
            msg.toLowerCase().includes('reject') ||
            msg.toLowerCase().includes('cancel')
          ) {
            rejectOnce({
              type: 'USER_REJECTED',
              message: 'Wallet connection was rejected by the user.',
            } as PollError);
          } else {
            rejectOnce({
              type: 'UNKNOWN',
              message: msg || 'Unknown wallet error.',
            } as PollError);
          }
        }
      },
      onClosed: (err?: Error) => {
        if (err?.message) {
          rejectOnce(classifyError(err));
          return;
        }
        rejectOnce({
          type: 'USER_REJECTED',
          message: 'Wallet connection was cancelled.',
        } as PollError);
      },
    }).catch((err: unknown) => {
      rejectOnce(classifyError(err));
    });
  });
  })();

  _connectPromise = connectAttempt;

  try {
    return await connectAttempt;
  } finally {
    if (_connectPromise === connectAttempt) {
      _connectPromise = null;
    }
  }
}

// ─── Disconnect Wallet ────────────────────────────────────────────────────────

export function disconnectWallet(): void {
  if (_kit) {
    try {
      _kit.disconnect();
    } catch {
      // ignore
    }
    _kit = null;
  }
}

// ─── Error Classification ─────────────────────────────────────────────────────

/**
 * Takes any thrown error from contract interactions and returns a typed PollError.
 */
export function classifyError(err: unknown): PollError {
  const msg = (err as Error)?.message ?? String(err);

  if (msg.startsWith('USER_REJECTED')) {
    return { type: 'USER_REJECTED', message: 'You rejected the transaction in your wallet.' };
  }
  if (msg.startsWith('ALREADY_VOTED')) {
    return { type: 'ALREADY_VOTED', message: 'This wallet has already voted in this poll.' };
  }
  if (msg.startsWith('INSUFFICIENT_BALANCE') || msg.includes('op_underfunded') || msg.includes('insufficient')) {
    return { type: 'INSUFFICIENT_BALANCE', message: 'Insufficient XLM balance to submit transaction. You need at least 1 XLM.' };
  }
  if (msg.startsWith('CONTRACT_ERROR')) {
    return { type: 'CONTRACT_ERROR', message: `Smart contract error: ${msg.replace('CONTRACT_ERROR: ', '')}` };
  }
  if (msg.includes('WALLET_NOT_FOUND') || msg.includes('not installed')) {
    return { type: 'WALLET_NOT_FOUND', message: 'Wallet not found or not installed.' };
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout')) {
    return { type: 'NETWORK_ERROR', message: 'Network error. Check your connection and try again.' };
  }

  return { type: 'UNKNOWN', message: msg || 'An unexpected error occurred.' };
}
