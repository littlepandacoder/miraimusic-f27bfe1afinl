import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSmoothScroll } from "@/hooks/useSmoothScroll";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import WhyPerfectSection from "@/components/WhyPerfectSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import AssessmentSection from "@/components/AssessmentSection";
import MarqueeBanner from "@/components/MarqueeBanner";
import StudentsSection from "@/components/StudentsSection";
import Footer from "@/components/Footer";

gsap.registerPlugin(ScrollTrigger);

const Index = () => {
  useSmoothScroll(); // landing page only — keeps dashboard scroll unaffected

  useEffect(() => {
    // Reveal section headings and feature cards as they enter the viewport
    const headings = gsap.utils.toArray<HTMLElement>(".section-title");
    headings.forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 35 },
        {
          opacity: 1, y: 0, duration: 0.75, ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        }
      );
    });

    // Feature cards stagger
    const featureCards = gsap.utils.toArray<HTMLElement>(".feature-card");
    if (featureCards.length) {
      gsap.fromTo(
        featureCards,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 0.6, ease: "power2.out", stagger: 0.1,
          scrollTrigger: { trigger: featureCards[0], start: "top 85%", once: true },
        }
      );
    }

    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <MarqueeBanner />
        <FeaturesSection />
        <TestimonialsSection />
        <MarqueeBanner variant="compact" />
        <WhyPerfectSection />
        <StudentsSection />
        <AssessmentSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
