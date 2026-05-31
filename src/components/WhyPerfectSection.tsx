import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const sightReadingBullets = [
  { bold: "STRUGGLE", rest: " TO READ NOTES?" },
  { bold: "ANXIETY",  rest: " DURING SIGHT READING SECTION?" },
  { bold: "DYING",    rest: " TO PICK UP YOUR FAVOURITE PIECE WITH EASE?" },
  { bold: "WISHING",  rest: " IT TAKES YOU 10 MINUTES OR LESS TO LEARN A PIECE?" },
];

const gamifiedBullets = [
  { bold: "SAY GOODBYE", rest: " TO TRADITIONAL BORING CLASSES." },
  { bold: "SAY HELLO",   rest: " TO A COOLER WAY OF LEARNING." },
  { bold: "GET YOUR",    rest: " ASSESSMENT ON THE GO!" },
];

/* ── Dark-themed SVG icons ───────────────────────────────────────────── */
const SightReadingIcon = () => (
  <svg viewBox="0 0 220 240" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Clipboard body */}
    <rect x="30" y="30" width="145" height="185" rx="12" fill="hsl(222 47% 14%)" stroke="#ec4899" strokeWidth="1.5" strokeOpacity="0.35"/>
    {/* Inner paper */}
    <rect x="42" y="52" width="121" height="151" rx="6" fill="hsl(222 47% 18%)"/>
    {/* Clip at top */}
    <rect x="77" y="18" width="51" height="26" rx="8" fill="hsl(222 47% 11%)" stroke="#ec4899" strokeWidth="1" strokeOpacity="0.4"/>
    {/* Staff lines (sight reading) */}
    <rect x="58" y="72"  width="89" height="4" rx="2" fill="#ec4899" fillOpacity="0.55"/>
    <rect x="58" y="84"  width="89" height="4" rx="2" fill="#ec4899" fillOpacity="0.55"/>
    <rect x="58" y="96"  width="89" height="4" rx="2" fill="#ec4899" fillOpacity="0.55"/>
    <rect x="58" y="108" width="89" height="4" rx="2" fill="#ec4899" fillOpacity="0.55"/>
    <rect x="58" y="120" width="89" height="4" rx="2" fill="#ec4899" fillOpacity="0.55"/>
    {/* Music notes on the staff */}
    <ellipse cx="78"  cy="72"  rx="7" ry="5" transform="rotate(-15 78 72)"  fill="#ec4899"/>
    <rect    x="84"   y="50"   width="3" height="23" rx="1.5" fill="#ec4899"/>
    <ellipse cx="106" cy="84"  rx="7" ry="5" transform="rotate(-15 106 84)" fill="#a855f7"/>
    <rect    x="112"  y="62"   width="3" height="23" rx="1.5" fill="#a855f7"/>
    <ellipse cx="132" cy="96"  rx="7" ry="5" transform="rotate(-15 132 96)" fill="#22d3ee"/>
    <rect    x="138"  y="74"   width="3" height="23" rx="1.5" fill="#22d3ee"/>
    {/* Pencil */}
    <rect x="118" y="150" width="10" height="52" rx="3" transform="rotate(-30 118 150)" fill="#f5c518" fillOpacity="0.9"/>
    <polygon points="128,192 134,204 120,200" fill="#f5a623"/>
    <rect    x="130"  y="148"  width="10" height="11" rx="1" transform="rotate(-30 130 148)" fill="#ec4899"/>
    <polygon points="134,145 140,155 128,152" fill="hsl(222 47% 11%)"/>
  </svg>
);

const GamifiedIcon = () => (
  <svg viewBox="0 0 220 260" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Robot body */}
    <rect x="55" y="120" width="110" height="90"  rx="20" fill="hsl(222 47% 14%)" stroke="#a855f7" strokeWidth="1.5" strokeOpacity="0.4"/>
    {/* Robot head */}
    <rect x="65" y="55"  width="90" height="75"   rx="18" fill="hsl(222 47% 14%)" stroke="#a855f7" strokeWidth="1.5" strokeOpacity="0.4"/>
    {/* Antenna */}
    <rect x="106" y="30" width="8" height="28" rx="4" fill="#c084fc"/>
    <circle cx="110" cy="26" r="9" fill="#c084fc" filter="url(#glow)"/>
    {/* Eyes */}
    <ellipse cx="92"  cy="90" rx="14" ry="14" fill="#1e1535" stroke="#a855f7" strokeWidth="2"/>
    <ellipse cx="128" cy="90" rx="14" ry="14" fill="#1e1535" stroke="#a855f7" strokeWidth="2"/>
    <ellipse cx="92"  cy="90" rx="8"  ry="8"  fill="#a78bfa"/>
    <ellipse cx="128" cy="90" rx="8"  ry="8"  fill="#a78bfa"/>
    <circle  cx="95"  cy="87" r="3" fill="white"/>
    <circle  cx="131" cy="87" r="3" fill="white"/>
    {/* Mouth / speaker grill */}
    <rect x="90" y="112" width="40" height="8" rx="4" fill="#c084fc" fillOpacity="0.35"/>
    {/* Screen / chest display — mini piano keys */}
    <rect x="72" y="133" width="76" height="52" rx="10" fill="hsl(222 47% 11%)" stroke="#ec4899" strokeWidth="1" strokeOpacity="0.3"/>
    <rect x="80" y="143" width="8" height="20" rx="2" fill="white" fillOpacity="0.85"/>
    <rect x="92" y="143" width="8" height="20" rx="2" fill="white" fillOpacity="0.85"/>
    <rect x="104" y="143" width="8" height="20" rx="2" fill="white" fillOpacity="0.85"/>
    <rect x="116" y="143" width="8" height="20" rx="2" fill="white" fillOpacity="0.85"/>
    <rect x="128" y="143" width="8" height="20" rx="2" fill="white" fillOpacity="0.85"/>
    <rect x="87"  y="143" width="6" height="13" rx="2" fill="hsl(222 47% 11%)"/>
    <rect x="99"  y="143" width="6" height="13" rx="2" fill="#ec4899"/>
    <rect x="122" y="143" width="6" height="13" rx="2" fill="#a855f7"/>
    {/* XP score */}
    <text x="86" y="177" fontSize="11" fill="#ec4899" fontWeight="bold">+XP</text>
    {/* Arms */}
    <rect x="22"  y="125" width="35" height="22" rx="11" fill="hsl(222 47% 14%)" stroke="#a855f7" strokeWidth="1" strokeOpacity="0.3"/>
    <rect x="163" y="125" width="35" height="22" rx="11" fill="hsl(222 47% 14%)" stroke="#a855f7" strokeWidth="1" strokeOpacity="0.3"/>
    {/* Legs */}
    <rect x="75"  y="205" width="30" height="35" rx="12" fill="hsl(222 47% 14%)" stroke="#a855f7" strokeWidth="1" strokeOpacity="0.3"/>
    <rect x="115" y="205" width="30" height="35" rx="12" fill="hsl(222 47% 14%)" stroke="#a855f7" strokeWidth="1" strokeOpacity="0.3"/>
    {/* Glow filter */}
    <defs>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
  </svg>
);

/* ─────────────────────────────────────────────────────────────────────── */

const WhyPerfectSection = () => {
  const navigate  = useNavigate();
  const iconRef1  = useRef<HTMLDivElement>(null);
  const iconRef2  = useRef<HTMLDivElement>(null);
  const titleRef  = useRef<HTMLHeadingElement>(null);
  const badgeRef  = useRef<HTMLSpanElement>(null);
  const card1Ref  = useRef<HTMLDivElement>(null);
  const card2Ref  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const icons = [iconRef1.current, iconRef2.current];
    const cards = [card1Ref.current, card2Ref.current];
    const floatTweens: gsap.core.Tween[] = [];
    const sts: ScrollTrigger[] = [];

    // Title slides in from left
    if (titleRef.current) {
      gsap.fromTo(
        titleRef.current,
        { x: -50, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.7, ease: "power3.out",
          scrollTrigger: { trigger: titleRef.current, start: "top 85%", once: true } }
      );
    }

    // "PERFECT FOR YOU" springs in then glows
    if (badgeRef.current) {
      const badge = badgeRef.current;
      gsap.fromTo(
        badge,
        { scale: 0.4, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.85, ease: "back.out(2.2)", delay: 0.3,
          scrollTrigger: { trigger: titleRef.current, start: "top 85%", once: true },
          onComplete: () => {
            gsap.to(badge, {
              boxShadow: "0 0 32px hsl(330 85% 55% / 0.85), 0 0 64px hsl(330 85% 55% / 0.4)",
              scale: 1.04, duration: 1.6, ease: "sine.inOut", repeat: -1, yoyo: true,
            });
          },
        }
      );
    }

    // Cards slide in from opposite sides
    cards.forEach((card, i) => {
      if (!card) return;
      gsap.fromTo(
        card,
        { x: i % 2 === 0 ? -50 : 50, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.65, ease: "power2.out",
          scrollTrigger: { trigger: card, start: "top 86%", once: true }, delay: 0.1 }
      );
    });

    // Icons bounce in + float
    icons.forEach((el, i) => {
      if (!el) return;
      gsap.set(el, { scale: 0, opacity: 0, rotation: i === 0 ? -18 : 18 });
      const st = ScrollTrigger.create({
        trigger: el, start: "top 82%", once: true,
        onEnter: () => {
          gsap.to(el, {
            scale: 1, opacity: 1, rotation: 0, duration: 0.75, ease: "back.out(1.7)",
            onComplete: () => {
              const t = gsap.to(el, {
                y: -12, duration: 2.4 + i * 0.6, ease: "sine.inOut", repeat: -1, yoyo: true,
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
    <section className="py-16 sm:py-20 bg-navy-dark/50">
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl">

        {/* Section header */}
        <div className="mb-10 sm:mb-14">
          <p className="text-pink text-xs font-bold uppercase tracking-widest mb-3">Made for You</p>
          <h2
            ref={titleRef}
            className="text-2xl sm:text-3xl md:text-4xl font-black uppercase text-foreground"
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
        </div>

        {/* Card 1 — Sight Reading */}
        <div ref={card1Ref} className="feature-card mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
            <div ref={iconRef1} className="w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 shrink-0">
              <SightReadingIcon />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-xl sm:text-2xl font-black uppercase mb-4">
                <span className="text-pink">MASTER</span>{" "}
                <span className="font-light text-base sm:text-lg tracking-widest text-muted-foreground">
                  THE ART OF SIGHT READING
                </span>
              </h3>
              <div className="space-y-2">
                {sightReadingBullets.map((b, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-pink text-xs mt-0.5 shrink-0">✦</span>
                    <p className="text-xs sm:text-sm tracking-widest uppercase text-muted-foreground text-left">
                      <strong className="text-foreground">{b.bold}</strong>{b.rest}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2 — Gamified */}
        <div ref={card2Ref} className="feature-card mb-12 sm:mb-16">
          <div className="flex flex-col sm:flex-row-reverse items-center gap-6 sm:gap-10">
            <div ref={iconRef2} className="w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 shrink-0">
              <GamifiedIcon />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-xl sm:text-2xl font-black uppercase mb-4">
                <span className="text-pink">GAMIFIED</span>{" "}
                <span className="font-light text-base sm:text-lg tracking-widest text-muted-foreground">
                  LECTURES WITH AI INTEGRATION
                </span>
              </h3>
              <div className="space-y-2">
                {gamifiedBullets.map((b, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-purple-400 text-xs mt-0.5 shrink-0">✦</span>
                    <p className="text-xs sm:text-sm tracking-widest uppercase text-muted-foreground text-left">
                      <strong className="text-foreground">{b.bold}</strong>{b.rest}
                    </p>
                  </div>
                ))}
              </div>
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
