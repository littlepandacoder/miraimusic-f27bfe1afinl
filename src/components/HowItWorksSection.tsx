import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    number: "01",
    icon: (
      <svg viewBox="0 0 64 64" fill="none" className="w-10 h-10" xmlns="http://www.w3.org/2000/svg">
        {/* Book / Foundation modules */}
        <rect x="8" y="10" width="36" height="44" rx="4" fill="#ec4899" fillOpacity="0.15" stroke="#ec4899" strokeWidth="2"/>
        <rect x="14" y="18" width="24" height="3" rx="1.5" fill="#ec4899"/>
        <rect x="14" y="25" width="18" height="3" rx="1.5" fill="#ec4899" fillOpacity="0.6"/>
        <rect x="14" y="32" width="21" height="3" rx="1.5" fill="#ec4899" fillOpacity="0.6"/>
        <rect x="14" y="39" width="14" height="3" rx="1.5" fill="#ec4899" fillOpacity="0.4"/>
        <rect x="44" y="14" width="12" height="36" rx="3" fill="#a855f7" fillOpacity="0.2" stroke="#a855f7" strokeWidth="1.5"/>
      </svg>
    ),
    title: "Curated Foundation Modules",
    description:
      "Start with a structured, self-paced foundation track. Every lesson is carefully sequenced — from reading notes to mastering rhythm — so you always know exactly what to learn next.",
    tag: "Independent Learning",
    tagColor: "text-pink bg-pink/10 border-pink/30",
  },
  {
    number: "02",
    icon: (
      <svg viewBox="0 0 64 64" fill="none" className="w-10 h-10" xmlns="http://www.w3.org/2000/svg">
        {/* Music theory game / lock */}
        <circle cx="32" cy="30" r="18" fill="#a855f7" fillOpacity="0.12" stroke="#a855f7" strokeWidth="2"/>
        <rect x="26" y="32" width="12" height="10" rx="3" fill="#a855f7"/>
        <path d="M 26 32 Q 26 24 32 24 Q 38 24 38 32" stroke="#a855f7" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <circle cx="32" cy="37" r="1.5" fill="white"/>
        {/* Stars */}
        <text x="12" y="18" fontSize="10" fill="#ec4899">★</text>
        <text x="44" y="18" fontSize="10" fill="#22d3ee">★</text>
        <text x="28" y="12" fontSize="10" fill="#84cc16">★</text>
      </svg>
    ),
    title: "Gate-Locked Music Theory Games",
    description:
      "Each module contains interactive music theory games — Note Naming, Sight Reading, Rhythm Quiz and more. You must pass each game before unlocking the next chapter. No shortcuts.",
    tag: "Gate-Locked Progress",
    tagColor: "text-purple-400 bg-purple-400/10 border-purple-400/30",
  },
  {
    number: "03",
    icon: (
      <svg viewBox="0 0 64 64" fill="none" className="w-10 h-10" xmlns="http://www.w3.org/2000/svg">
        {/* Piano Hero / game controller */}
        <rect x="8" y="22" width="48" height="28" rx="10" fill="#22d3ee" fillOpacity="0.12" stroke="#22d3ee" strokeWidth="2"/>
        {/* Keys falling */}
        <rect x="18" y="10" width="8" height="18" rx="3" fill="#ec4899" fillOpacity="0.8"/>
        <rect x="30" y="6" width="8" height="22" rx="3" fill="#a855f7" fillOpacity="0.8"/>
        <rect x="42" y="13" width="8" height="14" rx="3" fill="#22d3ee" fillOpacity="0.8"/>
        {/* Controller buttons */}
        <circle cx="24" cy="34" r="4" fill="#ec4899" fillOpacity="0.5"/>
        <circle cx="36" cy="34" r="4" fill="#a855f7" fillOpacity="0.5"/>
        <circle cx="44" cy="34" r="4" fill="#22d3ee" fillOpacity="0.5"/>
      </svg>
    ),
    title: "Piano Hero — Gamified Play",
    description:
      "Practice real songs in Piano Hero mode: notes fall from the top, you play them in time, and earn XP for accuracy. It turns every practice session into a game you actually want to play.",
    tag: "Gamified Practice",
    tagColor: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30",
  },
  {
    number: "04",
    icon: (
      <svg viewBox="0 0 64 64" fill="none" className="w-10 h-10" xmlns="http://www.w3.org/2000/svg">
        {/* Trophy / exam */}
        <path d="M 20 14 L 44 14 L 40 36 Q 32 42 24 36 Z" fill="#f5c518" fillOpacity="0.25" stroke="#f5c518" strokeWidth="2"/>
        <rect x="28" y="40" width="8" height="8" rx="1" fill="#f5c518" fillOpacity="0.4"/>
        <rect x="22" y="48" width="20" height="4" rx="2" fill="#f5c518" fillOpacity="0.6"/>
        {/* Laurels */}
        <path d="M 14 20 Q 10 28 14 36" stroke="#84cc16" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M 50 20 Q 54 28 50 36" stroke="#84cc16" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <text x="25" y="32" fontSize="12" fill="#f5c518" fontWeight="bold">✓</text>
      </svg>
    ),
    title: "Apply for Your Trinity Exam",
    description:
      "Once you complete all foundation modules and pass every gate-locked assessment, you're ready. Apply for your official Trinity College London piano exam — with a 100% pass guarantee behind you.",
    tag: "Exam Ready",
    tagColor: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  },
];

const HowItWorksSection = () => {
  const sectionRef  = useRef<HTMLElement>(null);
  const titleRef    = useRef<HTMLDivElement>(null);
  const cardRefs    = useRef<(HTMLDivElement | null)[]>([]);
  const lineRef     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    // Title reveal
    if (titleRef.current) {
      gsap.fromTo(
        titleRef.current,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: "power2.out",
          scrollTrigger: { trigger: titleRef.current, start: "top 85%", once: true } }
      );
    }

    // Connecting line draws in
    if (lineRef.current) {
      gsap.fromTo(
        lineRef.current,
        { scaleY: 0 },
        { scaleY: 1, duration: 1.2, ease: "power2.inOut", transformOrigin: "top",
          scrollTrigger: { trigger: section, start: "top 70%", once: true } }
      );
    }

    // Cards stagger in — alternating left/right
    const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
    cards.forEach((card, i) => {
      const fromX = i % 2 === 0 ? -60 : 60;
      gsap.fromTo(
        card,
        { x: fromX, opacity: 0 },
        {
          x: 0, opacity: 1, duration: 0.7, ease: "back.out(1.4)",
          scrollTrigger: { trigger: card, start: "top 85%", once: true },
          delay: i * 0.05,
        }
      );

      // Hover lift
      const onEnter = () => gsap.to(card, { y: -6, scale: 1.02, duration: 0.3, ease: "power2.out" });
      const onLeave = () => gsap.to(card, { y: 0,  scale: 1,    duration: 0.45, ease: "elastic.out(1, 0.4)" });
      card.addEventListener("mouseenter", onEnter);
      card.addEventListener("mouseleave", onLeave);
    });

    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, []);

  return (
    <section ref={sectionRef} className="relative py-20 bg-navy-dark/60 overflow-hidden">

      {/* Subtle background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, hsl(330 85% 55% / 0.06) 0%, transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="container mx-auto px-4 max-w-4xl relative z-10">

        {/* Heading */}
        <div ref={titleRef} className="text-center mb-16">
          <p className="text-pink text-xs font-bold uppercase tracking-widest mb-3">The Journey</p>
          <h2 className="text-4xl sm:text-5xl font-black text-foreground tracking-tighter">
            HOW IT <span className="text-pink">WORKS</span>
          </h2>
          <p className="text-muted-foreground mt-4 text-base max-w-xl mx-auto">
            From your very first note to your Trinity exam certificate — here's the path.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Vertical connector line */}
          <div
            ref={lineRef}
            className="absolute left-[28px] sm:left-1/2 top-6 bottom-6 w-px bg-gradient-to-b from-pink via-purple-500 to-cyan-400 opacity-30 hidden sm:block"
            style={{ transform: "translateX(-50%)" }}
            aria-hidden="true"
          />

          <div className="space-y-8">
            {steps.map((step, i) => (
              <div
                key={i}
                ref={(el) => { cardRefs.current[i] = el; }}
                className={`flex flex-col sm:flex-row gap-6 items-start ${
                  i % 2 === 1 ? "sm:flex-row-reverse" : ""
                }`}
              >
                {/* Card */}
                <div className="flex-1 bg-card/60 border border-border/40 rounded-2xl p-6 backdrop-blur-sm hover:border-pink/40 transition-colors duration-300 will-change-transform">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-14 h-14 rounded-xl bg-secondary/60 flex items-center justify-center">
                      {step.icon}
                    </div>
                    <div className="flex-1">
                      <span className={`inline-block text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border mb-3 ${step.tagColor}`}>
                        {step.tag}
                      </span>
                      <h3 className="text-lg sm:text-xl font-black text-foreground mb-2 uppercase">
                        {step.title}
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step number bubble — sits on the centre line */}
                <div className="hidden sm:flex w-16 shrink-0 justify-center">
                  <div className="w-12 h-12 rounded-full bg-card border-2 border-pink/50 flex items-center justify-center text-pink font-black text-sm z-10 shadow-[0_0_20px_hsl(330_85%_55%/0.3)]">
                    {step.number}
                  </div>
                </div>

                {/* Spacer on opposite side to keep layout symmetric */}
                <div className="hidden sm:block flex-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
