import { Header } from "@/sections/Header";
import { Hero } from "@/sections/Hero";
import { Stats } from "@/sections/Stats";
import { Featured } from "@/sections/Featured";
import { FilterGrid } from "@/sections/FilterGrid";
import { Transparency } from "@/sections/Transparency";
import { FAQ } from "@/sections/FAQ";
import { BottomCTA } from "@/sections/BottomCTA";
import { Footer } from "@/sections/Footer";
import { MobileCTA } from "@/components/MobileCTA";
import { WinnersList } from "@/components/WinnersList";
import { AdminPage } from "@/sections/AdminPage";

export const App = () => {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  if (pathname.startsWith("/admin")) {
    return <AdminPage />;
  }

  return (
    <div className="min-h-screen bg-[#FEF3C7] text-[#0F172A]">
      <Header />
      <Hero />
      <Stats />
      <WinnersList />
      <Featured />
      <FilterGrid />
      <Transparency />
      <FAQ />
      <BottomCTA />
      <Footer />
      <MobileCTA />
    </div>
  );
};
