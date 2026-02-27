export type CategoryCardProps = {
  category: string;
  emoji: string;
  title: string;
  variant: string;
  titleVariant?: string;
};

export const CategoryCard = (props: CategoryCardProps) => {
  return (
    <a
      href={`#perks`}
      onClick={(e) => {
        e.preventDefault();
        document.querySelector('#perks')?.scrollIntoView({ behavior: 'smooth' });
      }}
      className={`items-center shadow-[rgb(0,0,0)_4px_4px_0px_0px] dark:shadow-[rgb(255,255,255)_4px_4px_0px_0px] box-border caret-transparent flex flex-col text-center p-6 border-4 border-solid border-black dark:border-white hover:shadow-[rgb(0,0,0)_6px_6px_0px_0px] dark:hover:shadow-[rgb(255,255,255)_6px_6px_0px_0px] hover:translate-y-[-2px] transition-all duration-200 ${props.variant}`}
    >
      <span className="text-4xl box-border caret-transparent block leading-10 mb-2">
        {props.emoji}
      </span>
      <span
        className={`text-sm font-black box-border caret-transparent block leading-5 uppercase ${props.titleVariant || ""}`}
      >
        {props.title}
      </span>
    </a>
  );
};
