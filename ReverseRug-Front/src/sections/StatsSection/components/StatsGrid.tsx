import { motion } from "framer-motion";
import { StatCard } from "@/sections/StatsSection/components/StatCard";

type StatsGridProps = {
  isInView: boolean;
};

export const StatsGrid = ({ isInView }: StatsGridProps) => {
  const stats = [
    {
      iconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-7.svg",
      iconVariant: "bg-blue-500 dark:bg-blue-600",
      value: "41",
      label: "Total Perks",
    },
    {
      iconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-8.svg",
      iconVariant: "bg-green-500 dark:bg-green-600",
      value: "$1.3M+",
      label: "Est. Value",
    },
    {
      iconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-9.svg",
      iconVariant: "bg-yellow-500 dark:bg-yellow-600",
      value: "12",
      label: "Featured",
    },
    {
      iconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-10.svg",
      iconVariant: "bg-purple-500 dark:bg-purple-600",
      value: "8",
      label: "Categories",
    },
  ];

  return (
    <div className="box-border caret-transparent gap-x-6 grid grid-cols-2 gap-y-6 md:grid-cols-4">
      {stats.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
        >
          <StatCard {...stat} isInView={isInView} />
        </motion.div>
      ))}
    </div>
  );
};
