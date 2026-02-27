import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { StatsGrid } from "@/sections/StatsSection/components/StatsGrid";

export const StatsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="bg-stone-200 dark:bg-gray-800 box-border caret-transparent px-4 py-12 border-y-4 border-solid border-black dark:border-white transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.6 }}
        className="box-border caret-transparent max-w-none w-full mx-auto md:max-w-screen-xl"
      >
        <StatsGrid isInView={isInView} />
      </motion.div>
    </section>
  );
};
