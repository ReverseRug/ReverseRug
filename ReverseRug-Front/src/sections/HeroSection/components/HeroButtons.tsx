export const HeroButtons = () => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="items-center box-border caret-transparent gap-x-4 flex flex-col justify-center gap-y-4 md:flex-row">
      <a 
        href="#perks" 
        onClick={(e) => handleClick(e, '#perks')}
        className="box-border caret-transparent block w-full md:w-auto"
      >
        <button className="text-lg font-black items-center bg-yellow-400 dark:bg-yellow-500 shadow-[rgb(0,0,0)_4px_4px_0px_0px] dark:shadow-[rgb(255,255,255)_4px_4px_0px_0px] caret-transparent gap-x-3 inline-flex h-16 justify-center tracking-[0.45px] leading-7 gap-y-3 uppercase text-nowrap px-10 py-5 border-4 border-solid border-black dark:border-white hover:shadow-[rgb(0,0,0)_6px_6px_0px_0px] dark:hover:shadow-[rgb(255,255,255)_6px_6px_0px_0px] hover:translate-y-[-2px] transition-all duration-200 w-full md:w-auto">
          <img
            src="https://c.animaapp.com/mlseovf9zNouWW/assets/icon-4.svg"
            alt="Icon"
            className="box-border caret-transparent shrink-0 h-5 pointer-events-none text-nowrap w-5"
          />
          Browse All Perks
          <img
            src="https://c.animaapp.com/mlseovf9zNouWW/assets/icon-5.svg"
            alt="Icon"
            className="box-border caret-transparent shrink-0 h-5 pointer-events-none text-nowrap w-5"
          />
        </button>
      </a>
      <a
        href="#featured"
        onClick={(e) => handleClick(e, '#featured')}
        className="box-border caret-transparent block w-full md:w-auto"
      >
        <button className="text-white text-lg font-black items-center bg-pink-500 dark:bg-pink-600 shadow-[rgb(0,0,0)_4px_4px_0px_0px] dark:shadow-[rgb(255,255,255)_4px_4px_0px_0px] caret-transparent gap-x-3 inline-flex h-16 justify-center tracking-[0.45px] leading-7 gap-y-3 uppercase text-nowrap px-10 py-5 border-4 border-solid border-black dark:border-white hover:shadow-[rgb(0,0,0)_6px_6px_0px_0px] dark:hover:shadow-[rgb(255,255,255)_6px_6px_0px_0px] hover:translate-y-[-2px] transition-all duration-200 w-full md:w-auto">
          <img
            src="https://c.animaapp.com/mlseovf9zNouWW/assets/icon-6.svg"
            alt="Icon"
            className="box-border caret-transparent shrink-0 h-5 pointer-events-none text-nowrap w-5"
          />
          Featured Only
        </button>
      </a>
    </div>
  );
};
