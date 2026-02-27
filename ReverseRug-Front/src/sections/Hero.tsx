import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, type Transaction } from "@solana/web3.js";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { LiveRoundCard } from "@/components/LiveRoundCard";
import { useRoundData, useParticipantData } from "@/hooks/useRoundData";
import { createDepositTransaction, confirmTransaction, createPartialWithdrawTransaction, createClaimTransaction } from "@/lib/solana";

interface ClaimPreview {
  epoch: number;
  amountUsdc: number;
  isWinner: boolean;
  claimable: boolean;
  claimed: boolean;
}

export const Hero = () => {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { data: roundData } = useRoundData();
  const { data: participantData, loading: checkingStatus, refresh: refreshParticipant } = useParticipantData(publicKey?.toString() || null);
  const [isMobile, setIsMobile] = useState(false);
  const [isPhantomInAppBrowser, setIsPhantomInAppBrowser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [showCarryoverModal, setShowCarryoverModal] = useState(false);
  const [carryoverAcknowledged, setCarryoverAcknowledged] = useState(false);
  const [claimAvailable, setClaimAvailable] = useState(false);
  const [claimPreview, setClaimPreview] = useState<ClaimPreview | null>(null);
  const [checkingClaim, setCheckingClaim] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const lateJoinLockSecs = Number(import.meta.env.VITE_LATE_JOIN_LOCK_SECONDS ?? 86400);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const userAgent = navigator.userAgent || "";
    const mobile = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(userAgent);
    const phantomInApp = /Phantom/i.test(userAgent);
    setIsMobile(mobile);
    setIsPhantomInAppBrowser(phantomInApp);
  }, []);

  // Load carryover choice from localStorage (per wallet + epoch)
  useEffect(() => {
    if (roundData?.carryoverEpoch && publicKey) {
      const key = `carryover-choice-${publicKey.toString()}-${roundData.carryoverEpoch}`;
      const choice = localStorage.getItem(key);
      setCarryoverAcknowledged(Boolean(choice));
    }
  }, [roundData?.carryoverEpoch, publicKey]);

  // Show carryover modal if user has carryover and hasn't acknowledged
  useEffect(() => {
    if (!carryoverAcknowledged && participantData?.carryover && participantData.carryover.eligible) {
      setShowCarryoverModal(true);
    }
  }, [carryoverAcknowledged, participantData?.carryover]);

  useEffect(() => {
    let cancelled = false;

      const checkClaimAvailability = async () => {
        if (!publicKey || roundData?.currentEpoch === undefined) {
          setClaimAvailable(false);
          setClaimPreview(null);
          return;
        }

        setCheckingClaim(true);
        try {
        const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) || "/api";
        const params = new URLSearchParams({
          address: publicKey.toBase58(),
          epoch: String(roundData.currentEpoch),
        });

          const response = await fetch(`${apiUrl}/round-result?${params.toString()}`, {
            cache: "no-store",
          });
          if (!response.ok) {
            if (!cancelled) {
              setClaimAvailable(false);
              setClaimPreview(null);
            }
          return;
        }

          const payload = await response.json();
          const data = payload?.data;
          if (!payload?.success || !data) {
            if (!cancelled) {
              setClaimAvailable(false);
              setClaimPreview(null);
            }
            return;
          }

          if (data.status === "winner" || data.status === "refund") {
            const preview: ClaimPreview = {
              epoch: Number(data.epoch),
              amountUsdc: Number(data.amountUsdc ?? 0),
              isWinner: Boolean(data.isWinner),
              claimable: Boolean(data.claimable),
              claimed: Boolean(data.claimed),
            };
            if (!cancelled) {
              setClaimAvailable(preview.claimable);
              setClaimPreview(preview);
            }
          } else if (!cancelled) {
            setClaimAvailable(false);
            setClaimPreview(null);
          }
        } catch {
          if (!cancelled) {
            setClaimAvailable(false);
            setClaimPreview(null);
        }
      } finally {
        if (!cancelled) setCheckingClaim(false);
      }
    };

    checkClaimAvailability();

    return () => {
      cancelled = true;
    };
  }, [publicKey, roundData?.currentEpoch]);

  useEffect(() => {
    if (!publicKey || !roundData?.currentEpoch) return;
    if (!claimPreview || claimPreview.epoch !== roundData.currentEpoch) return;

    const key = `settlement-modal-${publicKey.toBase58()}-${roundData.currentEpoch}`;
    if (localStorage.getItem(key)) return;

    setShowSettlementModal(true);
    localStorage.setItem(key, "shown");
  }, [publicKey, roundData?.currentEpoch, claimPreview]);

  const handlePartialWithdraw = async () => {
    if (!publicKey) {
      setError("Please connect wallet first");
      return;
    }

    setWithdrawing(true);
    setError("");
    setSuccess("");
    setTxSignature(null);

    let transaction: Transaction | null = null;

    try {
      transaction = await createPartialWithdrawTransaction({
        connection,
        userPublicKey: publicKey,
        carryoverEpoch: roundData?.carryoverEpoch,
      });

      const signature = await sendTransaction(transaction, connection);
      setTxSignature(signature);
      setSuccess("50% refund requested. Confirming...");

      const confirmed = await confirmTransaction(connection, signature);
      if (confirmed) {
        setSuccess("✅ 50% refund completed. You're out of this carryover round.");
        setShowCarryoverModal(false);
        setCarryoverAcknowledged(true);
        if (roundData?.carryoverEpoch && publicKey) {
          const key = `carryover-choice-${publicKey.toString()}-${roundData.carryoverEpoch}`;
          localStorage.setItem(key, 'withdraw');
        }
        setTimeout(() => refreshParticipant(), 2000);
      } else {
        setError("Refund transaction failed to confirm");
      }
    } catch (err: any) {
      console.error('Refund error:', err);
      setError(err.message || "Refund failed");
    } finally {
      setWithdrawing(false);
    }
  };

  const handleDeposit = async () => {
    if (!publicKey) {
      setError("Please connect wallet first");
      return;
    }
    if (isRoundEnded) {
      setError("Round ended. Deposits are closed until next epoch starts.");
      return;
    }
    
    // Check if vault is locked
    if (roundData?.vaultLocked) {
      setError("Vault is currently locked. Deposits are disabled.");
      return;
    }
    
    // Check if already participated
    if (participantData?.exists) {
      setError("You have already deposited in this round! Wait for the next round to deposit again.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    setTxSignature(null);

    let transaction: Transaction | null = null;

    try {
      const amount = Math.round(roundData?.minDepositUsd ?? 100);
      
      // Create Solana transaction
      console.log('Creating deposit transaction for:', amount, 'USDC');
      transaction = await createDepositTransaction({
        connection,
        userPublicKey: publicKey,
        amount,
      });
      
      // Send transaction
      console.log('Sending transaction...');
      const signature = await sendTransaction(transaction, connection);
      setTxSignature(signature);
      
      console.log('Transaction sent:', signature);
      setSuccess(`Transaction sent! Confirming...`);
      
      // Wait for confirmation
      const confirmed = await confirmTransaction(connection, signature);
      
      if (confirmed) {
        setSuccess(`✅ Deposited ${amount} USDC successfully!`);
        console.log('Transaction confirmed:', signature);
        // Refresh status after successful deposit
        setTimeout(() => refreshParticipant(), 2000);
      } else {
        setError('Transaction failed to confirm');
      }
    } catch (err: any) {
      console.error('Deposit error:', err);
      console.error('Wallet error details:', {
        name: err?.name,
        message: err?.message,
        cause: err?.cause,
        logs: err?.logs,
        transactionMessage: err?.transactionMessage,
      });

      if (transaction) {
        try {
          const simulation = await connection.simulateTransaction(transaction);
          console.error('Simulation logs:', simulation.value.logs);
          if (simulation.value.err) {
            console.error('Simulation error:', simulation.value.err);
          }
        } catch (simulationErr) {
          console.error('Simulation failed:', simulationErr);
        }
      }

      setError(err.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!publicKey) {
      setError("Please connect wallet first");
      return;
    }

    setClaiming(true);
    setError("");
    setSuccess("");
    setTxSignature(null);

    let transaction: Transaction | null = null;

    try {
      const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) || "/api";
      const params = new URLSearchParams({ address: publicKey.toBase58() });
      if (roundData?.currentEpoch !== undefined) {
        params.set("epoch", String(roundData.currentEpoch));
      }

      const response = await fetch(`${apiUrl}/claim-proof?${params.toString()}`);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Claim proof fetch failed: ${text}`);
      }

      const payload = await response.json();
      if (!payload?.success || !payload?.data) {
        throw new Error(payload?.error || "Claim proof not available");
      }

      const epoch = BigInt(payload.data.epoch);
      const amount = BigInt(payload.data.amount);
      const proof = payload.data.proof as string[];

      transaction = await createClaimTransaction({
        connection,
        userPublicKey: publicKey,
        epoch,
        amount,
        proof,
      });

      const signature = await sendTransaction(transaction, connection);
      setTxSignature(signature);
      setSuccess("Claim transaction sent. Confirming...");

      const confirmed = await confirmTransaction(connection, signature);
      if (confirmed) {
        setSuccess("✅ Claim successful");
        setClaimAvailable(false);
        setTimeout(() => refreshParticipant(), 2000);
      } else {
        setError("Claim transaction failed to confirm");
      }
    } catch (err: any) {
      console.error('Claim error:', err);
      if (transaction) {
        try {
          const simulation = await connection.simulateTransaction(transaction);
          console.error('Claim simulation logs:', simulation.value.logs);
          if (simulation.value.err) {
            console.error('Claim simulation error:', simulation.value.err);
          }
        } catch (simulationErr) {
          console.error('Claim simulation failed:', simulationErr);
        }
      }
      setError(err.message || "Claim failed");
    } finally {
      setClaiming(false);
    }
  };

  const handleOpenInPhantomApp = () => {
    if (typeof window === "undefined") return;
    const currentUrl = window.location.href;
    const ref = window.location.origin;
    const deepLink = `https://phantom.app/ul/browse/${encodeURIComponent(currentUrl)}?ref=${encodeURIComponent(ref)}`;
    window.location.href = deepLink;
  };

  const now = Math.floor(Date.now() / 1000);
  const epochEnd = roundData?.epochEnd ?? 0;
  const isRoundEnded = Boolean(epochEnd && now >= epochEnd);
  const lateJoinCutoff = epochEnd - lateJoinLockSecs;
  
  // For carryover participants: NO late-join lock since they're from previous epoch
  // For current epoch participants: Apply late-join lock rules
  const currentDepositTime = participantData?.lastDepositTime;
  const isLateJoinLocked = participantData?.carryover 
    ? false // Carryover participants can always withdraw
    : Boolean(
        roundData?.epochEnd &&
        currentDepositTime &&
        currentDepositTime >= lateJoinCutoff &&
        now < epochEnd + lateJoinLockSecs
      );

  const hasDeposit = Boolean(participantData?.exists || participantData?.carryover?.eligible);
  const roundFinalized = (roundData?.totalPayout ?? 0) > 0;
  const showClaim = claimAvailable;
  const showWithdraw = Boolean(participantData?.carryover?.eligible) && !showClaim;

  return (
    <section id="enter-round" className="relative overflow-hidden py-10 md:py-24">
      {/* Floating Shapes */}
      <motion.div
        animate={{
          rotate: [12, 18, 12],
          y: [0, -10, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bg-[#06B6D4]/20 h-32 w-32 border-4 border-black left-10 top-20 hidden lg:block"
      />
      <motion.div
        animate={{
          rotate: [-6, 0, -6],
          y: [0, 10, 0],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5,
        }}
        className="absolute bg-[#F97316]/20 h-24 w-24 border-4 border-black right-20 top-40 hidden lg:block"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="space-y-6">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl md:text-6xl lg:text-7xl font-black uppercase leading-tight"
              >
                Reverse
                <motion.span
                  initial={{ opacity: 0, rotate: -2 }}
                  animate={{ opacity: 1, rotate: -1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="inline-block bg-[#FBBF24] px-3 py-2 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ml-2 md:ml-3"
                >
                  RUG
                </motion.span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-2xl md:text-3xl font-bold text-[#06B6D4]"
              >
                Anti-rug pool prize share
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-lg md:text-xl text-[#475569] font-bold max-w-xl"
              >
                Fixed rules. Capped downside. On-chain execution.
              </motion.p>
            </div>

            {/* Wallet Connection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mb-6"
            >
              {!publicKey ? (
                isMobile && !isPhantomInAppBrowser ? (
                  <button
                    type="button"
                    onClick={handleOpenInPhantomApp}
                    className="w-full sm:w-auto px-6 py-4 text-base sm:text-lg font-black uppercase tracking-wide text-black bg-[#06B6D4] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all"
                  >
                    Connect Wallet
                  </button>
                ) : (
                  <WalletMultiButton 
                    className="!w-full sm:!w-auto !px-6 !py-4 !text-base sm:!text-lg !font-black !uppercase !tracking-wide !text-black !bg-[#06B6D4] !border-4 !border-black !shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:!shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:!translate-y-[-2px] !transition-all !rounded-none"
                  />
                )
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      onClick={() => window.location.reload()}
                      className="w-full sm:w-auto px-5 sm:px-8 py-4 text-base sm:text-lg font-black uppercase tracking-wide text-black bg-[#06B6D4] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all break-all"
                    >
                      {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)} • Connected
                    </button>
                    {showWithdraw && (
                      <button
                        onClick={handlePartialWithdraw}
                        disabled={withdrawing || !participantData?.carryover?.eligible}
                        title={participantData?.carryover?.eligible ? "Withdraw 50%" : "Refund available after carryover"}
                        className="w-full sm:w-auto px-6 py-4 text-base font-black uppercase tracking-wide text-black bg-[#F97316] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {withdrawing ? "Processing..." : "Withdraw 50%"}
                      </button>
                    )}
                    {showClaim && (
                      <button
                        onClick={handleClaim}
                        disabled={claiming || !publicKey || checkingClaim}
                        className="w-full sm:w-auto px-6 py-4 text-base font-black uppercase tracking-wide text-black bg-[#22C55E] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {claiming || checkingClaim
                          ? "Processing..."
                          : claimPreview?.isWinner
                            ? `Claim Prize (${claimPreview.amountUsdc.toFixed(0)} USDC)`
                            : `Claim Refund (${claimPreview?.amountUsdc.toFixed(0) ?? 50} USDC)`}
                      </button>
                    )}
                  </div>
                  {showClaim && (
                    <p className="text-sm text-[#15803D] font-bold">
                      {claimPreview?.isWinner
                        ? `Winner payout ready from round ${claimPreview.epoch}.`
                        : `Refund is ready from round ${claimPreview?.epoch ?? roundData?.currentEpoch}.`}
                    </p>
                  )}
                  {!showClaim && hasDeposit && roundFinalized && !checkingClaim && (
                    <p className="text-sm text-[#92400E] font-bold">
                      {claimPreview?.claimed
                        ? "Your payout/refund is already claimed for this round."
                        : "No claimable payout right now (withdrew, or not settled yet)."}
                    </p>
                  )}
                  <p className="text-sm text-gray-600">Wallet connected. You can deposit below.</p>
                </div>
              )}
            </motion.div>

            {/* Status Messages */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 bg-red-100 border-4 border-black text-red-700 font-bold"
              >
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 bg-green-100 border-4 border-black text-green-700 font-bold space-y-2"
              >
                <div>{success}</div>
                {txSignature && (
                  <div className="text-sm">
                    <a 
                      href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-green-900"
                    >
                      View on Explorer →
                    </a>
                  </div>
                )}
              </motion.div>
            )}

            {showSettlementModal && claimPreview && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                onClick={() => setShowSettlementModal(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] max-w-lg w-full p-6 space-y-5"
                >
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black uppercase">
                      {claimPreview.isWinner ? "Congratulations!" : "Round Settled"}
                    </h3>
                    <p className="text-sm font-bold text-[#475569]">
                      Round {claimPreview.epoch} has been finalized.
                    </p>
                  </div>
                  <div className={`p-4 border-4 ${claimPreview.isWinner ? "bg-[#DCFCE7] border-[#22C55E]" : "bg-[#FEF3C7] border-[#F97316]"}`}>
                    <p className="text-base font-black text-[#0F172A]">
                      {claimPreview.claimed
                        ? (claimPreview.isWinner
                            ? `You already claimed ${claimPreview.amountUsdc.toFixed(0)} USDC from this round.`
                            : `You already claimed your ${claimPreview.amountUsdc.toFixed(0)} USDC refund.`)
                        : (claimPreview.isWinner
                            ? `You won ${claimPreview.amountUsdc.toFixed(0)} USDC.`
                            : `You can claim ${claimPreview.amountUsdc.toFixed(0)} USDC refund.`)}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSettlementModal(false)}
                    className="w-full px-6 py-4 text-base font-black uppercase tracking-wide text-black bg-[#06B6D4] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all"
                  >
                    Got It
                  </button>
                </motion.div>
              </motion.div>
            )}

            {showCarryoverModal && participantData?.carryover && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                onClick={() => setShowCarryoverModal(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] max-w-lg w-full p-6 space-y-5"
                >
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black uppercase">Carryover Choice</h3>
                    <p className="text-sm font-bold text-[#475569]">
                      This round didn’t reach 20 participants. You can withdraw 50% now or stay for the next round.
                    </p>
                  </div>

                  {isLateJoinLocked && (
                    <div className="bg-[#FEF3C7] border-4 border-[#FBBF24] p-3">
                      <p className="text-sm font-bold text-[#92400E]">
                        Late-join lock: refunds unlock {lateJoinLockSecs}s after round end.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handlePartialWithdraw}
                      disabled={withdrawing || isLateJoinLocked}
                      className="flex-1 px-6 py-4 text-base font-black uppercase tracking-wide text-black bg-[#F97316] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {withdrawing ? "Processing..." : "Withdraw 50%"}
                    </button>
                    <button
                      onClick={() => {
                        if (roundData?.carryoverEpoch && publicKey) {
                          const key = `carryover-choice-${publicKey.toString()}-${roundData.carryoverEpoch}`;
                          localStorage.setItem(key, 'stay');
                        }
                        setCarryoverAcknowledged(true);
                        setShowCarryoverModal(false);
                        setSuccess("✅ You chose to stay in the carryover round. You can withdraw 50% anytime.");
                      }}
                      className="flex-1 px-6 py-4 text-base font-black uppercase tracking-wide text-black bg-[#06B6D4] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all"
                    >
                      Stay in Next Round
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="space-y-4"
            >
              <div className="flex flex-col gap-4">
                {participantData?.exists ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full p-4 bg-[#FEF3C7] border-4 border-[#F97316] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center"
                  >
                    <p className="text-lg font-black text-[#92400E] uppercase tracking-wide">
                      ✓ You're in this round!
                    </p>
                    <p className="text-sm font-bold text-[#92400E] mt-2">
                      Come back next round to deposit again
                    </p>
                  </motion.div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 px-6 py-4 text-base font-black uppercase tracking-wide text-black bg-[#F8FAFC] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      {`Fixed deposit: ${roundData?.minDepositUsd ?? 100} USDC`}
                    </div>
                    <button
                      onClick={handleDeposit}
                      disabled={loading || !publicKey || checkingStatus || roundData?.vaultLocked || isRoundEnded}
                      className="w-full sm:w-auto px-8 py-4 text-base sm:text-lg font-black uppercase tracking-wide text-black bg-[#06B6D4] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title={roundData?.vaultLocked ? "Vault is locked - deposits disabled" : (isRoundEnded ? "Round ended - deposits closed" : "")}
                    >
                      {loading
                        ? "Processing..."
                        : checkingStatus
                          ? "Checking..."
                          : roundData?.vaultLocked
                            ? "Vault Locked"
                            : isRoundEnded
                              ? "Round Ended"
                              : `Deposit ${roundData?.minDepositUsd ?? 100} USDC`}
                    </button>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {`💡 Fixed deposit: ${roundData?.minDepositUsd ?? 100} USDC | Make sure you have ~0.015 SOL + your USDC in wallet`}
                {checkingStatus && " • Checking your status..."}
              </p>
            </motion.div>
          </motion.div>

          {/* Right Column - Live Round Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:sticky lg:top-24"
          >
            <LiveRoundCard />
          </motion.div>
        </div>
      </div>
    </section>
  );
};
