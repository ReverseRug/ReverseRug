import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { CategoryGrid } from "@/sections/CategorySection/components/CategoryGrid";

export const CategorySection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="box-border caret-transparent px-4 py-20">
      <div className="box-border caret-transparent max-w-none w-full mx-auto md:max-w-screen-xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="text-4xl font-black box-border caret-transparent leading-10 text-center uppercase mb-12 md:text-5xl md:leading-[48px]"
        >
          By Category
        </motion.h2>
        <CategoryGrid isInView={isInView} />
      </div>
    </section>
  );
};
