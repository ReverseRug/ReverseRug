import { motion } from "framer-motion";

export const HeroBackground = () => {
  return (
    <div className="absolute box-border caret-transparent -z-10 inset-0">
      <motion.div
        animate={{
          rotate: [12, 18, 12],
          y: [0, -10, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bg-yellow-400/20 dark:bg-yellow-400/10 box-border caret-transparent h-32 w-32 border-4 border-solid border-black dark:border-white left-10 top-20"
      ></motion.div>
      <motion.div
        animate={{
          rotate: [-6, 0, -6],
          y: [0, 10, 0],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5,
        }}
        className="absolute bg-pink-500/20 dark:bg-pink-500/10 box-border caret-transparent h-24 w-24 border-4 border-solid border-black dark:border-white right-20 top-40"
      ></motion.div>
      <motion.div
        animate={{
          rotate: [45, 50, 45],
          x: [0, 10, 0],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
        className="absolute bg-blue-500/20 dark:bg-blue-500/10 box-border caret-transparent h-20 w-20 border-4 border-solid border-black dark:border-white left-1/4 bottom-20"
      ></motion.div>
      <motion.div
        animate={{
          rotate: [-12, -18, -12],
          x: [0, -10, 0],
        }}
        transition={{
          duration: 6.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1.5,
        }}
        className="absolute bg-yellow-400/10 dark:bg-yellow-400/5 box-border caret-transparent h-28 w-28 border-4 border-solid border-black dark:border-white right-[33.3333%] bottom-40"
      ></motion.div>
    </div>
  );
};
