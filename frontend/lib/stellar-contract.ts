/**
 * stellar-contract.ts
 * All Soroban contract interaction logic — read + write.
 */

import {
  Contract,
  Networks,
  SorobanRpc,
  TransactionBuilder,
  BASE_FEE,
  xdr,
  scValToNative,
  nativeToScVal,
  Address,
  Keypair,
} from '@stellar/stellar-sdk';
import type { PollData, PollOption, TxState } from '@/types';

// ─── Config ───────────────────────────────────────────────────────────────────

export const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? Networks.TESTNET;

export const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? 'https://soroban-testnet.stellar.org';

export const HORIZON_URL =
  process.env.NEXT_PUBLIC_HORIZON_URL ?? 'https://horizon-testnet.stellar.org';

export const CONTRACT_ID =
  process.env.NEXT_PUBLIC_CONTRACT_ID ?? '';

export const STELLAR_EXPLORER_TX =
  'https://stellar.expert/explorer/testnet/tx/';

export const STELLAR_EXPLORER_CONTRACT =
  'https://stellar.expert/explorer/testnet/contract/';

// ─── RPC Client ──────────────────────────────────────────────────────────────

export function getRpcServer(): SorobanRpc.Server {
  return new SorobanRpc.Server(SOROBAN_RPC_URL, { allowHttp: false });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Shorten an address for display: GABC...XYZ */
export function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

/** Parse native JS value from scVal */
function toNative(val: xdr.ScVal): unknown {
  return scValToNative(val);
}

// ─── Read Contract ────────────────────────────────────────────────────────────

/**
 * Simulate a read-only contract call and return the native JS result.
 * Uses simulation — no transaction needed.
 */
async function simulateRead(
  method: string,
  args: xdr.ScVal[] = []
): Promise<unknown> {
  if (!CONTRACT_ID) throw new Error('CONTRACT_ID not set in environment');

  const server = getRpcServer();
  const contract = new Contract(CONTRACT_ID);

  // We need a dummy keypair to build the tx envelope
  const dummyKeypair = Keypair.random();

  // Fetch a recent ledger to set a valid sequence
  const account = await server.getAccount(dummyKeypair.publicKey()).catch(() => {
    // If account doesn't exist, build a fake account with sequence 0
    const { Account } = require('@stellar/stellar-sdk');
    return new Account(dummyKeypair.publicKey(), '0');
  });

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const simulation = await server.simulateTransaction(tx);

  if (SorobanRpc.Api.isSimulationError(simulation)) {
    throw new Error(`Simulation error: ${simulation.error}`);
  }

  const result = simulation.result?.retval;
  if (!result) return null;
  return toNative(result);
}

// ─── Poll Read Functions ──────────────────────────────────────────────────────

export async function getPoll(): Promise<PollData> {
  const raw = await simulateRead('get_poll') as {
    question: string;
    options: string[];
    vote_counts: number[];
    total_votes: number;
  };

  return {
    question: raw.question,
    options: raw.options,
    voteCounts: raw.vote_counts,
    totalVotes: Number(raw.total_votes),
  };
}

export async function getResults(): Promise<number[]> {
  const raw = await simulateRead('get_results') as number[];
  return raw.map(Number);
}

export async function hasVoted(address: string): Promise<boolean> {
  const addr = new Address(address);
  const raw = await simulateRead('has_voted', [addr.toScVal()]);
  return Boolean(raw);
}

export async function getTotalVotes(): Promise<number> {
  const raw = await simulateRead('get_total_votes');
  return Number(raw);
}

export async function isInitialized(): Promise<boolean> {
  try {
    const raw = await simulateRead('is_initialized');
    return Boolean(raw);
  } catch {
    return false;
  }
}

/** Combines poll data with percentage calculations for each option */
export async function getPollOptions(): Promise<PollOption[]> {
  const poll = await getPoll();
  return poll.options.map((label, index) => {
    const votes = poll.voteCounts[index] ?? 0;
    const percentage =
      poll.totalVotes > 0 ? Math.round((votes / poll.totalVotes) * 100) : 0;
    return { index, label, votes, percentage };
  });
}

// ─── Write Contract (Vote) ────────────────────────────────────────────────────

/**
 * Submit a vote transaction through the connected wallet.
 * Returns the transaction hash on success.
 *
 * @param voterAddress - The connected wallet's public key
 * @param optionIndex  - The index of the chosen poll option (0-based)
 * @param signTransaction - The wallet kit sign function
 * @param onStatusChange - Callback for transaction status updates
 */
export async function submitVote(
  voterAddress: string,
  optionIndex: number,
  signTransaction: (xdr: string, opts: { network: string; networkPassphrase: string }) => Promise<{ signedTxXdr: string }>,
  onStatusChange: (state: TxState) => void
): Promise<string> {
  if (!CONTRACT_ID) throw new Error('CONTRACT_ID not set in environment');

  const server = getRpcServer();
  const contract = new Contract(CONTRACT_ID);

  onStatusChange({ status: 'pending' });

  try {
    // Load the voter's on-chain account
    const account = await server.getAccount(voterAddress);

    // Build the vote transaction
    const voterAddr = new Address(voterAddress);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          'vote',
          voterAddr.toScVal(),
          nativeToScVal(optionIndex, { type: 'u32' })
        )
      )
      .setTimeout(30)
      .build();

    // Simulate to check for errors and get footprint
    const simulation = await server.simulateTransaction(tx);

    if (SorobanRpc.Api.isSimulationError(simulation)) {
      const errMsg = simulation.error ?? 'Simulation failed';
      if (errMsg.includes('already voted') || errMsg.includes('AlreadyVoted')) {
        throw new Error('ALREADY_VOTED');
      }
      throw new Error(`CONTRACT_ERROR: ${errMsg}`);
    }

    // Assemble the transaction with the simulation footprint
    const preparedTx = SorobanRpc.assembleTransaction(tx, simulation).build();

    // Sign via wallet kit
    let signed: { signedTxXdr: string };
    try {
      signed = await signTransaction(preparedTx.toXDR(), {
        network: 'TESTNET',
        networkPassphrase: NETWORK_PASSPHRASE,
      });
    } catch (e: unknown) {
      const msg = (e as Error)?.message ?? '';
      if (
        msg.toLowerCase().includes('reject') ||
        msg.toLowerCase().includes('cancel') ||
        msg.toLowerCase().includes('denied') ||
        msg.toLowerCase().includes('user')
      ) {
        throw new Error('USER_REJECTED');
      }
      throw e;
    }

    // Deserialize and submit
    const signedTx = TransactionBuilder.fromXDR(
      signed.signedTxXdr,
      NETWORK_PASSPHRASE
    );

    const sendResponse = await server.sendTransaction(signedTx);

    if (sendResponse.status === 'ERROR') {
      throw new Error(`INSUFFICIENT_BALANCE: ${sendResponse.errorResult?.toString() ?? 'Transaction failed'}`);
    }

    // Poll for confirmation
    let txHash = sendResponse.hash;
    let getResponse = await server.getTransaction(txHash);

    // Wait up to 30 seconds for confirmation
    let attempts = 0;
    while (
      getResponse.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND &&
      attempts < 30
    ) {
      await new Promise((r) => setTimeout(r, 1000));
      getResponse = await server.getTransaction(txHash);
      attempts++;
    }

    if (getResponse.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      onStatusChange({ status: 'success', hash: txHash });
      return txHash;
    } else {
      throw new Error(`INSUFFICIENT_BALANCE: Transaction failed with status ${getResponse.status}`);
    }
  } catch (err: unknown) {
    const e = err as Error;
    const msg = e?.message ?? 'Unknown error';

    if (msg.startsWith('USER_REJECTED')) {
      onStatusChange({ status: 'failed', error: 'USER_REJECTED' });
      throw err;
    } else if (msg.startsWith('ALREADY_VOTED')) {
      onStatusChange({ status: 'failed', error: 'ALREADY_VOTED' });
      throw err;
    } else if (msg.startsWith('INSUFFICIENT_BALANCE') || msg.startsWith('CONTRACT_ERROR')) {
      onStatusChange({ status: 'failed', error: msg });
      throw err;
    } else {
      onStatusChange({ status: 'failed', error: msg });
      throw err;
    }
  }
}

// ─── Initialize Poll (Admin Script Helper) ───────────────────────────────────

/**
 * Initialize a new poll round from the browser.
 * Any connected wallet can create a round on-chain.
 */
export async function initializePoll(
  creatorAddress: string,
  question: string,
  options: string[],
  signTransaction: (xdr: string, opts: { network: string; networkPassphrase: string }) => Promise<{ signedTxXdr: string }>,
  onStatusChange: (state: TxState) => void
): Promise<string> {
  if (!CONTRACT_ID) throw new Error('CONTRACT_ID not set in environment');

  const server = getRpcServer();
  const contract = new Contract(CONTRACT_ID);

  onStatusChange({ status: 'pending' });

  try {
    const account = await server.getAccount(creatorAddress);

    const creatorAddr = new Address(creatorAddress);
    const questionVal = nativeToScVal(question, { type: 'string' });
    const optionsVal = nativeToScVal(options.map((o) => nativeToScVal(o, { type: 'string' })));

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          'initialize_poll',
          creatorAddr.toScVal(),
          questionVal,
          optionsVal
        )
      )
      .setTimeout(30)
      .build();

    const simulation = await server.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(simulation)) {
      throw new Error(`Simulation error: ${simulation.error}`);
    }

    const preparedTx = SorobanRpc.assembleTransaction(tx, simulation).build();

    const signed = await signTransaction(preparedTx.toXDR(), {
      network: 'TESTNET',
      networkPassphrase: NETWORK_PASSPHRASE,
    });

    const signedTx = TransactionBuilder.fromXDR(signed.signedTxXdr, NETWORK_PASSPHRASE);
    const sendResponse = await server.sendTransaction(signedTx);

    if (sendResponse.status === 'ERROR') {
      throw new Error(`Init failed: ${sendResponse.errorResult?.toString()}`);
    }

    let txHash = sendResponse.hash;
    let getResponse = await server.getTransaction(txHash);
    let attempts = 0;
    while (
      getResponse.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND &&
      attempts < 30
    ) {
      await new Promise((r) => setTimeout(r, 1000));
      getResponse = await server.getTransaction(txHash);
      attempts++;
    }

    if (getResponse.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      onStatusChange({ status: 'success', hash: txHash });
      return txHash;
    } else {
      throw new Error('Poll initialization transaction failed');
    }
  } catch (err) {
    onStatusChange({ status: 'failed', error: (err as Error).message });
    throw err;
  }
}
