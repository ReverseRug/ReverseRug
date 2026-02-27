#!/bin/bash
set -euo pipefail

USDC_MINT="${USDC_MINT:-Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr}"
RPC_URL="${RPC_URL:-https://api.devnet.solana.com}"
CRON_KEYPAIR="${CRON_KEYPAIR:-$HOME/.config/solana/id.json}"
PARTICIPANTS_GLOB="${PARTICIPANTS_GLOB:-$PWD/keys/participants/p*.json}"
AMOUNT_PER_PARTICIPANT="${AMOUNT_PER_PARTICIPANT:-200}"

if [ ! -f "$CRON_KEYPAIR" ]; then
  echo "Missing keypair: $CRON_KEYPAIR"
  exit 1
fi

echo "Distributing USDC to participant wallets"
echo "Amount per participant: ${AMOUNT_PER_PARTICIPANT} USDC"
echo "RPC: ${RPC_URL}"

i=1
for f in $PARTICIPANTS_GLOB; do
  [ -f "$f" ] || continue

  pub=$(solana-keygen pubkey "$f")
  ata=$(spl-token address --verbose --token "$USDC_MINT" --owner "$pub" | awk '/Associated token address:/ {print $4}')
  before=$(spl-token balance --address "$ata" --url "$RPC_URL" 2>/dev/null || echo "0")

  echo "Top-up p$i -> $pub (${AMOUNT_PER_PARTICIPANT} USDC)"
  echo "  Balance before: ${before} USDC"

  attempt=1
  status=1
  while [ "$attempt" -le 3 ]; do
    spl-token transfer --fund-recipient "$USDC_MINT" "$AMOUNT_PER_PARTICIPANT" "$pub" --owner "$CRON_KEYPAIR" --fee-payer "$CRON_KEYPAIR" --url "$RPC_URL" > "/tmp/topup-p$i.log" 2>&1 && status=0 || status=$?
    if [ "$status" -eq 0 ]; then
      break
    fi
    if grep -q "exceeded CUs meter" "/tmp/topup-p$i.log"; then
      echo "  RPC simulation failed (CUs meter). Retrying... ($attempt/3)"
      sleep 2
      attempt=$((attempt + 1))
      continue
    fi
    echo "  Transfer failed. Log: /tmp/topup-p$i.log"
    exit 1
  done

  if [ "$status" -ne 0 ]; then
    echo "  Transfer failed after 3 retries. Log: /tmp/topup-p$i.log"
    exit 1
  fi

  after=$(spl-token balance --address "$ata" --url "$RPC_URL" 2>/dev/null || echo "0")
  echo "  Balance after: ${after} USDC"
  i=$((i + 1))
done

echo "Done. Logs: /tmp/topup-p*.log"
