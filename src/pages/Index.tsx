import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import WhyPerfectSection from "@/components/WhyPerfectSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import AssessmentSection from "@/components/AssessmentSection";
import Footer from "@/components/Footer";

const Index = () => {

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <WhyPerfectSection />
        <TestimonialsSection />
        <AssessmentSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
