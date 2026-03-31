#!/usr/bin/env node
/**
 * scripts/init-poll.mjs
 *
 * CLI script to initialize the Stellar Live Poll smart contract.
 * Run AFTER deploying the contract to testnet.
 *
 * Usage:
 *   ADMIN_SECRET_KEY=S... NEXT_PUBLIC_CONTRACT_ID=C... node scripts/init-poll.mjs
 */

import {
  Keypair,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  Contract,
  nativeToScVal,
  Address,
} from '@stellar/stellar-sdk';
import { Server as SorobanServer, Api, assembleTransaction } from '@stellar/stellar-sdk/rpc';

// ── Config ───────────────────────────────────────────────────────────────────

const ADMIN_SECRET   = process.env.ADMIN_SECRET_KEY;
const CONTRACT_ID    = process.env.NEXT_PUBLIC_CONTRACT_ID;
const SOROBAN_RPC    = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? 'https://soroban-testnet.stellar.org';
const NETWORK_PASS   = process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? Networks.TESTNET;

if (!ADMIN_SECRET || !CONTRACT_ID) {
  console.error('❌ Missing ADMIN_SECRET_KEY or NEXT_PUBLIC_CONTRACT_ID env vars');
  process.exit(1);
}

// ── Poll Data ─────────────────────────────────────────────────────────────────

const QUESTION = 'Which Stellar builder track is most exciting?';
const OPTIONS  = ['DeFi', 'NFTs', 'Payments', 'Open Source'];

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Initializing Stellar Live Poll contract...');
  console.log(`   Contract: ${CONTRACT_ID}`);
  console.log(`   Question: ${QUESTION}`);
  console.log(`   Options:  ${OPTIONS.join(', ')}`);
  console.log('');

  const adminKeypair = Keypair.fromSecret(ADMIN_SECRET);
  const adminAddress = adminKeypair.publicKey();
  console.log(`   Admin:    ${adminAddress}`);

  const server   = new SorobanServer(SOROBAN_RPC, { allowHttp: false });
  const contract = new Contract(CONTRACT_ID);

  // Load account
  const account = await server.getAccount(adminAddress);
  console.log(`   Sequence: ${account.sequenceNumber()}`);

  // Build args
  const adminVal    = new Address(adminAddress).toScVal();
  const questionVal = nativeToScVal(QUESTION, { type: 'string' });
  const optionsVal  = nativeToScVal(OPTIONS.map((o) => nativeToScVal(o, { type: 'string' })));

  // Build tx
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASS,
  })
    .addOperation(contract.call('initialize_poll', adminVal, questionVal, optionsVal))
    .setTimeout(30)
    .build();

  // Simulate
  console.log('\n⏳ Simulating transaction...');
  const sim = await server.simulateTransaction(tx);
  if (Api.isSimulationError(sim)) {
    console.error('❌ Simulation failed:', sim.error);
    process.exit(1);
  }
  console.log('✅ Simulation success');

  // Assemble & sign
  const preparedTx = assembleTransaction(tx, sim).build();
  preparedTx.sign(adminKeypair);

  // Submit
  console.log('\n📡 Submitting transaction...');
  const sendResp = await server.sendTransaction(preparedTx);
  if (sendResp.status === 'ERROR') {
    console.error('❌ Submit error:', sendResp.errorResult?.toString());
    process.exit(1);
  }

  const txHash = sendResp.hash;
  console.log(`   TX Hash: ${txHash}`);

  // Wait for confirmation
  console.log('\n⏳ Waiting for confirmation...');
  let resp = await server.getTransaction(txHash);
  let attempts = 0;
  while (resp.status === Api.GetTransactionStatus.NOT_FOUND && attempts < 30) {
    await new Promise((r) => setTimeout(r, 1000));
    resp = await server.getTransaction(txHash);
    attempts++;
    process.stdout.write('.');
  }

  console.log('');
  if (resp.status === Api.GetTransactionStatus.SUCCESS) {
    console.log('\n🎉 Poll initialized successfully!');
    console.log(`   View on explorer: https://stellar.expert/explorer/testnet/tx/${txHash}`);
  } else {
    console.error(`\n❌ Transaction failed with status: ${resp.status}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
