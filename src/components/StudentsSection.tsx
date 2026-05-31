import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ── Placeholder student data — swap src / thumbnail later ───────────── */
const students = [
  {
    name: "Emma",
    age: 9,
    achievement: "Trinity Grade 1 — Distinction",
    quote: "I can now play my favourite song!",
    bg: "linear-gradient(135deg, #2d0a1f 0%, #0f1729 50%, #1a0d2e 100%)",
    accent: "#ec4899",
    icon: "🎹",
    videoSrc: "",           // ← drop your video URL here
    thumbnail: "",          // ← drop your thumbnail URL here
  },
  {
    name: "Liam",
    age: 11,
    achievement: "Trinity Grade 2 — Merit",
    quote: "Piano Hero made practice actually fun.",
    bg: "linear-gradient(135deg, #1a0d2e 0%, #0f1729 50%, #0d1f38 100%)",
    accent: "#a855f7",
    icon: "🎵",
    videoSrc: "",
    thumbnail: "",
  },
  {
    name: "Anaya",
    age: 8,
    achievement: "Trinity Grade 1 — Pass",
    quote: "Sight reading used to scare me. Not anymore!",
    bg: "linear-gradient(135deg, #0d2030 0%, #0f1729 50%, #0d2030 100%)",
    accent: "#22d3ee",
    icon: "🎶",
    videoSrc: "",
    thumbnail: "",
  },
  {
    name: "Noah",
    age: 13,
    achievement: "Trinity Grade 3 — Distinction",
    quote: "The gamified modules kept me hooked.",
    bg: "linear-gradient(135deg, #0d2010 0%, #0f1729 50%, #0d200d 100%)",
    accent: "#84cc16",
    icon: "🎼",
    videoSrc: "",
    thumbnail: "",
  },
  {
    name: "Zara",
    age: 10,
    achievement: "Trinity Grade 2 — Distinction",
    quote: "20 minutes a day changed everything.",
    bg: "linear-gradient(135deg, #2d1f00 0%, #0f1729 50%, #2d1500 100%)",
    accent: "#f5c518",
    icon: "🌟",
    videoSrc: "",
    thumbnail: "",
  },
  {
    name: "Sofia",
    age: 7,
    achievement: "Trinity Grade 1 — Merit",
    quote: "I love collecting XP in Piano Hero!",
    bg: "linear-gradient(135deg, #2d0014 0%, #0f1729 50%, #2d0a1f 100%)",
    accent: "#f43f5e",
    icon: "⭐",
    videoSrc: "",
    thumbnail: "",
  },
];

/* ── Video Card ──────────────────────────────────────────────────────── */
const VideoCard = ({
  student,
  index,
  onClick,
  cardRef,
}: {
  student: typeof students[0];
  index: number;
  onClick: () => void;
  cardRef: (el: HTMLDivElement | null) => void;
}) => {
  const playRef = useRef<HTMLDivElement>(null);

  const onEnter = () => {
    gsap.to(playRef.current, { scale: 1.18, duration: 0.3, ease: "back.out(2)" });
    gsap.to(playRef.current?.querySelector(".play-ring"), {
      boxShadow: `0 0 40px ${student.accent}cc, 0 0 80px ${student.accent}55`,
      duration: 0.3,
    });
  };
  const onLeave = () => {
    gsap.to(playRef.current, { scale: 1, duration: 0.45, ease: "elastic.out(1, 0.4)" });
    gsap.to(playRef.current?.querySelector(".play-ring"), {
      boxShadow: `0 0 20px ${student.accent}55`,
      duration: 0.3,
    });
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="group relative rounded-2xl overflow-hidden border border-border/30 hover:border-pink/40 transition-colors duration-300 will-change-transform"
      style={{ background: student.bg, aspectRatio: "16/10", cursor: "pointer" }}
    >
      {/* Thumbnail (shown when provided) */}
      {student.thumbnail && (
        <img
          src={student.thumbnail}
          alt={student.name}
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
      )}

      {/* Decorative staff lines */}
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="absolute left-0 right-0 h-px"
          style={{ top: `${28 + i * 10}%`, background: `${student.accent}18` }}
        />
      ))}

      {/* Floating icon */}
      <div
        className="absolute top-4 right-4 text-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-300"
        aria-hidden="true"
      >
        {student.icon}
      </div>

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(10,15,30,0.95) 0%, transparent 60%)" }}
      />

      {/* Play button — centre */}
      <div
        ref={playRef}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div
          className="play-ring w-16 h-16 rounded-full flex items-center justify-center border-2"
          style={{
            borderColor: `${student.accent}80`,
            background: `${student.accent}18`,
            boxShadow: `0 0 20px ${student.accent}55`,
          }}
        >
          <svg viewBox="0 0 24 24" className="w-7 h-7 ml-1" fill={student.accent}>
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-black text-foreground text-base leading-tight">
              {student.name}
              <span className="text-muted-foreground font-normal text-sm ml-1">age {student.age}</span>
            </p>
            <span
              className="inline-block text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border mt-1"
              style={{ color: student.accent, background: `${student.accent}15`, borderColor: `${student.accent}40` }}
            >
              {student.achievement}
            </span>
          </div>
          <p
            className="text-xs italic max-w-[45%] text-right leading-tight"
            style={{ color: `${student.accent}cc` }}
          >
            "{student.quote}"
          </p>
        </div>
      </div>
    </div>
  );
};

/* ── Main Section ────────────────────────────────────────────────────── */
const StudentsSection = () => {
  const [selected, setSelected] = useState<number | null>(null);
  const sectionRef   = useRef<HTMLElement>(null);
  const titleRef     = useRef<HTMLDivElement>(null);
  const cardRefs     = useRef<(HTMLDivElement | null)[]>([]);
  const backdropRef  = useRef<HTMLDivElement>(null);
  const playerRef    = useRef<HTMLDivElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);

  /* ── Scroll reveal for cards ──────────────────────────────────────── */
  useEffect(() => {
    if (titleRef.current) {
      gsap.fromTo(titleRef.current,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: "power2.out",
          scrollTrigger: { trigger: titleRef.current, start: "top 85%", toggleActions: "play none none reverse" } }
      );
    }

    const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
    gsap.fromTo(cards,
      { y: 50, opacity: 0, scale: 0.95 },
      {
        y: 0, opacity: 1, scale: 1,
        duration: 0.6, ease: "back.out(1.3)",
        stagger: 0.09,
        scrollTrigger: { trigger: sectionRef.current, start: "top 75%", toggleActions: "play none none reverse" },
      }
    );

    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, []);

  /* ── Modal open animation ─────────────────────────────────────────── */
  useEffect(() => {
    if (selected === null) return;
    const backdrop = backdropRef.current;
    const player   = playerRef.current;
    if (!backdrop || !player) return;

    gsap.set(backdrop, { opacity: 0 });
    gsap.set(player,   { scale: 0.82, opacity: 0, y: 20 });

    gsap.to(backdrop, { opacity: 1, duration: 0.28, ease: "power2.out" });
    gsap.to(player,   { scale: 1, opacity: 1, y: 0, duration: 0.45, ease: "back.out(1.6)" });
  }, [selected]);

  /* ── Keyboard close ───────────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected]);

  const openModal = (i: number) => setSelected(i);

  const closeModal = () => {
    const backdrop = backdropRef.current;
    const player   = playerRef.current;
    if (!backdrop || !player) { setSelected(null); return; }

    videoRef.current?.pause();

    gsap.to(player,   { scale: 0.82, opacity: 0, y: 20, duration: 0.25, ease: "power2.in" });
    gsap.to(backdrop, {
      opacity: 0, duration: 0.3, delay: 0.08,
      onComplete: () => setSelected(null),
    });
  };

  const current = selected !== null ? students[selected] : null;

  return (
    <>
      <section ref={sectionRef} className="py-20 bg-background overflow-hidden">
        <div className="container mx-auto px-4">

          {/* Heading */}
          <div ref={titleRef} className="text-center mb-12">
            <p className="text-pink text-xs font-bold uppercase tracking-widest mb-3">Real Results</p>
            <h2 className="section-title text-foreground mb-4">
              OUR <span className="text-pink">STUDENTS</span>
            </h2>
            <p className="text-muted-foreground text-base max-w-lg mx-auto">
              Watch real students share their journey from complete beginner to Trinity exam success.
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {students.map((s, i) => (
              <VideoCard
                key={i}
                student={s}
                index={i}
                onClick={() => openModal(i)}
                cardRef={(el) => { cardRefs.current[i] = el; }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Branded Video Modal ──────────────────────────────────────── */}
      {selected !== null && current && (
        <div
          ref={backdropRef}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={closeModal}
          />

          {/* Player */}
          <div
            ref={playerRef}
            className="relative z-10 w-full max-w-2xl rounded-2xl overflow-hidden border"
            style={{
              background: "hsl(222 47% 10%)",
              borderColor: `${current.accent}40`,
              boxShadow: `0 0 60px ${current.accent}25, 0 0 120px ${current.accent}10, 0 30px 60px rgba(0,0,0,0.5)`,
            }}
          >
            {/* Header bar */}
            <div
              className="flex items-center justify-between px-5 py-3 border-b"
              style={{ borderColor: `${current.accent}20` }}
            >
              <div className="flex items-center gap-3">
                {/* Three dots — macOS style */}
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70" />
                </div>
                <div className="h-4 w-px bg-border/30" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: current.accent }}>
                    Student Story
                  </p>
                  <p className="text-foreground font-black text-sm leading-none">
                    {current.name}, age {current.age}
                  </p>
                </div>
              </div>

              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200 hover:bg-white/10"
                aria-label="Close"
              >
                <X size={16} className="text-muted-foreground hover:text-foreground" />
              </button>
            </div>

            {/* Video area */}
            <div className="relative bg-black" style={{ aspectRatio: "16/9" }}>
              {/* Placeholder state (shown when no src) */}
              {!current.videoSrc && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-4xl border"
                    style={{
                      background: `${current.accent}12`,
                      borderColor: `${current.accent}30`,
                      boxShadow: `0 0 30px ${current.accent}20`,
                    }}
                  >
                    {current.icon}
                  </div>
                  <p className="text-foreground font-black text-lg">{current.name}'s Story</p>
                  <p className="text-muted-foreground text-sm">Video coming soon</p>
                  <span
                    className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border"
                    style={{ color: current.accent, background: `${current.accent}12`, borderColor: `${current.accent}30` }}
                  >
                    {current.achievement}
                  </span>
                </div>
              )}

              {/* Actual video */}
              <video
                ref={videoRef}
                src={current.videoSrc}
                className={`w-full h-full object-cover ${current.videoSrc ? "block" : "hidden"}`}
                controls
                playsInline
                autoPlay
              />
            </div>

            {/* Footer */}
            <div
              className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t"
              style={{ borderColor: `${current.accent}20` }}
            >
              <p
                className="text-sm italic leading-snug text-muted-foreground"
              >
                "{current.quote}"
              </p>
              <div className="flex items-center gap-2 shrink-0">
                {/* Progress bar — decorative / replace with real logic when src added */}
                <div className="w-28 h-1.5 rounded-full bg-border/40 overflow-hidden">
                  <div
                    className="h-full w-1/3 rounded-full"
                    style={{ background: current.accent }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">Musicable</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentsSection;
