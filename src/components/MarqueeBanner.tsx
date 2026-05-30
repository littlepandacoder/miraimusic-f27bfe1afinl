import { useEffect, useRef } from "react";
import gsap from "gsap";

const ROW_A = [
  { label: "AI-Powered Learning",      icon: "🎹" },
  { label: "100% Exam Guarantee",      icon: "🏆" },
  { label: "Gamified Lessons",         icon: "⭐" },
  { label: "Trinity Piano Prep",       icon: "🎵" },
  { label: "Expert Teachers",          icon: "🎓" },
  { label: "Progress Tracking",        icon: "📊" },
  { label: "Sight Reading Mastery",    icon: "🎯" },
  { label: "Live 1-on-1 Sessions",     icon: "🌟" },
];

const ROW_B = [
  { label: "500+ Students Enrolled",   icon: "✦" },
  { label: "4.9 ★ Rating",             icon: "✦" },
  { label: "95% Pass Rate",            icon: "✦" },
  { label: "Trinity Grade 1–8",        icon: "✦" },
  { label: "AI Feedback 24/7",         icon: "✦" },
  { label: "Global Community",         icon: "✦" },
  { label: "Used in 20+ Countries",    icon: "✦" },
  { label: "Award-Winning Platform",   icon: "✦" },
];

const Pill = ({ label, icon, dim }: { label: string; icon: string; dim?: boolean }) => (
  <span className="inline-flex items-center gap-2.5 shrink-0 mx-5">
    <span className="text-pink text-base leading-none">{icon}</span>
    <span
      className={`font-bold uppercase tracking-widest text-xs whitespace-nowrap ${
        dim ? "text-foreground/50" : "text-foreground/80"
      }`}
    >
      {label}
    </span>
    <span className="text-pink/30 text-xs mx-1">♪</span>
  </span>
);

interface Props {
  /** Visual variant — controls strip height and accent strength */
  variant?: "default" | "compact";
}

const MarqueeBanner = ({ variant = "default" }: Props) => {
  const trackARef = useRef<HTMLDivElement>(null);
  const trackBRef = useRef<HTMLDivElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tA = trackARef.current;
    const tB = trackBRef.current;
    const wrap = wrapRef.current;
    if (!tA || !tB || !wrap) return;

    // Row A → scrolls left
    const tweenA = gsap.to(tA, {
      x: "-50%",
      duration: 55,
      ease: "none",
      repeat: -1,
    });

    // Row B → scrolls right (start at -50%, animate back to 0%)
    const tweenB = gsap.fromTo(
      tB,
      { x: "-50%" },
      { x: "0%", duration: 68, ease: "none", repeat: -1 }
    );

    // Slow to a crawl on hover, resume on leave
    const slowA  = () => tweenA.timeScale(0.15);
    const fastA  = () => tweenA.timeScale(1);
    const slowB  = () => tweenB.timeScale(0.15);
    const fastB  = () => tweenB.timeScale(1);

    const rowA = tA.parentElement;
    const rowB = tB.parentElement;
    rowA?.addEventListener("mouseenter", slowA);
    rowA?.addEventListener("mouseleave", fastA);
    rowB?.addEventListener("mouseenter", slowB);
    rowB?.addEventListener("mouseleave", fastB);

    return () => {
      tweenA.kill();
      tweenB.kill();
      rowA?.removeEventListener("mouseenter", slowA);
      rowA?.removeEventListener("mouseleave", fastA);
      rowB?.removeEventListener("mouseenter", slowB);
      rowB?.removeEventListener("mouseleave", fastB);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`bg-navy-dark/90 border-y border-border/20 overflow-hidden select-none ${
        variant === "compact" ? "py-4" : "py-5"
      }`}
    >
      {/* Row A — left-moving */}
      <div className="overflow-hidden mb-3">
        <div ref={trackARef} className="flex w-max">
          {[...ROW_A, ...ROW_A].map((item, i) => (
            <Pill key={i} {...item} dim={i % 4 === 2} />
          ))}
        </div>
      </div>

      {/* Row B — right-moving */}
      <div className="overflow-hidden">
        <div ref={trackBRef} className="flex w-max">
          {[...ROW_B, ...ROW_B].map((item, i) => (
            <Pill key={i} {...item} dim={i % 3 === 1} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarqueeBanner;
