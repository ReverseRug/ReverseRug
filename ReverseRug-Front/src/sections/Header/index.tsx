import { HeaderContent } from "@/sections/Header/components/HeaderContent";

type HeaderProps = {
  isDark: boolean;
  toggleDarkMode: () => void;
};

export const Header = ({ isDark, toggleDarkMode }: HeaderProps) => {
  return (
    <header className="sticky bg-yellow-50 dark:bg-gray-900 box-border caret-transparent w-full z-50 border-b-4 border-solid border-black dark:border-white top-0 transition-colors duration-300">
      <HeaderContent isDark={isDark} toggleDarkMode={toggleDarkMode} />
    </header>
  );
};
