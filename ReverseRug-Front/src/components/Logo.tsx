export const Logo = () => {
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      className="items-center box-border caret-transparent gap-x-3 flex gap-y-3 group"
    >
      <div className="items-center bg-yellow-400 shadow-[rgb(0,0,0)_2px_2px_0px_0px] dark:shadow-[rgb(255,255,255)_2px_2px_0px_0px] box-border caret-transparent flex h-12 justify-center w-12 border-4 border-solid border-black dark:border-white group-hover:shadow-[rgb(0,0,0)_4px_4px_0px_0px] dark:group-hover:shadow-[rgb(255,255,255)_4px_4px_0px_0px] transition-all duration-200">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="box-border caret-transparent h-6 w-6"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 4C12 4 8 6 6 10C4 14 4 16 6 18C8 20 10 20 12 18C12 18 12 16 12 12M12 4C12 4 16 6 18 10C20 14 20 16 18 18C16 20 14 20 12 18C12 18 12 16 12 12M12 4V12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span className="text-xl font-black box-border caret-transparent hidden tracking-[-0.5px] leading-7 min-h-0 min-w-0 uppercase md:block md:min-h-[auto] md:min-w-[auto]">
        ReverseRug
      </span>
    </a>
  );
};
