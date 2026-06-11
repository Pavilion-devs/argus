import Animations from "@/components/Animations";
import VerticalLines from "@/components/VerticalLines";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import DashboardOverview from "@/components/DashboardOverview";
import HowItWorksSection from "@/components/HowItWorksSection";
import FeaturesSection from "@/components/FeaturesSection";
import MetricsSection from "@/components/MetricsSection";
import TestimonialSection from "@/components/TestimonialSection";
import PricingSection from "@/components/PricingSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="w-full min-h-screen bg-[#030303] text-white selection:bg-indigo-500/30">
      <Animations />
      <div className="flex flex-col min-h-screen relative bg-[#030303]">
        <VerticalLines />
        <Navbar />
        <HeroSection />
        <DashboardOverview />
        <HowItWorksSection />
        <FeaturesSection />
        <MetricsSection />
        <TestimonialSection />
        <PricingSection />
        <CTASection />
        <Footer />
      </div>
    </div>
  );
}
