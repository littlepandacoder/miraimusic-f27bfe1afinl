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
  <svg viewBox="0 0 512 512" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
    {/* Antenna wire */}
    <path fill="#a855f7" d="M256.002,90.32c-4.725,0-8.553-3.829-8.553-8.553V23.369c0-4.723,3.828-8.553,8.553-8.553
      c4.725,0,8.553,3.829,8.553,8.553v58.398C264.555,86.49,260.727,90.32,256.002,90.32z"/>
    {/* Chest bar */}
    <rect x="191.825" y="208.645" fill="#9333ea" width="128.351" height="34.782"/>
    {/* Body top */}
    <path fill="#ec4899" d="M364.126,81.047v136.721h-43.951H191.825h-43.951V81.047c0-15.977,12.955-28.932,28.932-28.932h79.2
      h79.189C351.182,52.116,364.126,65.071,364.126,81.047z"/>
    {/* Body top shadow */}
    <path fill="#be185d" d="M196.192,52.116h-19.387c-15.977,0-28.932,12.955-28.932,28.932v136.721h19.387V81.047
      C167.261,65.071,180.216,52.116,196.192,52.116z"/>
    {/* Legs */}
    <rect x="171.606" y="363.784" fill="#c084fc" width="33.413" height="121.303"/>
    <rect x="306.992" y="363.784" fill="#c084fc" width="33.402" height="121.303"/>
    {/* Leg shadows */}
    <path fill="#9333ea" d="M306.992,364.924v42.103h33.402v-42.103H306.992z M171.606,407.027h33.413v-42.103h-33.413V407.027z"/>
    {/* Arms */}
    <rect x="348.799" y="264.091" fill="#c084fc" width="62.299" height="35.17"/>
    <rect x="100.468" y="264.091" fill="#c084fc" width="63.166" height="35.17"/>
    {/* Eye outer rings (yellow → light purple) */}
    <path fill="#c084fc" d="M203.251,108.576c16.513,0,29.89,13.388,29.89,29.89c0,16.513-13.377,29.89-29.89,29.89
      c-16.501,0-29.878-13.377-29.878-29.89C173.373,121.964,186.75,108.576,203.251,108.576z"/>
    <path fill="#c084fc" d="M308.749,108.576c16.501,0,29.89,13.388,29.89,29.89c0,16.513-13.388,29.89-29.89,29.89
      c-16.513,0-29.89-13.377-29.89-29.89C278.859,121.964,292.236,108.576,308.749,108.576z"/>
    {/* Foot caps */}
    <polygon fill="#ec4899" points="224.36,471.562 224.36,512 152.265,512 152.265,471.562 171.606,471.562 205.019,471.562"/>
    <polygon fill="#ec4899" points="359.735,471.562 359.735,512 287.651,512 287.651,471.562 306.992,471.562 340.394,471.562"/>
    {/* Arm caps */}
    <path fill="#ec4899" d="M416.253,269.611v140.416h-31.885V299.261v-35.17v-26.366l0,0
      C401.978,237.725,416.253,252.001,416.253,269.611z"/>
    <path fill="#ec4899" d="M127.632,299.261v110.766H95.747V269.611c0-17.61,14.275-31.885,31.885-31.885l0,0v26.366V299.261z"/>
    {/* Lower body */}
    <path fill="#a855f7" d="M364.126,299.261v78.048h-23.731v-0.011h-33.402v0.011H205.019v-0.011h-33.413v0.011h-23.731v-78.048
      v-35.17v-26.366h43.951h128.351h43.951v26.366L364.126,299.261L364.126,299.261z"/>
    {/* Lower body shadow */}
    <rect x="147.874" y="237.725" fill="#7c3aed" width="38.043" height="139.572"/>
    {/* Eye dark rings */}
    <path fill="#0f1a2e" d="M241.698,138.467c0-21.196-17.245-38.441-38.441-38.441c-21.198,0-38.442,17.245-38.442,38.441
      s17.245,38.441,38.442,38.441C224.453,176.908,241.698,159.663,241.698,138.467z M181.92,138.467
      c0-11.764,9.572-21.336,21.337-21.336s21.336,9.571,21.336,21.336c0,11.764-9.571,21.336-21.336,21.336
      S181.92,150.231,181.92,138.467z"/>
    <path fill="#0f1a2e" d="M308.748,176.908c21.196,0,38.441-17.245,38.441-38.441s-17.245-38.441-38.441-38.441
      c-21.198,0-38.442,17.245-38.442,38.441S287.55,176.908,308.748,176.908z M308.748,117.13c11.764,0,21.335,9.571,21.335,21.336
      s-9.571,21.336-21.335,21.336s-21.337-9.571-21.337-21.336S296.983,117.13,308.748,117.13z"/>
    {/* Body dots */}
    <circle fill="#0f1a2e" cx="316.275" cy="271.127" r="8.553"/>
    <circle fill="#0f1a2e" cx="195.725" cy="271.127" r="8.553"/>
    {/* Antenna ball — pink accent */}
    <circle fill="#ec4899" cx="256.006" cy="14.816" r="14.816"/>
    {/* Mouth shadow */}
    <path fill="#7c3aed" d="M303.469,330.906h-94.937c0-11.073,3.798-21.268,10.149-29.342
      c8.701-11.039,22.181-18.132,37.325-18.132C282.223,283.432,303.469,304.689,303.469,330.906z"/>
    {/* Mouth highlight */}
    <path fill="#c084fc" d="M294.813,330.906h-86.282c0-11.073,3.798-21.268,10.149-29.342
      c8.074-6.352,18.258-10.149,29.342-10.149C271.515,291.415,291.027,308.486,294.813,330.906z"/>
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
          scrollTrigger: { trigger: card, start: "top 86%", toggleActions: "play none none reverse" }, delay: 0.1 }
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
