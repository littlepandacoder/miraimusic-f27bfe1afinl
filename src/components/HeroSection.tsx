import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import gsap from "gsap";
import PianoKeyboard from "./PianoKeyboard";
import MusicNotesBackground from "./MusicNotesBackground";
import SoundWave from "./SoundWave";

const HeroSection = () => {
  const { t } = useTranslation();
  const btnRef = useRef<HTMLAnchorElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const glowTl = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const btn = btnRef.current;
    const zone = zoneRef.current;
    if (!btn || !zone) return;

    const onMove = (e: MouseEvent) => {
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      gsap.to(btn, {
        x: (e.clientX - cx) * 0.38,
        y: (e.clientY - cy) * 0.38,
        duration: 0.3,
        ease: "power2.out",
      });
    };

    const onEnter = () => {
      if (glowTl.current) glowTl.current.kill();
      glowTl.current = gsap.timeline();
      glowTl.current.to(btn, {
        scale: 1.07,
        boxShadow:
          "0 0 80px hsl(330 85% 55% / 0.95), 0 0 160px hsl(330 85% 55% / 0.6), 0 0 240px hsl(330 85% 55% / 0.3), 0 8px 44px hsl(330 85% 55% / 0.8)",
        duration: 0.25,
        ease: "power2.out",
      });
    };

    const onLeave = () => {
      // Elastic snap-back — the "ease reverse" spring effect
      gsap.to(btn, {
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.75,
        ease: "elastic.out(1, 0.35)",
      });
      // Reverse the glow timeline so it eases back exactly how it eased in
      if (glowTl.current) {
        glowTl.current.reverse();
        glowTl.current.eventCallback("onReverseComplete", () => {
          if (btn) gsap.set(btn, { clearProps: "boxShadow" });
        });
      }
    };

    zone.addEventListener("mousemove", onMove);
    zone.addEventListener("mouseenter", onEnter);
    zone.addEventListener("mouseleave", onLeave);

    return () => {
      zone.removeEventListener("mousemove", onMove);
      zone.removeEventListener("mouseenter", onEnter);
      zone.removeEventListener("mouseleave", onLeave);
      glowTl.current?.kill();
    };
  }, []);

  return (
    <section id="home" className="relative min-h-screen pt-24 pb-16 flex flex-col justify-center overflow-hidden">
      <MusicNotesBackground />
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-foreground mb-6 animate-slide-up leading-tight">
            {t("hero.line1")}<br />{t("hero.line2")}
          </h1>
          <p className="text-xl md:text-2xl font-semibold mb-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <span className="text-primary">{t("hero.guarantee")}</span>{" "}
            <span className="text-foreground">{t("hero.exam")}</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            {/* Magnetic zone — padding expands the attraction area beyond the button */}
            <div
              ref={zoneRef}
              style={{ padding: "40px", margin: "-40px", display: "inline-block" }}
            >
              <a
                ref={btnRef}
                href="/signup"
                className="btn-hero inline-block animate-slide-up animate-pulse-glow"
                style={{ animationDelay: "0.2s" }}
              >
                {t("hero.cta")}
              </a>
            </div>
          </div>
          <SoundWave />
        </div>

        <div className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <PianoKeyboard />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
