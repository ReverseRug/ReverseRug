import { FooterInfo } from "@/sections/Footer/components/FooterInfo";
import { FooterDisclaimer } from "@/sections/Footer/components/FooterDisclaimer";

export const FooterContent = () => {
  return (
    <div className="box-border caret-transparent max-w-none w-full mx-auto px-4 py-8 md:max-w-screen-xl">
      <FooterInfo />
      <FooterDisclaimer />
    </div>
  );
};
