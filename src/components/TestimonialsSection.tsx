import { useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGsapReveal } from "@/hooks/useGsapReveal";

gsap.registerPlugin(ScrollTrigger);

const testimonials = [
  {
    quote:
      "My daughter went from never touching a piano to playing full songs in just 6 weeks. The AI feedback is like having a teacher watching every session.",
    name: "Sarah M.",
    child: "Mother of Emma, age 9",
    stars: 5,
  },
  {
    quote:
      "We tried two other apps before Musicable. Nothing comes close. My son actually asks to practise — I never thought I'd say that.",
    name: "James T.",
    child: "Father of Liam, age 11",
    stars: 5,
  },
  {
    quote:
      "The progress tracking keeps us both motivated. My daughter can literally see herself improving week by week. Worth every penny.",
    name: "Priya K.",
    child: "Mother of Anaya, age 8",
    stars: 5,
  },
  {
    quote:
      "I was sceptical about online piano learning but the quality of lessons blew me away. My son's piano teacher was impressed at his last recital.",
    name: "David L.",
    child: "Father of Noah, age 13",
    stars: 5,
  },
  {
    quote:
      "Musicable fits perfectly into our busy schedule. 20 minutes a day and my daughter has learned more than a full year of traditional lessons.",
    name: "Aisha R.",
    child: "Mother of Zara, age 10",
    stars: 5,
  },
  {
    quote:
      "The gamified learning map keeps my twins competing with each other in the best way. They both beg to do their piano practice!",
    name: "Carlos & Maria F.",
    child: "Parents of Sofia & Diego, age 7",
    stars: 5,
  },
  {
    quote:
      "As a parent with no music background, I love that I can follow along too. The app explains everything clearly and the support team is fantastic.",
    name: "Rachel W.",
    child: "Mother of Oliver, age 12",
    stars: 5,
  },
];

// Decorative sparkles scattered around the heading
const SPARKLES = [
  { top: "10%", left: "3%",  size: 18, dur: 3.2, delay: 0,   symbol: "✦", color: "#ec4899" },
  { top: "60%", left: "6%",  size: 12, dur: 4.5, delay: 1.1, symbol: "♪", color: "#a855f7" },
  { top: "20%", right: "4%", size: 16, dur: 3.8, delay: 0.6, symbol: "✦", color: "#22d3ee" },
  { top: "70%", right: "7%", size: 10, dur: 5.0, delay: 1.8, symbol: "★", color: "#ec4899" },
  { top: "40%", left: "1%",  size: 14, dur: 4.1, delay: 0.4, symbol: "⋆", color: "#84cc16" },
];

const TestimonialsSection = () => {
  const scrollRef    = useRef<HTMLDivElement>(null);
  const cardsWrapRef = useRef<HTMLDivElement>(null);
  const orbRef       = useRef<HTMLDivElement>(null);
  const quoteRef     = useRef<HTMLDivElement>(null);
  const sparkRefs    = useRef<(HTMLSpanElement | null)[]>([]);

  // Heading slides up on scroll
  const headingRef = useGsapReveal<HTMLDivElement>({ y: 30, duration: 0.7 });

  useEffect(() => {
    const container = cardsWrapRef.current;
    if (!container) return;

    const cards = Array.from(container.children) as HTMLElement[];

    // ── 1. Stagger reveal ──────────────────────────────────────────
    gsap.set(cards, { opacity: 0, y: 20 });

    const revealTween = gsap.to(cards, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: "back.out(1.4)",
      stagger: 0.08,
      scrollTrigger: {
        trigger: container,
        start: "top 85%",
        once: true,
      },
    });

    // ── 2. 3-D tilt on hover ───────────────────────────────────────
    const tiltCleanups: (() => void)[] = [];

    cards.forEach((card) => {
      const onMove = (e: MouseEvent) => {
        const r  = card.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width  / 2)) / (r.width  / 2);
        const dy = (e.clientY - (r.top  + r.height / 2)) / (r.height / 2);
        gsap.to(card, {
          rotateX: -dy * 8,
          rotateY:  dx * 8,
          scale: 1.04,
          boxShadow: "0 24px 48px hsl(330 85% 55% / 0.22), 0 0 28px hsl(330 85% 55% / 0.12)",
          duration: 0.25,
          ease: "power2.out",
          transformPerspective: 900,
        });
      };

      const onLeave = () => {
        gsap.to(card, {
          rotateX: 0,
          rotateY: 0,
          scale: 1,
          boxShadow: "none",
          duration: 0.65,
          ease: "elastic.out(1, 0.38)",
          transformPerspective: 900,
        });
      };

      card.addEventListener("mousemove", onMove);
      card.addEventListener("mouseleave", onLeave);
      tiltCleanups.push(() => {
        card.removeEventListener("mousemove", onMove);
        card.removeEventListener("mouseleave", onLeave);
      });
    });

    // ── 3. Background glow orb ─────────────────────────────────────
    if (orbRef.current) {
      gsap.to(orbRef.current, {
        y: 50,
        x: -25,
        scale: 1.2,
        duration: 7,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    }

    // ── 4. Decorative large quote mark ─────────────────────────────
    if (quoteRef.current) {
      gsap.to(quoteRef.current, {
        rotation: 6,
        scale: 1.08,
        opacity: 0.18,
        duration: 5,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    }

    // ── 5. Floating sparkles ───────────────────────────────────────
    const sparkTweens = sparkRefs.current
      .filter(Boolean)
      .map((el, i) => {
        const s = SPARKLES[i];
        return gsap.to(el!, {
          y: -18,
          opacity: 0.15,
          rotation: i % 2 === 0 ? 20 : -20,
          duration: s.dur,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: s.delay,
        });
      });

    return () => {
      revealTween.kill();
      tiltCleanups.forEach((fn) => fn());
      sparkTweens.forEach((t) => t.kill());
      ScrollTrigger.getAll().forEach((t) => {
        if (t.vars.trigger === container) t.kill();
      });
    };
  }, []);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = (el.querySelector("[data-card]") as HTMLElement)?.offsetWidth ?? 320;
    el.scrollBy({ left: direction === "left" ? -(cardWidth + 16) : cardWidth + 16, behavior: "smooth" });
  };

  return (
    <section className="relative py-20 bg-background overflow-hidden">

      {/* Background glow orb */}
      <div
        ref={orbRef}
        className="absolute right-0 top-1/3 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, hsl(330 85% 55% / 0.10) 0%, transparent 70%)",
          filter: "blur(24px)",
        }}
        aria-hidden="true"
      />

      {/* Large decorative opening quote */}
      <div
        ref={quoteRef}
        className="absolute top-4 left-4 text-pink font-black leading-none pointer-events-none select-none"
        style={{ fontSize: "180px", opacity: 0.10, lineHeight: 1 }}
        aria-hidden="true"
      >
        "
      </div>

      {/* Floating sparkles */}
      {SPARKLES.map((s, i) => (
        <span
          key={i}
          ref={(el) => { sparkRefs.current[i] = el; }}
          className="absolute pointer-events-none select-none"
          style={{
            top:    s.top,
            left:   "left"  in s ? (s as any).left  : undefined,
            right:  "right" in s ? (s as any).right : undefined,
            fontSize: s.size,
            color: s.color,
            opacity: 0.55,
            filter: `drop-shadow(0 0 6px ${s.color})`,
          }}
          aria-hidden="true"
        >
          {s.symbol}
        </span>
      ))}

      <div className="container mx-auto px-4 relative z-10">

        {/* Header */}
        <div ref={headingRef} className="flex items-end justify-between mb-10 gap-4">
          <div>
            <p className="text-pink text-xs font-bold uppercase tracking-widest mb-2">Testimonials</p>
            <h2 className="text-4xl sm:text-5xl font-black text-foreground tracking-tighter leading-tight">
              WHAT OUR<br />
              <span className="text-pink">PARENTS SAY</span>
            </h2>
          </div>

          {/* Arrow buttons */}
          <div className="flex gap-2 shrink-0 mb-1">
            <button
              onClick={() => scroll("left")}
              aria-label="Scroll left"
              className="w-11 h-11 rounded-full border border-border/40 bg-card/60 flex items-center justify-center text-foreground hover:bg-pink hover:border-pink hover:text-white transition-all duration-200"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => scroll("right")}
              aria-label="Scroll right"
              className="w-11 h-11 rounded-full border border-border/40 bg-card/60 flex items-center justify-center text-foreground hover:bg-pink hover:border-pink hover:text-white transition-all duration-200"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable track — pt-4 prevents GSAP's initial y:50 from being clipped */}
        <div
          ref={scrollRef}
          className="overflow-x-auto scroll-smooth pt-4 pb-4 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <div ref={cardsWrapRef} className="flex gap-4 w-max">
            {testimonials.map((t, i) => (
              <div
                key={i}
                data-card
                className="snap-start w-[300px] sm:w-[340px] bg-card/50 border border-border/30 rounded-2xl p-6 flex flex-col gap-4 backdrop-blur-sm transition-colors duration-300 hover:border-pink/40"
                style={{ transformStyle: "preserve-3d", willChange: "transform" }}
              >
                {/* Stars */}
                <div className="flex gap-0.5">
                  {Array.from({ length: t.stars }).map((_, s) => (
                    <Star key={s} size={14} className="fill-pink text-pink" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-foreground/85 text-sm leading-relaxed flex-1">
                  <span className="text-pink text-2xl font-black leading-none mr-1">"</span>
                  {t.quote}
                  <span className="text-pink text-2xl font-black leading-none ml-1">"</span>
                </p>

                {/* Author */}
                <div className="border-t border-border/20 pt-4">
                  <p className="font-bold text-foreground text-sm">{t.name}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{t.child}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <style>{`div::-webkit-scrollbar { display: none; }`}</style>
    </section>
  );
};

export default TestimonialsSection;
