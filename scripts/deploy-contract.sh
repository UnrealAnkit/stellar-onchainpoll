#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy-contract.sh
# Deploy the Stellar Live Poll Soroban contract to Stellar Testnet
#
# Prerequisites:
#   - Rust + wasm32-unknown-unknown target installed
#   - stellar CLI installed: https://developers.stellar.org/docs/tools/stellar-cli
#   - A funded testnet account (create at: https://laboratory.stellar.org)
#
# Usage:
#   export ADMIN_SECRET_KEY="SXXXXXXXXXX..."
#   chmod +x deploy-contract.sh
#   ./deploy-contract.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

echo ""
echo "🚀 Stellar Live Poll — Contract Deployment"
echo "──────────────────────────────────────────"
echo ""

# ── Check prerequisites ───────────────────────────────────────────────────────

if ! command -v stellar &>/dev/null; then
  echo "❌ stellar CLI not found. Install it:"
  echo "   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
  echo "   cargo install --locked stellar-cli --features opt"
  exit 1
fi

if ! command -v cargo &>/dev/null; then
  echo "❌ Rust/cargo not found. Install from https://rustup.rs"
  exit 1
fi

if [ -z "$ADMIN_SECRET_KEY" ]; then
  echo "❌ ADMIN_SECRET_KEY env var not set."
  echo "   Export your testnet secret key:"
  echo "   export ADMIN_SECRET_KEY=SXXXXXXXXXX..."
  exit 1
fi

# ── Configure Stellar CLI ─────────────────────────────────────────────────────

echo "📡 Configuring Stellar CLI for testnet..."
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015" \
  2>/dev/null || true

stellar keys add admin --secret-key "$ADMIN_SECRET_KEY" 2>/dev/null || true

ADMIN_PUBKEY=$(stellar keys public-key admin)
echo "   Admin public key: $ADMIN_PUBKEY"

# ── Fund account if needed ────────────────────────────────────────────────────

echo ""
echo "💰 Funding testnet account via Friendbot..."
curl -s "https://friendbot.stellar.org?addr=$ADMIN_PUBKEY" > /dev/null && echo "   Account funded!" || echo "   (Account may already be funded, continuing...)"

# ── Build contract ────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
CONTRACT_DIR="$REPO_ROOT/contract"

echo ""
echo "🔨 Building Soroban contract..."
cd "$CONTRACT_DIR"

# Add wasm target if not present
rustup target add wasm32-unknown-unknown 2>/dev/null || true

# Build in release mode
cargo build --release --target wasm32-unknown-unknown 2>&1 | tail -5

WASM_PATH="$CONTRACT_DIR/target/wasm32-unknown-unknown/release/stellar_live_poll.wasm"

if [ ! -f "$WASM_PATH" ]; then
  echo "❌ Build failed: wasm file not found at $WASM_PATH"
  exit 1
fi

echo "   WASM built: $WASM_PATH"

# ── Optimize WASM ─────────────────────────────────────────────────────────────

echo ""
echo "⚡ Optimizing WASM..."
stellar contract optimize --wasm "$WASM_PATH" 2>/dev/null || echo "   (Optimization skipped, using unoptimized build)"

OPTIMIZED="${WASM_PATH%.wasm}.optimized.wasm"
DEPLOY_WASM="$OPTIMIZED"
if [ ! -f "$OPTIMIZED" ]; then
  DEPLOY_WASM="$WASM_PATH"
fi

# ── Upload + Deploy ───────────────────────────────────────────────────────────

echo ""
echo "📤 Deploying to Stellar Testnet..."

CONTRACT_ID=$(stellar contract deploy \
  --wasm "$DEPLOY_WASM" \
  --source admin \
  --network testnet \
  --ignore-checks)

echo ""
echo "✅ Contract deployed!"
echo ""
echo "   CONTRACT_ID: $CONTRACT_ID"
echo ""
echo "──────────────────────────────────────────"
echo "📋 Next steps:"
echo ""
echo "1. Copy this CONTRACT_ID into frontend/.env.local:"
echo "   NEXT_PUBLIC_CONTRACT_ID=$CONTRACT_ID"
echo ""
echo "2. Initialize the poll (run from frontend/ directory):"
echo "   ADMIN_SECRET_KEY=\"$ADMIN_SECRET_KEY\" \\"
echo "   NEXT_PUBLIC_CONTRACT_ID=\"$CONTRACT_ID\" \\"
echo "   node scripts/init-poll.mjs"
echo ""
echo "3. Start the frontend:"
echo "   cd frontend && npm run dev"
echo ""
echo "🔍 View contract on Stellar Expert:"
echo "   https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"
echo "──────────────────────────────────────────"
