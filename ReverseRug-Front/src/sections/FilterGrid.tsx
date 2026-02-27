import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import {
  Play,
  Calculator,
  RefreshCw,
  Percent,
  Award,
  Shuffle,
  Clock,
  Eye,
} from "lucide-react";

export const FilterGrid = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeFilter, setActiveFilter] = useState("All");

  const filters = [
    "All",
    "Rules",
    "Payouts",
    "Refunds",
    "Randomness",
    "Transparency",
    "Security",
  ];

  const cards = [
    {
      icon: Play,
      title: "How it works",
      description:
        "Connect wallet → Deposit 100 USDC → Wait 7 days → Claim winnings or refund",
      category: "Rules",
      bgColor: "bg-[#06B6D4]",
    },
    {
      icon: Calculator,
      title: "Payout math",
      description:
        "Jackpot = 40N + 50 for 1-winner mode. 2-winner mode activates at 40+ participants",
      category: "Payouts",
      bgColor: "bg-[#8B5CF6]",
    },
    {
      icon: RefreshCw,
      title: "Refund guarantee",
      description:
        "Non-winners automatically receive 50 USDC back. No action required.",
      category: "Refunds",
      bgColor: "bg-[#10B981]",
    },
    {
      icon: Percent,
      title: "10% fee structure",
      description:
        "10% protocol fee on each entry. Transparent allocation to development and buyback.",
      category: "Rules",
      bgColor: "bg-[#FBBF24]",
    },
    {
      icon: Award,
      title: "Winner count",
      description:
        "1 winner per 20 participants. 2 winners activate at 40+ entries.",
      category: "Payouts",
      bgColor: "bg-[#EC4899]",
    },
    {
      icon: Shuffle,
      title: "Randomness source",
      description:
        "Public on-chain input after round ends. Anyone can verify and recompute the selection.",
      category: "Randomness",
      bgColor: "bg-[#F97316]",
    },
    {
      icon: Clock,
      title: "Claim timing",
      description:
        "Claims available 24 hours after settlement. Automatic distribution to winners.",
      category: "Rules",
      bgColor: "bg-[#06B6D4]",
    },
    {
      icon: Eye,
      title: "Full transparency",
      description:
        "Contract verified on-chain. Source code public on GitHub. All logic auditable.",
      category: "Transparency",
      bgColor: "bg-[#8B5CF6]",
    },
  ];

  const filteredCards =
    activeFilter === "All"
      ? cards
      : cards.filter((card) => card.category === activeFilter);

  return (
    <section ref={ref} id="rules" className="py-16 md:py-24 bg-stone-200 border-y-4 border-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-black uppercase mb-4">
            Everything defined upfront
          </h2>
          <p className="text-lg font-bold text-[#475569] max-w-2xl mx-auto">
            No surprises. No hidden terms. All rules are transparent and
            immutable.
          </p>
        </motion.div>

        {/* Filter Pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 text-sm font-black uppercase tracking-wide border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] ${
                activeFilter === filter
                  ? "bg-[#FBBF24] text-black"
                  : "bg-white text-[#475569]"
              }`}
            >
              {filter}
            </button>
          ))}
        </motion.div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredCards.map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="bg-[#FEF3C7] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all"
            >
              <div className={`w-12 h-12 ${card.bgColor} border-4 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center mb-4`}>
                <card.icon size={20} className="text-white" />
              </div>
              <h3 className="text-lg font-black uppercase mb-2">
                {card.title}
              </h3>
              <p className="text-sm text-[#475569] font-bold leading-relaxed">
                {card.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
