import { motion } from "framer-motion";
import { UpdateBadge } from "@/sections/HeroSection/components/UpdateBadge";
import { HeroButtons } from "@/sections/HeroSection/components/HeroButtons";

export const HeroContent = () => {
  return (
    <div className="box-border caret-transparent max-w-none text-center w-full mx-auto md:max-w-screen-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <UpdateBadge />
      </motion.div>
      
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="text-5xl font-black box-border caret-transparent leading-[48px] uppercase mb-6 md:text-8xl md:leading-[96px]"
      >
        Reverse
        <br className="text-5xl box-border caret-transparent leading-[48px] md:text-8xl md:leading-[96px]" />
        <motion.span
          initial={{ opacity: 0, rotate: -3 }}
          animate={{ opacity: 1, rotate: -1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-5xl bg-yellow-400 dark:bg-yellow-500 shadow-[rgb(0,0,0)_6px_6px_0px_0px] dark:shadow-[rgb(255,255,255)_6px_6px_0px_0px] box-border caret-transparent inline-block leading-[48px] px-4 py-2 border-4 border-solid border-black dark:border-white md:text-8xl md:leading-[96px]"
        >
          Rug
        </motion.span>
        <br className="text-5xl box-border caret-transparent leading-[48px] md:text-8xl md:leading-[96px]" />
        Database
      </motion.h1>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="text-neutral-600 dark:text-neutral-300 text-xl font-bold box-border caret-transparent leading-7 max-w-screen-md mb-12 mx-auto md:text-2xl md:leading-8"
      >
        Discover{" "}
        <span className="text-black dark:text-white text-xl box-border caret-transparent leading-7 md:text-2xl md:leading-8">
          $1M+
        </span>
        in free cloud credits, AI API access, developer tools, and startup
        programs. All in one place, constantly updated.
      </motion.p>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      >
        <HeroButtons />
      </motion.div>
    </div>
  );
};
