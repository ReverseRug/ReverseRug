#!/bin/bash

# Scenario 1 setup
# 20 participants, 60-second round, vault lock

set -e

echo "======================================"
echo "SCENARIO 1 SETUP STARTED"
echo "======================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Step 1: Close existing global state
echo "Step 1: Closing GlobalState..."
npm run close-global-state 2>&1 | grep -E "closed|error|successfully" || true

sleep 2

# Step 2: Initialize clean state
echo "Step 2: Initializing GlobalState..."
npm run init 2>&1 | tail -5

sleep 3

# Step 3: Start epoch (60 seconds)
echo "Step 3: Starting 60-second epoch..."
npm run start-epoch 2>&1 | tail -5

# Step 4: Lock vault for 60 seconds
echo "Step 4: Locking vault for 60 seconds..."
npm run lock:vault -- 60 2>&1 | tail -3

sleep 2

# Step 5: Verify lock status
echo "Step 5: Checking vault lock status..."
npm run check:vault-lock 2>&1 | grep -A 5 "🔒"

echo ""
echo "======================================"
echo "SCENARIO 1 SETUP COMPLETED"
echo "======================================"
