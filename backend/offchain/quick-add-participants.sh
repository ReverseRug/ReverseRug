#!/bin/bash

NUM_PARTICIPANTS=${1:-5}
AMOUNT_USDC=${2:-100}

echo "🚀 Quick Participant Addition"
echo "================================"
echo "Adding $NUM_PARTICIPANTS participants @ $AMOUNT_USDC USDC each"
echo ""

KEYS_DIR="${KEYS_DIR:-$PWD/../../keys/participants}"

# Check dir
if [ ! -d "$KEYS_DIR" ]; then
  echo "❌ Keys directory not found: $KEYS_DIR"
  exit 1
fi

success=0
failed=0

for i in $(seq 1 $NUM_PARTICIPANTS); do
  keypair="$KEYS_DIR/p$i.json"
  
  if [ ! -f "$keypair" ]; then
    echo "[p$i] Keypair not found, skipping"
    continue
  fi
  
  printf "[p$i] Depositing $AMOUNT_USDC USDC... "
  
  if PARTICIPANT_KEYPAIR="$keypair" node --loader ts-node/esm src/scripts/deposit.ts "$AMOUNT_USDC" > /tmp/p$i.log 2>&1; then
    echo "✅"
    ((success+=1))
  else
    echo "❌"
    ((failed+=1))
    # Show error
    echo "---"
    tail -3 /tmp/p$i.log
    echo "---"
  fi
  
  sleep 1
done

echo ""
echo "================================"
echo "✅ Success: $success/$NUM_PARTICIPANTS"
[ $failed -gt 0 ] && echo "❌ Failed: $failed/$NUM_PARTICIPANTS"
echo "================================"

rm -f /tmp/p*.log 2>/dev/null
exit 0
