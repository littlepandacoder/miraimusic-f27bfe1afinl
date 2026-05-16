import { useTranslation } from "react-i18next";
import PianoKeyboard from "./PianoKeyboard";

const HeroSection = () => {
  const { t } = useTranslation();
  return (
    <section id="home" className="min-h-screen pt-24 pb-16 flex flex-col justify-center">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-foreground mb-6 animate-slide-up leading-tight">
            {t("hero.line1")}<br />{t("hero.line2")}
          </h1>
          <p className="text-xl md:text-2xl font-semibold mb-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <span className="text-primary">{t("hero.guarantee")}</span>{" "}
            <span className="text-foreground">{t("hero.exam")}</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="/signup"
              className="btn-hero inline-block animate-slide-up animate-pulse-glow"
              style={{ animationDelay: "0.2s" }}
            >
              {t("hero.cta")}
            </a>
          </div>
        </div>

        <div className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <PianoKeyboard />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
