import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { TrendingUp, Users, Award } from "lucide-react";

export const Featured = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const cards = [
    {
      icon: Users,
      title: "20 join → 1 winner",
      amount: "850 USDC",
      description: "Maximum payout with minimum participants",
      bgColor: "bg-[#06B6D4]",
    },
    {
      icon: TrendingUp,
      title: "39 join → 1 winner",
      amount: "~1,610 USDC",
      description: "Near-maximum single winner scenario",
      bgColor: "bg-[#8B5CF6]",
    },
    {
      icon: Award,
      title: "40+ join",
      amount: "2 winners",
      description: "Multiple winner mode activates",
      bgColor: "bg-[#EC4899]",
    },
  ];

  return (
    <section ref={ref} id="math" className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-black uppercase mb-4">
            How the upside scales
          </h2>
          <p className="text-lg font-bold text-[#475569] max-w-2xl mx-auto">
            Transparent payout structure based on participant count
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {cards.map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-[#FEF3C7] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-8 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all"
            >
              <div className={`w-14 h-14 ${card.bgColor} border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center mb-6`}>
                <card.icon size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-black uppercase mb-3">
                {card.title}
              </h3>
              <p className="text-4xl font-black text-[#F97316] mb-4">
                {card.amount}
              </p>
              <p className="text-[#475569] font-bold">{card.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
