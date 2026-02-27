import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Users, Clock, DollarSign, FileText } from "lucide-react";
import { useStatsData, useRoundData } from "@/hooks/useRoundData";

export const Stats = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { data: roundData, loading: roundLoading } = useRoundData();
  const { data: statsData, loading: statsLoading } = useStatsData();
  
  const loading = roundLoading || statsLoading;
  
  // Calculate time display
  const timeLeft = roundData?.timeLeft || 0;
  const days = Math.floor(timeLeft / 86400);

  const stats = [
    {
      icon: Users,
      label: "Participants",
      value: loading ? "..." : `${statsData?.participants || 0} / ${statsData?.maxParticipants || 20}`,
      bgColor: "bg-[#06B6D4]",
    },
    {
      icon: Clock,
      label: "Time Left",
      value: loading ? "..." : (timeLeft > 0 ? `${days} days` : 'Starting soon'),
      valueColor: "text-[#F97316]",
      bgColor: "bg-[#FBBF24]",
    },
    {
      icon: DollarSign,
      label: "Current Jackpot",
      value: loading ? "..." : `$${(statsData?.jackpot || 0).toFixed(0)}`,
      valueColor: "text-[#F97316]",
      bgColor: "bg-[#EC4899]",
    },
    {
      icon: FileText,
      label: "Rule Summary",
      value: loading ? "..." : `${statsData?.minDeposit || 100} in / 50 back / 10% fee`,
      bgColor: "bg-[#8B5CF6]",
    },
  ];

  return (
    <section ref={ref} className="py-12 bg-stone-200 border-y-4 border-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-[#FEF3C7] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 md:p-6 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all"
            >
              <div className={`w-12 h-12 ${stat.bgColor} border-4 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center mb-4`}>
                <stat.icon size={20} className="text-white" />
              </div>
              <span className="text-xs font-black text-[#475569] uppercase tracking-wide block mb-2">
                {stat.label}
              </span>
              <p
                className={`text-xl md:text-2xl font-black ${stat.valueColor || "text-[#0F172A]"}`}
              >
                {stat.value}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
