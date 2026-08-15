import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import PageWrapper from "../components/common/PageWrapper";
import Hero from "../components/sections/Hero";
import ValueStrip from "../components/sections/ValueStrip";
import HowItWorks from "../components/sections/HowItWorks";
import Features from "../components/sections/Features";
import WhatsAppSection from "../components/sections/WhatsAppSection";
import FamilyCare from "../components/sections/FamilyCare";
import NestySection from "../components/sections/NestySection";
import CtaSection from "../components/sections/CtaSection";

export default function HomePage() {
  const location = useLocation();

  // When arriving via a section hash (e.g. /#features from the navbar on
  // another page), scroll to that section once the homepage has painted.
  useEffect(() => {
    if (!location.hash) return;
    const target = document.getElementById(location.hash.slice(1));
    if (!target) return;
    const timer = setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
    return () => clearTimeout(timer);
  }, [location.hash, location.pathname]);

  return (
    <PageWrapper>
      <Hero />
      <ValueStrip />
      <HowItWorks />
      <Features />
      <WhatsAppSection />
      <FamilyCare />
      <NestySection />
      <CtaSection />
    </PageWrapper>
  );
}