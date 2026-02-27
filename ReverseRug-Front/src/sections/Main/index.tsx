import { HeroSection } from "@/sections/HeroSection";
import { StatsSection } from "@/sections/StatsSection";
import { FeaturedPerksSection } from "@/sections/FeaturedPerksSection";
import { CTASection } from "@/sections/CTASection";
import { CategorySection } from "@/sections/CategorySection";

export const Main = () => {
  return (
    <main className="box-border caret-transparent basis-[0%] grow">
      <div className="box-border caret-transparent">
        <HeroSection />
        <StatsSection />
        <FeaturedPerksSection />
        <CTASection />
        <CategorySection />
      </div>
    </main>
  );
};
