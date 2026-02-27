import { motion } from "framer-motion";
import { useWinners } from "@/hooks/useWinners";

export const WinnersList = () => {
  const { winners, loading } = useWinners();

  if (loading && winners.length === 0) {
    return null;
  }

  if (winners.length === 0) {
    return null;
  }

  const formatAddress = (winner: string) => {
    // Format participant file name (e.g., "p12.json" -> "P12")
    const match = winner.match(/p(\d+)/);
    if (match) {
      return `Participant #${match[1]}`;
    }
    if (!winner || winner.length < 10) return "Unknown winner";
    return `${winner.slice(0, 6)}...${winner.slice(-6)}`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full py-14 border-y-4 border-black bg-[#E0F2FE]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#fef9f1] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl sm:text-3xl font-black flex items-center gap-3">
              <span className="text-4xl">🏆</span>
              RECENT WINNERS
            </h2>
            <span className="px-3 py-1 text-xs font-black uppercase bg-white border-2 border-black">
              Live Feed
            </span>
          </div>

          <div className="max-h-[420px] overflow-y-auto pr-1 space-y-3">
            {winners.map((winner, index) => (
              <motion.div
                key={`${winner.epoch}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(index * 0.05, 0.4) }}
                className="bg-white border-2 border-black p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow"
              >
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  <div className="bg-[#00d4ff] border-2 border-black px-3 py-1 font-black text-sm">
                    ROUND {winner.epoch}
                  </div>
                  <div>
                    <div className="font-black text-lg" title={winner.winner}>{formatAddress(winner.winner)}</div>
                    <div className="text-sm text-gray-600">
                      {winner.participants} participants • {formatDate(winner.timestamp)}
                    </div>
                  </div>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto">
                  <div className="font-black text-xl sm:text-2xl text-[#ff6b00]">
                    ${(winner.prize / 1_000_000).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">USDC</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
};
