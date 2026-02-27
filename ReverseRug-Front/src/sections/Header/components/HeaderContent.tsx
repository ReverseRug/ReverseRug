import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Nav } from "@/components/Nav";
import { Menu, X } from "lucide-react";

type HeaderContentProps = {
  isDark: boolean;
  toggleDarkMode: () => void;
};

export const HeaderContent = ({ isDark, toggleDarkMode }: HeaderContentProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="items-center box-border caret-transparent flex h-20 justify-between max-w-none w-full mx-auto px-4 md:max-w-screen-xl">
      <Logo />
      
      {/* Desktop Nav */}
      <div className="hidden md:block">
        <Nav isDark={isDark} toggleDarkMode={toggleDarkMode} />
      </div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden font-black items-center bg-yellow-50 dark:bg-gray-800 shadow-[rgb(0,0,0)_4px_4px_0px_0px] dark:shadow-[rgb(255,255,255)_4px_4px_0px_0px] caret-transparent flex h-12 justify-center w-12 p-0 border-4 border-solid border-black dark:border-white hover:bg-stone-200 dark:hover:bg-gray-700 hover:shadow-[rgb(0,0,0)_6px_6px_0px_0px] dark:hover:shadow-[rgb(255,255,255)_6px_6px_0px_0px] transition-all duration-200"
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-yellow-50 dark:bg-gray-900 z-50 md:hidden animate-slideDown">
          <div className="flex justify-between items-center h-20 px-4 border-b-4 border-black dark:border-white">
            <Logo />
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="font-black items-center bg-yellow-50 dark:bg-gray-800 shadow-[rgb(0,0,0)_4px_4px_0px_0px] dark:shadow-[rgb(255,255,255)_4px_4px_0px_0px] caret-transparent flex h-12 justify-center w-12 p-0 border-4 border-solid border-black dark:border-white"
            >
              <X size={24} />
            </button>
          </div>
          <div className="p-8">
            <Nav isDark={isDark} toggleDarkMode={toggleDarkMode} isMobile onLinkClick={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
};
