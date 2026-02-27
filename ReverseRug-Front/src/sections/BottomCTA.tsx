import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export const BottomCTA = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
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
    <section ref={ref} className="py-20 md:py-32 bg-[#FBBF24] border-y-4 border-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          <h2 className="text-5xl md:text-6xl font-black uppercase">
            Ready for Round 1?
          </h2>
          <p className="text-xl md:text-2xl font-bold text-black/80 max-w-2xl mx-auto">
            100 USDC entry. 50 back if you don't win. Fixed rules.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              type="button"
              className="px-10 py-5 text-lg font-black uppercase tracking-wide text-black bg-[#06B6D4] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all"
              onClick={handleEnterRound}
            >
              Enter Round
            </button>
            <a
              href="#rules"
              onClick={(e) => {
                e.preventDefault();
                document.querySelector('#rules')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <button className="px-10 py-5 text-lg font-black uppercase tracking-wide text-black bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all">
                Read Rules
              </button>
            </a>
          </div>
          <p className="text-sm font-bold text-black/70 max-w-xl mx-auto pt-4">
            No "trust me bro" — code and logic are public.
          </p>
        </motion.div>
      </div>
    </section>
  );
};
