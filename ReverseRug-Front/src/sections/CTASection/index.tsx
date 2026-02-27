import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export const CTASection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="bg-yellow-400 dark:bg-yellow-500 box-border caret-transparent px-4 py-20 border-y-4 border-solid border-black dark:border-white transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.6 }}
        className="box-border caret-transparent max-w-none text-center w-full mx-auto md:max-w-screen-xl"
      >
        <h2 className="text-4xl font-black box-border caret-transparent leading-10 uppercase mb-6 md:text-5xl md:leading-[48px]">
          Ready to Save?
        </h2>
        <p className="text-black/80 dark:text-black/70 text-xl font-bold box-border caret-transparent leading-7 max-w-2xl mb-8 mx-auto">
          Stop paying full price for the tools you need. Start applying to these
          programs today and save your runway.
        </p>
        <a 
          href="#perks" 
          onClick={(e) => {
            e.preventDefault();
            document.querySelector('#perks')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="box-border caret-transparent"
        >
          <button className="text-lg font-black items-center bg-yellow-50 dark:bg-white shadow-[rgb(0,0,0)_4px_4px_0px_0px] dark:shadow-[rgb(0,0,0)_4px_4px_0px_0px] caret-transparent gap-x-2 inline-flex h-16 justify-center tracking-[0.45px] leading-7 gap-y-2 uppercase text-nowrap px-10 py-5 border-4 border-solid border-black hover:shadow-[rgb(0,0,0)_6px_6px_0px_0px] dark:hover:shadow-[rgb(0,0,0)_6px_6px_0px_0px] hover:translate-y-[-2px] transition-all duration-200">
            Explore All{" "}
            <span className="text-sm bg-yellow-400 dark:bg-yellow-500 box-border caret-transparent block leading-5 text-nowrap ml-2 px-2 py-1 border-2 border-solid border-black">
              40+ Perks
            </span>
          </button>
        </a>
      </motion.div>
    </section>
  );
};
