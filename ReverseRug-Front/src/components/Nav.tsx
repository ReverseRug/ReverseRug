import { Sun, Moon } from "lucide-react";

type NavProps = {
  isDark: boolean;
  toggleDarkMode: () => void;
  isMobile?: boolean;
  onLinkClick?: () => void;
};

export const Nav = ({ isDark, toggleDarkMode, isMobile, onLinkClick }: NavProps) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
    if (onLinkClick) onLinkClick();
  };

  return (
    <nav className={`items-center box-border caret-transparent gap-x-4 ${isMobile ? 'flex flex-col gap-y-6' : 'flex'} gap-y-4`}>
      <a 
        href="#perks" 
        onClick={(e) => handleClick(e, '#perks')}
        className={`box-border caret-transparent block ${isMobile ? 'w-full' : ''}`}
      >
        <button className="text-xs font-black items-center bg-transparent shadow-[rgb(0,0,0)_2px_2px_0px_0px] dark:shadow-[rgb(255,255,255)_2px_2px_0px_0px] caret-transparent gap-x-2 inline-flex h-10 justify-center tracking-[0.3px] leading-4 gap-y-2 text-center uppercase text-nowrap px-4 py-2 border-4 border-solid border-transparent hover:bg-stone-200 dark:hover:bg-gray-800 hover:border-black dark:hover:border-white transition-all duration-200 w-full">
          Browse All
        </button>
      </a>
      
      <button
        onClick={toggleDarkMode}
        className="font-black items-center bg-yellow-50 dark:bg-gray-800 shadow-[rgb(0,0,0)_4px_4px_0px_0px] dark:shadow-[rgb(255,255,255)_4px_4px_0px_0px] caret-transparent gap-x-2 flex h-12 justify-center tracking-[0.4px] gap-y-2 text-center uppercase text-nowrap w-12 p-0 border-4 border-solid border-black dark:border-white hover:bg-stone-200 dark:hover:bg-gray-700 hover:shadow-[rgb(0,0,0)_6px_6px_0px_0px] dark:hover:shadow-[rgb(255,255,255)_6px_6px_0px_0px] transition-all duration-200"
      >
        {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
      </button>
    </nav>
  );
};
