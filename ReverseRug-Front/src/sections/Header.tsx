import { useState } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Rules", href: "#rules" },
    { label: "Math", href: "#math" },
    { label: "Transparency", href: "#contract" },
    { label: "FAQ", href: "#faq" },
  ];

  const scrollToSection = (href: string) => {
    const target = document.querySelector(href) as HTMLElement | null;
    if (!target) return;

    const header = document.querySelector("header");
    const headerOffset = header instanceof HTMLElement ? header.offsetHeight : 80;
    const top = target.getBoundingClientRect().top + window.scrollY - headerOffset - 8;

    window.scrollTo({
      top: Math.max(0, top),
      behavior: "smooth",
    });

    if (window.location.hash !== href) {
      window.history.replaceState(null, "", href);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();

    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
      // Mobile webviews can ignore smooth scroll if menu close and scroll happen in same frame.
      window.setTimeout(() => scrollToSection(href), 180);
      return;
    }

    scrollToSection(href);
  };

  const handleEnterRound = () => {
    scrollToSection("#enter-round");
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#FEF3C7] border-b-4 border-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-3 group"
          >
            <div className="w-12 h-12 bg-[#06B6D4] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center transform group-hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group-hover:translate-y-[-2px] transition-all">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-6 h-6 text-black"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 4C12 4 8 6 6 10C4 14 4 16 6 18C8 20 10 20 12 18C12 18 12 16 12 12M12 4C12 4 16 6 18 10C20 14 20 16 18 18C16 20 14 20 12 18C12 18 12 16 12 12M12 4V12"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-xl font-black uppercase tracking-tight hidden md:block">
              ReverseRug
            </span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleClick(e, link.href)}
                className="text-sm font-black uppercase tracking-wide text-[#0F172A] hover:text-[#06B6D4] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={handleEnterRound}
              className="px-6 py-3 text-sm font-black uppercase tracking-wide text-black bg-[#06B6D4] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all"
            >
              Enter Round
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-12 h-12 bg-[#FEF3C7] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t-4 border-black bg-[#FEF3C7]"
          >
            <div className="px-4 py-6 space-y-4">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleClick(e, link.href)}
                  className="block py-2 text-sm font-black uppercase tracking-wide text-[#0F172A] hover:text-[#06B6D4] transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleEnterRound}
                  className="w-full px-6 py-3 text-sm font-black uppercase tracking-wide text-black bg-[#06B6D4] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  Enter Round
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
