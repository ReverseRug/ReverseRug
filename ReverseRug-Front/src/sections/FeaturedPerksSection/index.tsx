import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { FeaturedPerksGrid } from "@/sections/FeaturedPerksSection/components/FeaturedPerksGrid";

export const FeaturedPerksSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="featured" ref={ref} className="box-border caret-transparent px-4 py-16">
      <div className="box-border caret-transparent max-w-none w-full mx-auto md:max-w-screen-xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="box-border caret-transparent text-center mb-12"
        >
          <h2 className="text-4xl font-black box-border caret-transparent leading-10 uppercase mb-4 md:text-5xl md:leading-[48px]">
            Featured Perks
          </h2>
          <p className="text-neutral-600 dark:text-neutral-300 text-lg box-border caret-transparent leading-7 max-w-2xl mx-auto">
            The highest-value programs worth applying to first. These can save
            your startup hundreds of thousands in cloud and tool costs.
          </p>
        </motion.div>
        <FeaturedPerksGrid isInView={isInView} />
      </div>
    </section>
  );
};
