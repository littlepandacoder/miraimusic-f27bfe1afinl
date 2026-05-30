import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const sightReadingBullets = [
  { bold: "STRUGGLE", rest: " TO READ NOTES?" },
  { bold: "ANXIETY", rest: " DURING SIGHT READING SECTION?" },
  { bold: "DYING", rest: " TO PICK UP YOUR FAVORITE PIECE WITH EASE?" },
  { bold: "WISHING", rest: " IT TAKES YOU 10 MINUTES OR LESS TO LEARN A PIECE?" },
];

const gamifiedBullets = [
  { bold: "SAY GOODBYE", rest: " TO TRADITIONAL BORING CLASSES." },
  { bold: "SAY HELLO", rest: " TO COOLER WAY OF LEARNING." },
  { bold: "GET YOUR", rest: " ASSESSMENT ON THE GO!" },
];

const ClipboardIcon = () => (
  <svg viewBox="0 0 220 240" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="30" y="30" width="145" height="185" rx="10" fill="#2a6b5e" />
    <rect x="40" y="50" width="125" height="155" rx="6" fill="#f5f5f0" />
    <rect x="75" y="18" width="55" height="28" rx="8" fill="#1a4a40" />
    <rect x="85" y="24" width="35" height="16" rx="4" fill="#f5f5f0" />
    <rect x="55" y="70" width="95" height="8" rx="4" fill="#ccc" />
    <rect x="55" y="88" width="75" height="8" rx="4" fill="#ccc" />
    <rect x="55" y="106" width="85" height="8" rx="4" fill="#ccc" />
    <ellipse cx="130" cy="185" rx="38" ry="22" fill="#f4c49e" />
    <ellipse cx="110" cy="195" rx="28" ry="16" fill="#f4c49e" />
    <rect x="118" y="140" width="10" height="60" rx="3" transform="rotate(-30 118 140)" fill="#f5c518" />
    <polygon points="130,188 136,198 122,194" fill="#f5a623" />
    <rect x="130" y="138" width="10" height="12" rx="1" transform="rotate(-30 130 138)" fill="#e8c4a0" />
    <polygon points="134,135 140,145 128,142" fill="#333" />
  </svg>
);

const RobotIcon = () => (
  <svg viewBox="0 0 220 260" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="55" y="120" width="110" height="90" rx="20" fill="#f0f0f5" />
    <rect x="65" y="55" width="90" height="75" rx="18" fill="#f0f0f5" />
    <rect x="106" y="30" width="8" height="28" rx="4" fill="#c0a0e0" />
    <circle cx="110" cy="26" r="9" fill="#c084fc" />
    <ellipse cx="92" cy="90" rx="14" ry="14" fill="#7c3aed" />
    <ellipse cx="128" cy="90" rx="14" ry="14" fill="#7c3aed" />
    <ellipse cx="92" cy="90" rx="8" ry="8" fill="#a78bfa" />
    <ellipse cx="128" cy="90" rx="8" ry="8" fill="#a78bfa" />
    <circle cx="95" cy="87" r="3" fill="white" />
    <circle cx="131" cy="87" r="3" fill="white" />
    <rect x="90" y="112" width="40" height="10" rx="5" fill="#c084fc" opacity="0.5" />
    <rect x="72" y="135" width="76" height="55" rx="10" fill="#e8e0f8" />
    <circle cx="92" cy="158" r="10" fill="#7c3aed" opacity="0.4" />
    <circle cx="110" cy="155" r="7" fill="#a78bfa" opacity="0.5" />
    <circle cx="128" cy="158" r="10" fill="#7c3aed" opacity="0.4" />
    <rect x="22" y="125" width="35" height="22" rx="11" fill="#f0f0f5" />
    <rect x="163" y="125" width="35" height="22" rx="11" fill="#f0f0f5" />
    <rect x="75" y="205" width="30" height="35" rx="12" fill="#f0f0f5" />
    <rect x="115" y="205" width="30" height="35" rx="12" fill="#f0f0f5" />
  </svg>
);

const WhyPerfectSection = () => {
  const navigate  = useNavigate();
  const iconRef1  = useRef<HTMLDivElement>(null);
  const iconRef2  = useRef<HTMLDivElement>(null);
  const titleRef  = useRef<HTMLHeadingElement>(null);
  const badgeRef  = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const icons = [iconRef1.current, iconRef2.current];
    const floatTweens: gsap.core.Tween[] = [];
    const sts: ScrollTrigger[] = [];

    // ── Title slides in from left ───────────────────────────────────
    if (titleRef.current) {
      gsap.fromTo(
        titleRef.current,
        { x: -50, opacity: 0 },
        {
          x: 0, opacity: 1, duration: 0.7, ease: "power3.out",
          scrollTrigger: { trigger: titleRef.current, start: "top 85%", once: true },
        }
      );
    }

    // ── "PERFECT FOR YOU" badge springs in then glows continuously ──
    if (badgeRef.current) {
      const badge = badgeRef.current;
      gsap.fromTo(
        badge,
        { scale: 0.4, opacity: 0, y: 20 },
        {
          scale: 1, opacity: 1, y: 0, duration: 0.85, ease: "back.out(2.2)", delay: 0.3,
          scrollTrigger: { trigger: titleRef.current, start: "top 85%", once: true },
          onComplete: () => {
            // Persistent glow pulse after reveal
            gsap.to(badge, {
              boxShadow: "0 0 32px hsl(330 85% 55% / 0.85), 0 0 64px hsl(330 85% 55% / 0.4)",
              scale: 1.04,
              duration: 1.6,
              ease: "sine.inOut",
              repeat: -1,
              yoyo: true,
            });
          },
        }
      );
    }

    // ── Icon bounce-in + float ──────────────────────────────────────
    icons.forEach((el, i) => {
      if (!el) return;
      gsap.set(el, { scale: 0, opacity: 0, rotation: i === 0 ? -18 : 18 });

      const st = ScrollTrigger.create({
        trigger: el,
        start: "top 82%",
        once: true,
        onEnter: () => {
          gsap.to(el, {
            scale: 1,
            opacity: 1,
            rotation: 0,
            duration: 0.75,
            ease: "back.out(1.7)",
            onComplete: () => {
              const t = gsap.to(el, {
                y: -12,
                duration: 2.4 + i * 0.6,
                ease: "sine.inOut",
                repeat: -1,
                yoyo: true,
              });
              floatTweens.push(t);
            },
          });
        },
      });
      sts.push(st);
    });

    return () => {
      floatTweens.forEach((t) => t.kill());
      sts.forEach((st) => st.kill());
      if (badgeRef.current) gsap.killTweensOf(badgeRef.current);
    };
  }, []);

  return (
    <section
      className="py-16 sm:py-20"
      style={{ background: "linear-gradient(180deg, hsl(var(--navy-dark)) 0%, hsl(var(--navy)) 100%)" }}
    >
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl">

        {/* Title */}
        <h2
          ref={titleRef}
          className="text-2xl sm:text-3xl md:text-4xl font-black uppercase mb-12 sm:mb-16 text-foreground"
        >
          WHY IT'S{" "}
          <span
            ref={badgeRef}
            className="inline-block px-2 sm:px-3 py-1 rounded text-white"
            style={{ background: "hsl(var(--pink))", display: "inline-block" }}
          >
            PERFECT FOR YOU
          </span>
        </h2>

        {/* Row 1 — Sight Reading */}
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 mb-12 sm:mb-16">
          <div ref={iconRef1} className="w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 shrink-0">
            <ClipboardIcon />
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black uppercase mb-4 sm:mb-6">
              <span className="text-pink">MASTER</span>{" "}
              <span className="font-light text-base sm:text-xl md:text-2xl tracking-widest text-muted-foreground">
                THE ART OF SIGHT READING
              </span>
            </h3>
            <div className="space-y-2 sm:space-y-3">
              {sightReadingBullets.map((b, i) => (
                <p key={i} className="text-xs sm:text-sm tracking-widest uppercase text-muted-foreground">
                  <strong className="text-foreground">{b.bold}</strong>{b.rest}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2 — Gamified */}
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 mb-16 sm:mb-20">
          <div ref={iconRef2} className="w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 shrink-0">
            <RobotIcon />
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black uppercase mb-4 sm:mb-6">
              <span className="text-pink">GAMIFIED</span>{" "}
              <span className="font-light text-base sm:text-xl md:text-2xl tracking-widest text-muted-foreground">
                LECTURES WITH AI INTEGRATION
              </span>
            </h3>
            <div className="space-y-2 sm:space-y-3">
              {gamifiedBullets.map((b, i) => (
                <p key={i} className="text-xs sm:text-sm tracking-widest uppercase text-muted-foreground">
                  <strong className="text-foreground">{b.bold}</strong>{b.rest}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
          <p className="text-lg sm:text-xl md:text-2xl font-black uppercase tracking-wide text-foreground text-center">
            SEE IF YOU'RE A PERFECT FIT.
          </p>
          <button
            onClick={() => navigate("/signup")}
            className="px-8 py-4 rounded-full font-black uppercase tracking-widest text-white bg-pink transition-all hover:scale-105 active:scale-95 text-base sm:text-lg shrink-0 animate-pulse-glow"
          >
            START FOR FREE
          </button>
        </div>

      </div>
    </section>
  );
};

export default WhyPerfectSection;
