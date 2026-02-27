export type PerkCardProps = {
  companyName: string;
  programName: string;
  iconUrl: string;
  valueAmount: string;
  valueVariant: string;
  description: string;
  category: string;
  categoryVariant: string;
  detailsUrl: string;
  applyUrl: string;
  detailsIconUrl: string;
  applyIconUrl: string;
};

export const PerkCard = (props: PerkCardProps) => {
  return (
    <div className="bg-yellow-400/10 dark:bg-gray-800/50 shadow-[rgb(0,0,0)_4px_4px_0px_0px] dark:shadow-[rgb(255,255,255)_4px_4px_0px_0px] box-border caret-transparent flex flex-col h-full border-yellow-400 dark:border-yellow-500 border-4 border-solid hover:shadow-[rgb(0,0,0)_6px_6px_0px_0px] dark:hover:shadow-[rgb(255,255,255)_6px_6px_0px_0px] hover:translate-y-[-2px] transition-all duration-200">
      <div className="box-border caret-transparent flex flex-col pt-6 pb-3 px-6">
        <div className="items-start box-border caret-transparent gap-x-2 flex justify-between gap-y-2">
          <div className="box-border caret-transparent basis-[0%] grow">
            <p className="text-neutral-600 dark:text-neutral-400 text-xs font-black box-border caret-transparent tracking-[0.6px] leading-4 uppercase mb-1">
              {props.companyName}
            </p>
            <h3 className="text-lg font-black box-border caret-transparent flow-root tracking-[-0.45px] leading-7 overflow-hidden">
              {props.programName}
            </h3>
          </div>
          <div className="box-border caret-transparent shrink-0">
            <img
              src={props.iconUrl}
              alt="Icon"
              className="text-yellow-400 box-border caret-transparent h-5 w-5"
            />
          </div>
        </div>
        <div className="box-border caret-transparent mt-2">
          <span
            className={`text-white text-lg font-black shadow-[rgb(0,0,0)_2px_2px_0px_0px] dark:shadow-[rgb(255,255,255)_2px_2px_0px_0px] box-border caret-transparent inline-block leading-7 px-4 py-2 border-4 border-solid border-black dark:border-white ${props.valueVariant}`}
          >
            {props.valueAmount}
          </span>
        </div>
      </div>
      <div className="box-border caret-transparent basis-[0%] grow pb-6 px-6">
        <p className="text-neutral-600 dark:text-neutral-300 text-sm box-border caret-transparent flow-root leading-5 overflow-hidden mb-4">
          {props.description}
        </p>
        <div
          className={`text-white text-xs font-black items-center shadow-[rgb(0,0,0)_2px_2px_0px_0px] dark:shadow-[rgb(255,255,255)_2px_2px_0px_0px] box-border caret-transparent inline-flex tracking-[0.3px] leading-4 uppercase px-3 py-1 border-2 border-solid border-black dark:border-white ${props.categoryVariant}`}
        >
          {props.category}
        </div>
      </div>
      <div className="items-center box-border caret-transparent gap-x-2 flex gap-y-2 pt-4 pb-6 px-6 border-t-2 border-solid border-black/20 dark:border-white/20">
        <a
          href={props.detailsUrl}
          onClick={(e) => {
            if (props.detailsUrl === '#') e.preventDefault();
          }}
          className="box-border caret-transparent block basis-[0%] grow"
        >
          <button className="text-xs font-black items-center bg-yellow-50 dark:bg-gray-700 shadow-[rgb(0,0,0)_4px_4px_0px_0px] dark:shadow-[rgb(255,255,255)_4px_4px_0px_0px] caret-transparent gap-x-2 inline-flex h-10 justify-center tracking-[0.3px] leading-4 gap-y-2 text-center uppercase text-nowrap w-full px-4 py-2 border-4 border-solid border-black dark:border-white hover:bg-stone-200 dark:hover:bg-gray-600 hover:shadow-[rgb(0,0,0)_6px_6px_0px_0px] dark:hover:shadow-[rgb(255,255,255)_6px_6px_0px_0px] transition-all duration-200">
            Details
            <img
              src={props.detailsIconUrl}
              alt="Icon"
              className="box-border caret-transparent shrink-0 h-5 pointer-events-none text-nowrap w-5"
            />
          </button>
        </a>
        <a
          href={props.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="box-border caret-transparent block basis-[0%] grow"
        >
          <button className="text-xs font-black items-center bg-yellow-400 dark:bg-yellow-500 shadow-[rgb(0,0,0)_4px_4px_0px_0px] dark:shadow-[rgb(255,255,255)_4px_4px_0px_0px] caret-transparent gap-x-2 inline-flex h-10 justify-center tracking-[0.3px] leading-4 gap-y-2 text-center uppercase text-nowrap w-full px-4 py-2 border-4 border-solid border-black dark:border-white hover:shadow-[rgb(0,0,0)_6px_6px_0px_0px] dark:hover:shadow-[rgb(255,255,255)_6px_6px_0px_0px] transition-all duration-200">
            Apply
            <img
              src={props.applyIconUrl}
              alt="Icon"
              className="box-border caret-transparent shrink-0 h-5 pointer-events-none text-nowrap w-5"
            />
          </button>
        </a>
      </div>
    </div>
  );
};
