import { Clock, Users, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { checkParticipantStatus } from "@/lib/solana";
import { useStatsData, useRoundData } from "@/hooks/useRoundData";

export const LiveRoundCard = () => {
  const lateJoinLockSecs = Number(import.meta.env.VITE_LATE_JOIN_LOCK_SECONDS ?? 86400);
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const { data: roundData, loading: roundLoading } = useRoundData();
  const { data: statsData, loading: statsLoading } = useStatsData();
  const [depositAmount, setDepositAmount] = useState("");
  const [participantStatus, setParticipantStatus] = useState<{ hasDeposited: boolean; error?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [liveTimeLeft, setLiveTimeLeft] = useState<number>(0);
  
  const loading = roundLoading || statsLoading;
  
  // Live countdown updates every second
  useEffect(() => {
    if (!roundData) return;
    
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const epochEnd = roundData.epochEnd;
      const remaining = Math.max(0, epochEnd - now);
      setLiveTimeLeft(remaining);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [roundData]);

  const handleEnterRound = async () => {
    if (!publicKey) {
      setParticipantStatus({ hasDeposited: false, error: "Please connect your wallet first" });
      setShowStatusModal(true);
      return;
    }

    setChecking(true);
    try {
      const status = await checkParticipantStatus(connection, publicKey);
      setParticipantStatus({ hasDeposited: status.hasDeposited });
      setShowStatusModal(true);
    } catch (error) {
      console.error("Error checking status:", error);
      setParticipantStatus({ hasDeposited: false, error: "Error checking your participation status. Please try again." });
      setShowStatusModal(true);
    } finally {
      setChecking(false);
    }
  };
  
  // Calculate time display
  const getDaysHoursMinutes = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return { days, hours, minutes, secs };
  };
  
  // Use live countdown or initial data from API
  const timeLeft = liveTimeLeft > 0 ? liveTimeLeft : (roundData?.timeLeft || 0);
  const { days, hours, minutes, secs } = getDaysHoursMinutes(timeLeft);
  const participants = statsData?.participants || 0;
  const participantDisplayMax = Math.max(20, (Math.floor(participants / 20) + 1) * 20);
  
  return (
    <>
      <div className="bg-[#06B6D4]/10 border-4 border-[#06B6D4] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 sm:p-6 space-y-6">
      {/* Live Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-[#F97316] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] px-4 py-2">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 bg-white rounded-full"
          />
          <span className="text-sm font-black text-white uppercase tracking-wide">
            {loading ? 'Loading...' : (timeLeft > 0 ? 'Live Now' : 'Round Ended')}
          </span>
        </div>
      </div>

      {/* Round Info */}
      <div>
        <h3 className="text-2xl sm:text-3xl font-black uppercase mb-2">
          Round {roundData?.currentEpoch || '...'}
        </h3>
        <p className="text-base sm:text-lg font-bold text-[#475569]">
          {loading ? 'Loading...' : (
            timeLeft > 0 
              ? `${days}d ${hours}h ${minutes}m ${secs}s left`
              : 'Round ended. Waiting for next round.'
          )}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#FEF3C7] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-[#06B6D4]" />
            <span className="text-xs font-black text-[#475569] uppercase tracking-wide">
              Participants
            </span>
          </div>
          <p className="text-2xl font-black">
            {loading ? '...' : `${participants} / ${participantDisplayMax}`}
          </p>
        </div>

        <div className="bg-[#FEF3C7] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-[#06B6D4]" />
            <span className="text-xs font-black text-[#475569] uppercase tracking-wide">
              Jackpot
            </span>
          </div>
          <p className="text-2xl font-black text-[#F97316]">
            ${loading ? '...' : (statsData?.jackpot || 0).toFixed(0)}
          </p>
        </div>
      </div>

      {/* Info Chips */}
      <div className="flex flex-wrap gap-2">
        <span className="px-3 py-1.5 text-xs font-black bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase">
          100 USDC entry
        </span>
        <span className="px-3 py-1.5 text-xs font-black bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase">
          50 USDC refund
        </span>
        <span className="px-3 py-1.5 text-xs font-black bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase">
          10% fee
        </span>
      </div>

      {/* Note */}
      <div className="bg-[#FEF3C7] border-4 border-[#FBBF24] p-4">
        <p className="text-sm font-bold text-[#92400E]">
          <span className="font-black">Note:</span> Claim available after settlement (24h for late joiners)
        </p>
      </div>

      {/* Vault Lock Banner */}
      {roundData?.vaultLocked && (
        <div className="bg-red-200 border-4 border-red-600 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-sm font-black text-red-800 uppercase tracking-wide">
            🔒 VAULT IS LOCKED
          </p>
          <p className="text-xs font-bold text-red-700 mt-1">
            Deposits and withdrawals are disabled for {roundData?.vaultLockTimeLeft || 0} seconds
          </p>
        </div>
      )}

      {/* CTA Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder={publicKey ? publicKey.toString().slice(0, 8) + "..." : "Wallet address"}
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            disabled
            className="flex-1 px-4 py-3 text-sm font-bold border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus:outline-none transition-all disabled:opacity-75 disabled:bg-gray-100"
          />
          <button 
            onClick={handleEnterRound}
            disabled={!publicKey || checking || roundData?.vaultLocked}
            title={roundData?.vaultLocked ? "Vault is locked - deposits disabled" : ""}
            className="w-full sm:w-auto px-6 py-3 text-base font-black uppercase tracking-wide text-black bg-[#F97316] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checking ? "Checking..." : "Check Status"}
          </button>
        </div>
        <p className="text-xs font-bold text-[#475569] text-center">
          👆 Click to check if you're already in this round
        </p>
      </div>
      </div>

      {/* Status Modal */}
      {showStatusModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowStatusModal(false)}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] max-w-sm w-full p-6 space-y-6"
          >
            {/* Header */}
            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase">
                {participantStatus?.error 
                  ? "⚠️ Error" 
                  : participantStatus?.hasDeposited 
                  ? "✅ You're In!"
                  : "📝 Not Yet"}
              </h2>
              <div className="h-1 w-12 bg-[#F97316]"></div>
            </div>

            {/* Content */}
            <div className="space-y-4">
              {participantStatus?.error ? (
                <div className="space-y-4">
                  <p className="text-lg font-bold text-[#475569]">
                    {participantStatus.error}
                  </p>
                  <div className="bg-[#FEE2E2] border-2 border-red-300 p-3 rounded-none">
                    <p className="text-sm font-bold text-red-700">
                      Please try again or connect your wallet.
                    </p>
                  </div>
                </div>
              ) : participantStatus?.hasDeposited ? (
                <div className="space-y-4">
                  <div className="bg-[#FEF3C7] border-4 border-[#FBBF24] p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <p className="text-lg font-black text-[#92400E] uppercase">
                      Registered for Round {roundData?.currentEpoch}
                    </p>
                  </div>
                  <p className="text-base font-bold text-[#475569]">
                    Your deposit has been confirmed! You're locked in for this round.
                  </p>
                  <p className="text-sm text-[#64748B]">
                    You can claim rewards after the round settles (+{lateJoinLockSecs}s from end time for late joiners).
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-[#E0F2FE] border-4 border-[#06B6D4] p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <p className="text-lg font-black text-[#0369A1] uppercase">
                      No Deposit Yet
                    </p>
                  </div>
                  <p className="text-base font-bold text-[#475569]">
                    You haven't deposited in Round {roundData?.currentEpoch} yet.
                  </p>
                  <p className="text-sm text-[#64748B]">
                    Use the deposit form on the left to enter this round. Minimum entry: $100 USDC
                  </p>
                </div>
              )}
            </div>

            {/* Action Button */}
            <button
              onClick={() => setShowStatusModal(false)}
              className="w-full px-6 py-4 text-lg font-black uppercase tracking-wide text-black bg-[#06B6D4] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all"
            >
              Got It
            </button>
          </motion.div>
        </motion.div>
      )}
    </>
  );
};
