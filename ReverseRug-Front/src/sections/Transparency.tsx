import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { FileCode, Github, PieChart, Copy, Check, X } from "lucide-react";

export const Transparency = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [copied, setCopied] = useState(false);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const contractAddress =
    (import.meta.env.VITE_PROGRAM_ID as string | undefined) || "Coming Soon";

  const copyContractAddress = async () => {
    if (!contractAddress || contractAddress === "Coming Soon") return;
    try {
      await navigator.clipboard.writeText(contractAddress);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const cards = [
    {
      icon: FileCode,
      title: "Contract Address",
      value: contractAddress,
      action: "Copy",
      actionIcon: Copy,
      bgColor: "bg-[#06B6D4]",
      onAction: copyContractAddress,
    },
    {
      icon: Github,
      title: "GitHub Repository",
      value: "",
      action: "",
      bgColor: "bg-[#8B5CF6]",
    },
    {
      icon: PieChart,
      title: "Fee Split",
      value: "Dev / Buyback",
      action: "Details",
      bgColor: "bg-[#EC4899]",
      onAction: () => setShowFeeModal(true),
    },
  ];

  return (
    <section ref={ref} id="contract" className="py-16 bg-[#FEF3C7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-black uppercase mb-4">
            Transparency First
          </h2>
          <p className="text-lg font-bold text-[#475569] max-w-2xl mx-auto">
            Verify everything yourself. No trust required.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {cards.map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 ${card.bgColor} border-4 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center`}>
                  <card.icon size={20} className="text-white" />
                </div>
                {card.actionIcon && (
                  <button
                    type="button"
                    onClick={card.onAction}
                    className="p-2 border-2 border-black hover:bg-stone-200 transition-colors"
                  >
                    {copied && card.title === "Contract Address" ? <Check size={18} /> : <card.actionIcon size={18} />}
                  </button>
                )}
              </div>
              <h3 className="text-xs font-black text-[#475569] uppercase tracking-wide mb-2">
                {card.title}
              </h3>
              <p className="text-lg font-black mb-4 break-all">
                {card.value}
              </p>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={card.onAction}
                  className="text-sm font-black uppercase text-[#06B6D4] hover:text-[#0891B2] transition-colors"
                >
                  {card.title === "Contract Address" && copied ? "Copied ✓" : `${card.action} →`}
                </button>
                {card.title === "GitHub Repository" && (
                  {/* Removed 'Mainnet soon' for now */}
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showFeeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFeeModal(false)}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#FEF3C7] border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b-4 border-black bg-[#FBBF24]">
                <h3 className="text-lg font-black uppercase">Fee Split Details</h3>
                <button
                  type="button"
                  onClick={() => setShowFeeModal(false)}
                  className="p-1 border-2 border-black bg-white hover:bg-stone-100"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm font-bold text-[#475569]">
                  In every round, a <span className="text-black">10% protocol fee</span> is taken from the total pool.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="border-4 border-black bg-white p-3 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <p className="text-xl font-black">%5</p>
                    <p className="text-xs font-black uppercase text-[#475569]">Dev Wallet</p>
                  </div>
                  <div className="border-4 border-black bg-white p-3 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <p className="text-xl font-black">%5</p>
                    <p className="text-xs font-black uppercase text-[#475569]">Buyback Wallet</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-[#475569]">
                  This fee supports product development and buyback operations. Fee allocation is always applied before refunds and winner payouts.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
