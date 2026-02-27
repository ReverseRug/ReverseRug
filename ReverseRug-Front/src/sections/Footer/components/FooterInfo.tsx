export const FooterInfo = () => {
  return (
    <div className="items-center box-border caret-transparent gap-x-4 flex flex-col justify-between gap-y-4 md:flex-row">
      <div className="text-sm font-bold items-center box-border caret-transparent gap-x-2 flex leading-5 gap-y-2">
        <span className="box-border caret-transparent block">
          Last updated: February 2026
        </span>
        <span className="box-border caret-transparent hidden min-h-0 min-w-0 md:block md:min-h-[auto] md:min-w-[auto]">
          |
        </span>
        <span className="items-center box-border caret-transparent gap-x-1 flex gap-y-1">
          Made with{" "}
          <img
            src="https://c.animaapp.com/mlseovf9zNouWW/assets/icon-14.svg"
            alt="Icon"
            className="text-red-500 box-border caret-transparent h-4 w-4"
          />
          for founders
        </span>
      </div>
      <div className="items-center box-border caret-transparent gap-x-4 flex gap-y-4">
        <a
          href="https://github.com/"
          className="text-sm font-bold items-center box-border caret-transparent gap-x-2 flex leading-5 gap-y-2 hover:text-yellow-400"
        >
          <img
            src="https://c.animaapp.com/mlseovf9zNouWW/assets/icon-15.svg"
            alt="Icon"
            className="box-border caret-transparent h-5 w-5"
          />
          <span className="box-border caret-transparent hidden min-h-0 min-w-0 md:block md:min-h-[auto] md:min-w-[auto]">
            Source Code
          </span>
        </a>
      </div>
    </div>
  );
};
