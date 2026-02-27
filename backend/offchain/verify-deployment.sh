#!/bin/bash

###############################################################################
#           Reward Pool - Post-Deployment Verification Script                #
#                                                                             #
# Bu script, deployment dogrulama kontrollerini yapar                      #
###############################################################################

set -e

. .env.devnet

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          Reward Pool Verification Tests                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

PASS_COUNT=0
FAIL_COUNT=0

# Test 1: Check network connectivity
echo "🧪 Test 1: Network Connectivity"
if solana cluster-version -u "$RPC_URL" > /dev/null 2>&1; then
    echo "   ✅ PASS - Network connected"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo "   ❌ FAIL - Network not connected"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

# Test 2: Check program exists
echo "🧪 Test 2: Program Deployed"
if solana account $PROGRAM_ID -u $RPC_URL > /dev/null 2>&1; then
    echo "   ✅ PASS - Program deployed at $PROGRAM_ID"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo "   ❌ FAIL - Program not found"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

# Test 3: Check transaction history
echo "🧪 Test 3: Recent Transactions"
echo "   Last 5 transactions on program:"
solana transaction-history $PROGRAM_ID -u $RPC_URL -l 5 2>/dev/null | head -10 || echo "   (Transaction history not available)"
echo ""

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                      Test Summary                              ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║ Passed:  ✅ $PASS_COUNT                                        ║"
echo "║ Failed:  ❌ $FAIL_COUNT                                        ║"
echo "║ Success: $(( (PASS_COUNT * 100) / (PASS_COUNT + FAIL_COUNT) ))%                                         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo "✅ All verification tests passed!"
    exit 0
else
    echo "❌ Some tests failed. Check configuration."
    exit 1
fi
