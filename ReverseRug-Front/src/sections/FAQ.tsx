import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export const FAQ = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "Is this a prediction market?",
      answer:
        "No. ReverseRug is a fixed-rule prize pool where participants enter with 100 USDC, winners are selected randomly on-chain, and non-winners receive 50 USDC back. There's no prediction or betting involved.",
    },
    {
      question: "Can rules change mid-round?",
      answer:
        "No. All rules are encoded in the smart contract and cannot be changed once a round starts. The contract is immutable and publicly verifiable on-chain.",
    },
    {
      question: "What's the downside?",
      answer:
        "Maximum loss is 50 USDC per entry (100 USDC entry minus 50 USDC guaranteed refund). The 10% fee is deducted from the prize pool, not your refund.",
    },
    {
      question: "How are winners selected?",
      answer:
        "Winners are selected using verifiable on-chain randomness after the round ends. The selection process is transparent and can be independently verified by anyone.",
    },
    {
      question: "When can I claim?",
      answer:
        "Claims become available 24 hours after round settlement. Winners receive their prize automatically, and non-winners can claim their 50 USDC refund.",
    },
  ];

  return (
    <section ref={ref} id="faq" className="py-16 md:py-24 bg-stone-200 border-y-4 border-black">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-black uppercase mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg font-bold text-[#475569]">
            Everything you need to know about ReverseRug
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="bg-[#FEF3C7] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-[#FBBF24]/20 transition-colors"
              >
                <span className="text-lg font-black uppercase pr-4">
                  {faq.question}
                </span>
                <ChevronDown
                  size={24}
                  className={`flex-shrink-0 transition-transform ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-5 text-[#475569] font-bold leading-relaxed border-t-4 border-black pt-4">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
