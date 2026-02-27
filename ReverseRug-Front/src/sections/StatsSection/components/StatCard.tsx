import { useEffect, useState } from "react";

export type StatCardProps = {
  iconUrl: string;
  iconVariant: string;
  value: string;
  label: string;
  isInView: boolean;
};

export const StatCard = (props: StatCardProps) => {
  const [displayValue, setDisplayValue] = useState(props.value);

  useEffect(() => {
    if (!props.isInView) return;

    // Check if value contains a number to animate
    const numMatch = props.value.match(/[\d,]+/);
    if (numMatch) {
      const targetNum = parseInt(numMatch[0].replace(/,/g, ''));
      const prefix = props.value.substring(0, numMatch.index);
      const suffix = props.value.substring((numMatch.index || 0) + numMatch[0].length);
      
      let current = 0;
      const increment = targetNum / 30;
      const timer = setInterval(() => {
        current += increment;
        if (current >= targetNum) {
          setDisplayValue(props.value);
          clearInterval(timer);
        } else {
          const formattedNum = Math.floor(current).toLocaleString();
          setDisplayValue(`${prefix}${formattedNum}${suffix}`);
        }
      }, 40);

      return () => clearInterval(timer);
    }
  }, [props.isInView, props.value]);

  return (
    <div className="items-center bg-yellow-50 dark:bg-gray-700 shadow-[rgb(0,0,0)_4px_4px_0px_0px] dark:shadow-[rgb(255,255,255)_4px_4px_0px_0px] box-border caret-transparent flex flex-col text-center p-6 border-4 border-solid border-black dark:border-white hover:shadow-[rgb(0,0,0)_6px_6px_0px_0px] dark:hover:shadow-[rgb(255,255,255)_6px_6px_0px_0px] hover:translate-y-[-2px] transition-all duration-200">
      <div
        className={`items-center shadow-[rgb(0,0,0)_2px_2px_0px_0px] dark:shadow-[rgb(255,255,255)_2px_2px_0px_0px] box-border caret-transparent flex h-14 justify-center w-14 mb-4 border-4 border-solid border-black dark:border-white ${props.iconVariant}`}
      >
        <img
          src={props.iconUrl}
          alt="Icon"
          className="text-white box-border caret-transparent h-7 w-7"
        />
      </div>
      <span className="text-3xl font-black box-border caret-transparent block leading-9 md:text-4xl md:leading-10">
        {displayValue}
      </span>
      <span className="text-neutral-600 dark:text-neutral-300 text-sm font-bold box-border caret-transparent block tracking-[0.35px] leading-5 uppercase mt-1">
        {props.label}
      </span>
    </div>
  );
};
