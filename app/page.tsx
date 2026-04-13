import { SiteFooter } from "@/components/footer/site-footer";
import { SiteHeader } from "@/components/header/site-header";
import { ClientLogoStrip } from "@/components/sections/client-logo-strip";
import { HeroSection } from "@/components/sections/hero-section";
import { Section03 } from "@/components/sections/section03";
import { Section04 } from "@/components/sections/section04";
import { Section02 } from "@/components/sections/section02";
import { Section05 } from "@/components/sections/section05";
import { Section06 } from "@/components/sections/section06";
import { Section07 } from "@/components/sections/section07";
import { Section08 } from "@/components/sections/section08";
import { Section09 } from "@/components/sections/section09";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <SiteHeader />
      <main>
        <HeroSection />
        <ClientLogoStrip />
        <Section02 />
        <Section06 />
        <Section07 />
        <Section03 />
        <Section08 />
        <Section09 />
        <Section04 />

        <Section05 />
      </main>
    </div>
  );
}
