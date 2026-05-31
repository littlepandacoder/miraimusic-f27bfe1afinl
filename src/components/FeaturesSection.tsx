import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    number: "01",
    color: "#ec4899",
    tag: "Independent Learning",
    title: "Curated Foundation Modules",
    description:
      "Start with a structured, self-paced foundation track. Every lesson is carefully sequenced — from reading notes to mastering rhythm — so you always know exactly what to learn next.",
    icon: (
      <svg viewBox="0 0 64 64" fill="none" className="w-10 h-10" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="10" width="36" height="44" rx="4" fill="#ec4899" fillOpacity="0.15" stroke="#ec4899" strokeWidth="2"/>
        <rect x="14" y="18" width="24" height="3" rx="1.5" fill="#ec4899"/>
        <rect x="14" y="25" width="18" height="3" rx="1.5" fill="#ec4899" fillOpacity="0.6"/>
        <rect x="14" y="32" width="21" height="3" rx="1.5" fill="#ec4899" fillOpacity="0.6"/>
        <rect x="14" y="39" width="14" height="3" rx="1.5" fill="#ec4899" fillOpacity="0.4"/>
        <rect x="44" y="14" width="12" height="36" rx="3" fill="#a855f7" fillOpacity="0.25" stroke="#a855f7" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    number: "02",
    color: "#a855f7",
    tag: "Gate-Locked Progress",
    title: "Music Theory Games",
    description:
      "Each module contains interactive music theory games — Note Naming, Sight Reading, Rhythm Quiz and more. You must pass each game before unlocking the next chapter. No shortcuts, only mastery.",
    icon: (
      <svg viewBox="0 0 64 64" fill="none" className="w-10 h-10" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="20" fill="#a855f7" fillOpacity="0.12" stroke="#a855f7" strokeWidth="2"/>
        <rect x="26" y="34" width="12" height="10" rx="3" fill="#a855f7"/>
        <path d="M 26 34 Q 26 26 32 26 Q 38 26 38 34" stroke="#a855f7" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <circle cx="32" cy="39" r="1.5" fill="white"/>
        <text x="10" y="18" fontSize="10" fill="#ec4899">★</text>
        <text x="46" y="18" fontSize="10" fill="#22d3ee">★</text>
        <text x="28" y="10" fontSize="10" fill="#84cc16">★</text>
      </svg>
    ),
  },
  {
    number: "03",
    color: "#22d3ee",
    tag: "Gamified Practice",
    title: "Piano Hero Mode",
    description:
      "Practice real songs in Piano Hero mode: notes fall from the top, you play them in time, and earn XP for every accurate hit. It turns every session into a game you actually want to repeat.",
    icon: (
      <svg viewBox="0 0 64 64" fill="none" className="w-10 h-10" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="26" width="48" height="26" rx="10" fill="#22d3ee" fillOpacity="0.12" stroke="#22d3ee" strokeWidth="2"/>
        <rect x="18" y="10" width="8" height="22" rx="3" fill="#ec4899" fillOpacity="0.85"/>
        <rect x="30" y="6" width="8" height="26" rx="3" fill="#a855f7" fillOpacity="0.85"/>
        <rect x="42" y="14" width="8" height="16" rx="3" fill="#22d3ee" fillOpacity="0.85"/>
        <circle cx="24" cy="38" r="4" fill="#ec4899" fillOpacity="0.5"/>
        <circle cx="36" cy="38" r="4" fill="#a855f7" fillOpacity="0.5"/>
        <circle cx="44" cy="38" r="4" fill="#22d3ee" fillOpacity="0.5"/>
      </svg>
    ),
  },
  {
    number: "04",
    color: "#f5c518",
    tag: "Exam Ready",
    title: "Apply for Your Trinity Exam",
    description:
      "Once every module is complete and every gate-locked assessment is passed, you're ready. Apply for your official Trinity College London piano exam — with a 100% pass guarantee behind you.",
    icon: (
      <svg viewBox="0 0 64 64" fill="none" className="w-10 h-10" xmlns="http://www.w3.org/2000/svg">
        <path d="M 20 14 L 44 14 L 40 38 Q 32 44 24 38 Z" fill="#f5c518" fillOpacity="0.2" stroke="#f5c518" strokeWidth="2"/>
        <rect x="28" y="42" width="8" height="8" rx="1" fill="#f5c518" fillOpacity="0.4"/>
        <rect x="22" y="50" width="20" height="4" rx="2" fill="#f5c518" fillOpacity="0.6"/>
        <path d="M 14 20 Q 10 30 14 38" stroke="#84cc16" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M 50 20 Q 54 30 50 38" stroke="#84cc16" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <text x="26" y="34" fontSize="13" fill="#f5c518" fontWeight="bold">✓</text>
      </svg>
    ),
  },
];

const FeaturesSection = () => {
  const sectionRef  = useRef<HTMLElement>(null);
  const titleRef    = useRef<HTMLDivElement>(null);
  const lineRef     = useRef<HTMLDivElement>(null);
  const cardRefs    = useRef<(HTMLDivElement | null)[]>([]);
  const bubbleRefs  = useRef<(HTMLDivElement | null)[]>([]);
  const iconRefs    = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    // ── 1. Title reveal ────────────────────────────────────────────
    if (titleRef.current) {
      gsap.fromTo(titleRef.current,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: "power2.out",
          scrollTrigger: { trigger: titleRef.current, start: "top 85%", once: true } }
      );
    }

    // ── 2. Scrubbed line — draws in sync with scroll ───────────────
    if (lineRef.current) {
      gsap.fromTo(lineRef.current,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          transformOrigin: "top",
          scrollTrigger: {
            trigger: section,
            start: "top 55%",
            end: "bottom 80%",
            scrub: 1.2,         // follows scroll position smoothly
          },
        }
      );
    }

    // ── 3. Per-card sequential reveal + number bubble pulse ────────
    const cards   = cardRefs.current.filter(Boolean) as HTMLDivElement[];
    const bubbles = bubbleRefs.current.filter(Boolean) as HTMLDivElement[];
    const icons   = iconRefs.current.filter(Boolean) as HTMLDivElement[];

    cards.forEach((card, i) => {
      const bubble  = bubbles[i];
      const iconBox = icons[i];

      // Query inner elements for sequential reveal
      const badge   = card.querySelector<HTMLElement>("[data-badge]");
      const title   = card.querySelector<HTMLElement>("[data-title]");
      const desc    = card.querySelector<HTMLElement>("[data-desc]");

      // Hide everything initially
      gsap.set([iconBox, badge, title, desc].filter(Boolean), { opacity: 0, y: 20 });
      gsap.set(iconBox, { scale: 0, rotation: -15, opacity: 0, y: 0 });
      if (bubble) gsap.set(bubble, { scale: 0.5, opacity: 0 });

      const tl = gsap.timeline({
        scrollTrigger: { trigger: card, start: "top 84%", once: true },
      });

      // Icon container pops in
      tl.to(iconBox, { scale: 1, rotation: 0, opacity: 1, duration: 0.55, ease: "back.out(2)" })
      // Badge slides in
        .to(badge,   { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }, "-=0.15")
      // Title slides up
        .to(title,   { opacity: 1, y: 0, duration: 0.4,  ease: "power2.out" }, "-=0.15")
      // Description fades in
        .to(desc,    { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }, "-=0.15")
      // Number bubble springs in
        .to(bubble,  { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2.5)" }, "-=0.3")
        .to(bubble,  {
          boxShadow: `0 0 28px ${steps[i].color}90, 0 0 56px ${steps[i].color}40`,
          scale: 1.1,
          duration: 0.7,
          ease: "sine.inOut",
          yoyo: true,
          repeat: 2,
        });
    });

    // ── 4. Hover: icon spins + border glows ───────────────────────
    cards.forEach((card, i) => {
      const iconBox = icons[i];
      const bubble  = bubbles[i];

      const onEnter = () => {
        gsap.to(card,    { y: -8, scale: 1.02, duration: 0.3, ease: "power2.out",
          borderColor: steps[i].color });
        gsap.to(iconBox, { rotation: 12, scale: 1.12, duration: 0.35, ease: "back.out(2)" });
        if (bubble) gsap.to(bubble, {
          scale: 1.15,
          boxShadow: `0 0 22px ${steps[i].color}cc, 0 0 44px ${steps[i].color}55`,
          duration: 0.3, ease: "power2.out" });
      };

      const onLeave = () => {
        gsap.to(card,    { y: 0, scale: 1, duration: 0.55, ease: "elastic.out(1, 0.4)",
          borderColor: "" });
        gsap.to(iconBox, { rotation: 0, scale: 1, duration: 0.55, ease: "elastic.out(1, 0.4)" });
        if (bubble) gsap.to(bubble, {
          scale: 1,
          boxShadow: `0 0 18px ${steps[i].color}50`,
          duration: 0.4, ease: "power2.out" });
      };

      card.addEventListener("mouseenter", onEnter);
      card.addEventListener("mouseleave", onLeave);
    });

    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, []);

  return (
    <section ref={sectionRef} id="about" className="relative py-20 bg-navy-dark/50 overflow-hidden">

      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, hsl(330 85% 55% / 0.06) 0%, transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="container mx-auto px-4 max-w-4xl relative z-10">

        {/* Heading */}
        <div ref={titleRef} className="text-center mb-16">
          <p className="text-pink text-xs font-bold uppercase tracking-widest mb-3">The Journey</p>
          <h2 className="section-title text-center text-foreground mb-4">
            HOW IT <span className="text-pink">WORKS</span>
          </h2>
          <p className="text-muted-foreground mt-4 text-base max-w-xl mx-auto">
            From your very first note to your Trinity exam certificate — here's the path.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">

          {/* Scrub-driven vertical line */}
          <div
            ref={lineRef}
            className="absolute left-1/2 top-6 bottom-6 w-px bg-gradient-to-b from-pink via-purple-500 to-cyan-400 opacity-30 hidden sm:block"
            style={{ transform: "translateX(-50%)" }}
            aria-hidden="true"
          />

          <div className="space-y-10">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`flex flex-col sm:flex-row gap-6 items-center ${
                  i % 2 === 1 ? "sm:flex-row-reverse" : ""
                }`}
              >
                {/* Card */}
                <div
                  ref={(el) => { cardRefs.current[i] = el; }}
                  className="feature-card flex-1 will-change-transform transition-colors duration-200"
                  style={{ cursor: "default" }}
                >
                  <div className="flex items-start gap-4">

                    {/* Icon container */}
                    <div
                      ref={(el) => { iconRefs.current[i] = el; }}
                      className="shrink-0 w-14 h-14 rounded-xl bg-secondary/60 flex items-center justify-center"
                    >
                      {step.icon}
                    </div>

                    <div className="flex-1">
                      <span
                        data-badge
                        className="inline-block text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border mb-3"
                        style={{ color: step.color, background: `${step.color}18`, borderColor: `${step.color}40` }}
                      >
                        {step.tag}
                      </span>
                      <h3 data-title className="text-lg font-black text-foreground mb-2 uppercase">
                        {step.title}
                      </h3>
                      <p data-desc className="text-muted-foreground text-sm leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step number bubble — sits on the line */}
                <div className="hidden sm:flex w-16 shrink-0 justify-center z-10">
                  <div
                    ref={(el) => { bubbleRefs.current[i] = el; }}
                    className="w-12 h-12 rounded-full bg-card border-2 flex items-center justify-center font-black text-sm"
                    style={{
                      borderColor: step.color,
                      color: step.color,
                      boxShadow: `0 0 18px ${step.color}50`,
                    }}
                  >
                    {step.number}
                  </div>
                </div>

                {/* Mirror spacer */}
                <div className="hidden sm:block flex-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
