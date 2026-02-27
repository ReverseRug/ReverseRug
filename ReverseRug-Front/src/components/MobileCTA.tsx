import { motion, useScroll, useTransform } from "framer-motion";

export const MobileCTA = () => {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 200], [0, 1]);
  const handleEnterRound = () => {
    const target = document.querySelector("#enter-round") as HTMLElement | null;
    if (!target) return;

    const header = document.querySelector("header");
    const headerOffset = header instanceof HTMLElement ? header.offsetHeight : 80;
    const top = target.getBoundingClientRect().top + window.scrollY - headerOffset - 8;

    window.scrollTo({
      top: Math.max(0, top),
      behavior: "smooth",
    });
  };

  return (
    <motion.div
      style={{ opacity }}
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FEF3C7] border-t-4 border-black p-4 shadow-[0px_-4px_0px_0px_rgba(0,0,0,1)]"
    >
      <button
        type="button"
        className="w-full px-6 py-4 text-base font-black uppercase tracking-wide text-black bg-[#06B6D4] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] transition-all"
        onClick={handleEnterRound}
      >
        Enter Round
      </button>
    </motion.div>
  );
};
