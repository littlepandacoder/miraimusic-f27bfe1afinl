import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import gsap from "gsap";
import PianoKeyboard from "./PianoKeyboard";
import MusicNotesBackground from "./MusicNotesBackground";
import SoundWave from "./SoundWave";

// Per-letter colours across the spectrum for "SMARTER"
const SMARTER_COLORS = ["#ec4899", "#d946ef", "#a855f7", "#8b5cf6", "#6366f1", "#22d3ee", "#84cc16"];

const HeroSection = () => {
  const { t } = useTranslation();
  const btnRef       = useRef<HTMLAnchorElement>(null);
  const zoneRef      = useRef<HTMLDivElement>(null);
  const glowTl       = useRef<gsap.core.Timeline | null>(null);
  const smarterRefs  = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const btn  = btnRef.current;
    const zone = zoneRef.current;
    if (!btn || !zone) return;

    // ── "SMARTER" letter animation ─────────────────────────────────
    const letters = smarterRefs.current.filter(Boolean) as HTMLSpanElement[];
    if (letters.length) {
      // Start: 3-D flip-in from above (rotationX -80°, invisible)
      gsap.set(letters, {
        opacity: 0,
        rotationX: -80,
        y: -10,
        transformOrigin: "top center",
        transformPerspective: 500,
      });

      // Flip into place after the slide-up CSS animation finishes (~0.9s)
      gsap.to(letters, {
        opacity: 1,
        rotationX: 0,
        y: 0,
        duration: 0.55,
        ease: "back.out(1.6)",
        stagger: 0.07,
        delay: 0.9,
        onComplete: () => {
          // Wave: each letter bobs up/down with offset timing → traveling wave
          letters.forEach((el, i) => {
            gsap.to(el, {
              y: -10,
              duration: 0.52,
              ease: "sine.inOut",
              repeat: -1,
              yoyo: true,
              delay: i * 0.1,
            });
          });
        },
      });
    }

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
      gsap.killTweensOf(smarterRefs.current.filter(Boolean));
    };
  }, []);

  return (
    <section id="home" className="relative min-h-screen pt-24 pb-16 flex flex-col justify-center overflow-hidden">
      <MusicNotesBackground />
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-foreground mb-6 animate-slide-up leading-tight">
            {t("hero.line1")}<br />
            {/* "SMARTER" — spectrum colours + wave animation */}
            {t("hero.line2").split("").map((char, i) => (
              <span
                key={i}
                ref={(el) => { smarterRefs.current[i] = el; }}
                style={{
                  display: "inline-block",
                  color: SMARTER_COLORS[i % SMARTER_COLORS.length],
                  filter: `drop-shadow(0 0 12px ${SMARTER_COLORS[i % SMARTER_COLORS.length]}88)`,
                }}
              >
                {char}
              </span>
            ))}
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
