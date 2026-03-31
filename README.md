# ✦ Stellar Live Poll

> **Real-t![stellar poll 3](https://github.com/user-attachments/assets/9ef82d1c-43b9-4138-aad5-f9a0aa4b86ce)
ime decentralized polling on Stellar blockchain**
>![Stellar poll 2](https://github.com/user-attachments/assets/3907f43d-33fb-42be-932a-4aa732f961cd)
 Built with Soroban smart contracts · StellarWalletsKit · Next.js
![stellar poll 1](https://github.com/user-attachments/assets/d1f218e1-1965-4796-8a50-73e5ac06fb53)

[![Stellar](https://img.shields.io/badge/Stellar-Testnet-0EA5E9?style=flat-square&logo=stellar)](https://stellar.org)
[![Soroban](https://img.shields.io/badge/Soroban-Smart%20Contracts-6366F1?style=flat-square)](https://soroban.stellar.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)

---

## 🎯 What is Stellar Live Poll?

Stellar Live Poll is a fully on-chain, real-time voting dApp built on the Stellar blockchain using Soroban smart contracts. Users connect their Stellar wallet, cast a vote on a live question, and watch the results update instantly — all verified on-chain.

- **One wallet = one vote**, enforced by smart contract
- **Real-time results** via Soroban event polling
- **Multi-wallet support** (Freighter, xBull, Albedo, LOBSTR)
- **Full transaction lifecycle tracking** — pending → success / failed
- **Live activity feed** of recent on-chain vote events

---

## 📸 Screenshots

| Wallet Connect | Voting | Live Results |
|---|---|---|
| *(see `/screenshots`)* | *(see `/screenshots`)* | *(see `/screenshots`)* |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│              Next.js Frontend               │
│  StellarWalletsKit · Soroban Client SDK     │
└────────────────────┬────────────────────────┘
                     │ RPC calls + sign txns
┌────────────────────▼────────────────────────┐
│         Soroban RPC (Stellar Testnet)       │
└────────────────────┬────────────────────────┘
                     │
┌────────────────────▼────────────────────────┐
│     Soroban Smart Contract (Rust)           │
│  initialize_poll · vote · get_poll          │
│  get_results · has_voted · get_total_votes  │
└─────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Smart Contract | Rust · Soroban SDK |
| Frontend | Next.js 14 (App Router) · TypeScript |
| Styling | Tailwind CSS |
| Wallet | StellarWalletsKit |
| Blockchain | Stellar Testnet |
| Deployment | Vercel (frontend) · Stellar CLI (contract) |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Rust + `wasm32-unknown-unknown` target
- Stellar CLI
- A Stellar testnet wallet (Freighter recommended)

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/stellar-live-poll.git
cd stellar-live-poll
```

### 2. Deploy the smart contract

```bash
# Fund a testnet account and set your secret key
export ADMIN_SECRET_KEY="SXXXXXXXXXX..."

# Run the deploy script
chmod +x scripts/deploy-contract.sh
./scripts/deploy-contract.sh
```

Copy the `CONTRACT_ID` output.

### 3. Configure environment

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local and paste your CONTRACT_ID
```

### 4. Initialize the poll

```bash
# From frontend/ directory
ADMIN_SECRET_KEY="SXXX..." \
NEXT_PUBLIC_CONTRACT_ID="CXXX..." \
node scripts/init-poll.mjs
```

### 5. Run the frontend

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 📋 Smart Contract Functions

| Function | Description |
|---|---|
| `initialize_poll(admin, question, options)` | Set up the poll (admin only, once) |
| `vote(voter, option_index)` | Cast a vote |
| `get_poll()` | Get full poll data |
| `get_results()` | Get vote counts array |
| `has_voted(address)` | Check if address voted |
| `get_total_votes()` | Total vote count |
| `is_initialized()` | Whether poll is ready |

### Contract Events

| Event | Topics | Data |
|---|---|---|
| `PollInitialized` | `["poll", "init"]` | question |
| `VoteCast` | `["poll", "vote"]` | (voter, option_index, option_label) |

---

## ❗ Error Handling

The app handles all 3 required error types:

| Error | Cause | UI Response |
|---|---|---|
| `WALLET_NOT_FOUND` | No compatible wallet installed | Alert with install link |
| `USER_REJECTED` | User dismissed wallet popup | "Transaction rejected" message |
| `INSUFFICIENT_BALANCE` | Not enough XLM for fees | Error with Friendbot link |

---

## ⚡ Real-Time Events

Vote results and the activity feed update automatically every **3 seconds** using Soroban's `getEvents` RPC endpoint. No page refresh needed.

---

## 🌐 Deployment

### Deploy frontend to Vercel

```bash
# From frontend/ directory
npx vercel --prod
# Set NEXT_PUBLIC_CONTRACT_ID in Vercel environment variables
```

### Deploy contract

```bash
./scripts/deploy-contract.sh
```

---

## 📂 Project Structure

```
stellar-live-poll/
├── contract/                   # Soroban smart contract (Rust)
│   ├── src/lib.rs              # Contract logic
│   └── Cargo.toml
├── frontend/                   # Next.js app
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Main UI page
│   │   └── globals.css
│   ├── components/
│   │   ├── Hero.tsx
│   │   ├── WalletSection.tsx   # Wallet connect/disconnect
│   │   ├── PollCard.tsx        # Vote buttons + results
│   │   ├── TxStatusPanel.tsx   # Transaction status
│   │   ├── EventFeed.tsx       # Live activity feed
│   │   ├── StatsBar.tsx        # Summary stats
│   │   ├── AdminPanel.tsx      # Poll initialization
│   │   └── SuccessConfetti.tsx # Vote success animation
│   ├── hooks/
│   │   ├── usePoll.ts          # Core state management
│   │   └── useAdmin.ts         # Admin poll creation
│   ├── lib/
│   │   ├── stellar-contract.ts # Soroban read/write
│   │   ├── wallet.ts           # StellarWalletsKit
│   │   ├── events.ts           # Real-time event listener
│   │   └── utils.ts
│   ├── types/index.ts          # TypeScript types
│   ├── scripts/
│   │   └── init-poll.mjs       # CLI poll initialization
│   └── .env.example
├── scripts/
│   └── deploy-contract.sh      # Contract deploy script
└── README.md
```

---

## 🏆 Yellow Belt Requirements Checklist

| Requirement | Status |
|---|---|
| Multi-wallet integration (StellarWalletsKit) | ✅ |
| Error: wallet not found | ✅ |
| Error: user rejected transaction | ✅ |
| Error: insufficient balance / failed tx | ✅ |
| Deployed Soroban contract on testnet | ✅ |
| Call smart contract from frontend | ✅ |
| Read AND write to contract | ✅ |
| Real-time event listening + state sync | ✅ |
| Transaction status: pending/success/fail | ✅ |
| Hackathon-quality README | ✅ |
| Clean GitHub-ready structure | ✅ |
| Vercel deployable | ✅ |

---

## 👤 Author

Built by **Ankit** for the Stellar Journey to Mastery — Yellow Belt submission.

- GitHub: [github.com/yourusername](https://github.com/yourusername)
- Twitter: [@yourhandle](https://twitter.com/yourhandle)

---

## 📄 License

MIT
