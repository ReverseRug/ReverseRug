#!/bin/bash

###############################################################################
#                    VRF Integration Deployment Guide                         #
#                                                                             #
# Deploys Switchboard VRF v2 integration to devnet.                           #
# Prerequisites:                                                              #
#   - Solana CLI installed                                                    #
#   - Anchor installed                                                        #
#   - Keypair funded with SOL and USDC                                        #
#   - .env.devnet file configured                                              #
###############################################################################

set -euo pipefail

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         VRF Integration Deployment Flow (Devnet)             ║"
echo "╚═══════════════════════════════════════════════════════════════╝"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ ! -f .env.devnet ]; then
    echo -e "${RED}❌ .env.devnet not found${NC}"
    exit 1
fi

source .env.devnet

echo -e "${BLUE}Configuration Check${NC}"
echo "  RPC_URL: $RPC_URL"
echo "  PROGRAM_ID: $PROGRAM_ID"
echo "  CRON_KEYPAIR: $CRON_KEYPAIR"
echo "  SWITCHBOARD_PROGRAM_ID: ${SWITCHBOARD_PROGRAM_ID:-}"
echo ""

echo -e "${BLUE}Step 1: Verify network${NC}"
if solana cluster-version -u "$RPC_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Network reachable${NC}"
else
    echo -e "${RED}❌ Cannot reach network${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}Step 2: Check signer balance${NC}"
BALANCE=$(solana balance -u "$RPC_URL" "$CRON_KEYPAIR")
echo "  Balance: $BALANCE"
if echo "$BALANCE" | grep -q "0 SOL"; then
    echo -e "${RED}❌ Insufficient balance${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Balance check passed${NC}"
echo ""

echo -e "${BLUE}Step 3: Initialize pool${NC}"
cd ../offchain
npm run init 2>&1 | tail -5
echo -e "${GREEN}✅ Pool initialized${NC}"
echo ""

echo -e "${BLUE}Step 4: Start epoch${NC}"
npm run start:epoch 2>&1 | tail -5
echo -e "${GREEN}✅ Epoch started${NC}"
echo ""

echo -e "${BLUE}Step 5: Create VRF account${NC}"
VRF_OUTPUT=$(npm run vrf:create 2>&1)
echo "$VRF_OUTPUT" | tail -20

VRF_INFO_PATH="${VRF_INFO_PATH:-$PWD/vrf-info.json}"
if [ ! -f "$VRF_INFO_PATH" ]; then
    echo -e "${RED}❌ VRF info file not found: $VRF_INFO_PATH${NC}"
    echo "Set VRF_INFO_PATH if your output file is in a different location."
    exit 1
fi

VRF_ACCOUNT=$(grep '"vrfAccount"' "$VRF_INFO_PATH" | sed 's/.*: "\(.*\)".*/\1/')
ORACLE_QUEUE=$(grep '"oracleQueue"' "$VRF_INFO_PATH" | sed 's/.*: "\(.*\)".*/\1/')
QUEUE_AUTH=$(grep '"queueAuthority"' "$VRF_INFO_PATH" | sed 's/.*: "\(.*\)".*/\1/')
DATA_BUFFER=$(grep '"dataBuffer"' "$VRF_INFO_PATH" | sed 's/.*: "\(.*\)".*/\1/')
PERMISSION=$(grep '"permissionAccount"' "$VRF_INFO_PATH" | sed 's/.*: "\(.*\)".*/\1/')
ESCROW=$(grep '"escrow"' "$VRF_INFO_PATH" | sed 's/.*: "\(.*\)".*/\1/')
PAYER_WALLET=$(grep '"payerWallet"' "$VRF_INFO_PATH" | sed 's/.*: "\(.*\)".*/\1/')
PROGRAM_STATE=$(grep '"programState"' "$VRF_INFO_PATH" | sed 's/.*: "\(.*\)".*/\1/')

echo -e "${YELLOW}Append these values to .env.devnet:${NC}"
echo "SWITCHBOARD_VRF_ACCOUNT=$VRF_ACCOUNT"
echo "SWITCHBOARD_ORACLE_QUEUE=$ORACLE_QUEUE"
echo "SWITCHBOARD_QUEUE_AUTHORITY=$QUEUE_AUTH"
echo "SWITCHBOARD_DATA_BUFFER=$DATA_BUFFER"
echo "SWITCHBOARD_PERMISSION=$PERMISSION"
echo "SWITCHBOARD_ESCROW=$ESCROW"
echo "SWITCHBOARD_PAYER_WALLET=$PAYER_WALLET"
echo "SWITCHBOARD_PROGRAM_STATE=$PROGRAM_STATE"
echo ""

cat >> .env.devnet << EOF_APPEND

# VRF account addresses (auto-generated)
SWITCHBOARD_VRF_ACCOUNT=$VRF_ACCOUNT
SWITCHBOARD_ORACLE_QUEUE=$ORACLE_QUEUE
SWITCHBOARD_QUEUE_AUTHORITY=$QUEUE_AUTH
SWITCHBOARD_DATA_BUFFER=$DATA_BUFFER
SWITCHBOARD_PERMISSION=$PERMISSION
SWITCHBOARD_ESCROW=$ESCROW
SWITCHBOARD_PAYER_WALLET=$PAYER_WALLET
SWITCHBOARD_PROGRAM_STATE=$PROGRAM_STATE
EOF_APPEND

echo -e "${GREEN}✅ VRF account created${NC}"
echo ""

echo -e "${BLUE}Step 6: Set VRF config${NC}"
source .env.devnet
npm run vrf:set 2>&1 | tail -10
echo -e "${GREEN}✅ VRF config set${NC}"
echo ""

echo -e "${BLUE}Step 7: Request randomness${NC}"
npm run vrf:request 2>&1 | tail -10
echo -e "${GREEN}✅ Randomness requested${NC}"
echo ""

echo -e "${BLUE}Step 8: Verify callback${NC}"
echo "Waiting 10 seconds for callback..."
sleep 10
echo "TODO: add automated get-state verification"
echo ""

echo -e "${BLUE}Step 9: Run weekly distribution${NC}"
echo "Run: npm run dev"
echo ""

echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ VRF integration deployment completed${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "  1. Monitor logs: solana logs <PROGRAM_ID> -u devnet"
echo "  2. Verify next epoch distribution"
echo "  3. Test duplicate callback rejection"
echo "  4. Prepare mainnet rollout"
