import { useEffect, useRef } from "react";
import gsap from "gsap";

type NoteType = "quarter" | "eighth" | "double";

interface NoteDef {
  x: string;
  size: number;
  color: string;
  delay: number;
  dur: number;
  maxOpacity: number;
  type: NoteType;
}

const NOTES: NoteDef[] = [
  { x: "4%",  size: 28, color: "#ec4899", delay: 0,   dur: 7.0, maxOpacity: 0.60, type: "eighth"  },
  { x: "12%", size: 20, color: "#a855f7", delay: 2.0, dur: 8.5, maxOpacity: 0.45, type: "quarter" },
  { x: "21%", size: 26, color: "#22d3ee", delay: 1.0, dur: 7.5, maxOpacity: 0.55, type: "eighth"  },
  { x: "31%", size: 18, color: "#84cc16", delay: 3.5, dur: 9.0, maxOpacity: 0.40, type: "quarter" },
  { x: "40%", size: 24, color: "#ec4899", delay: 0.6, dur: 7.8, maxOpacity: 0.50, type: "double"  },
  { x: "50%", size: 20, color: "#a855f7", delay: 4.3, dur: 8.2, maxOpacity: 0.45, type: "eighth"  },
  { x: "59%", size: 30, color: "#22d3ee", delay: 1.7, dur: 6.8, maxOpacity: 0.60, type: "quarter" },
  { x: "68%", size: 22, color: "#84cc16", delay: 2.8, dur: 7.6, maxOpacity: 0.45, type: "eighth"  },
  { x: "77%", size: 18, color: "#ec4899", delay: 0.9, dur: 9.5, maxOpacity: 0.50, type: "double"  },
  { x: "84%", size: 26, color: "#a855f7", delay: 3.6, dur: 7.2, maxOpacity: 0.55, type: "quarter" },
  { x: "91%", size: 20, color: "#22d3ee", delay: 1.5, dur: 8.0, maxOpacity: 0.50, type: "eighth"  },
  { x: "96%", size: 22, color: "#84cc16", delay: 5.0, dur: 6.5, maxOpacity: 0.40, type: "quarter" },
];

const QuarterNote = ({ color }: { color: string }) => (
  <svg viewBox="0 0 36 72" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <ellipse cx="13" cy="58" rx="12" ry="8" transform="rotate(-20 13 58)" fill={color} />
    <rect x="23.5" y="5" width="3.5" height="54" rx="1.75" fill={color} />
  </svg>
);

const EighthNote = ({ color }: { color: string }) => (
  <svg viewBox="0 0 42 72" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <ellipse cx="13" cy="58" rx="12" ry="8" transform="rotate(-20 13 58)" fill={color} />
    <rect x="23.5" y="5" width="3.5" height="54" rx="1.75" fill={color} />
    <path d="M 27 5 C 40 12 38 27 27 31" fill={color} />
  </svg>
);

const DoubleNote = ({ color }: { color: string }) => (
  <svg viewBox="0 0 68 72" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <ellipse cx="13" cy="60" rx="12" ry="8" transform="rotate(-20 13 60)" fill={color} />
    <rect x="23.5" y="8" width="3.5" height="53" rx="1.75" fill={color} />
    <ellipse cx="41" cy="64" rx="12" ry="8" transform="rotate(-20 41 64)" fill={color} />
    <rect x="51.5" y="8" width="3.5" height="57" rx="1.75" fill={color} />
    <rect x="23.5" y="8" width="31.5" height="5" rx="2.5" fill={color} />
  </svg>
);

const NoteIcon = ({ type, color }: { type: NoteType; color: string }) => {
  if (type === "eighth") return <EighthNote color={color} />;
  if (type === "double") return <DoubleNote color={color} />;
  return <QuarterNote color={color} />;
};

const MusicNotesBackground = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const els = Array.from(container.querySelectorAll<HTMLElement>("[data-note]"));
    const timelines: gsap.core.Timeline[] = [];
    const drifts: gsap.core.Tween[] = [];

    els.forEach((el, i) => {
      const note = NOTES[i];
      if (!note) return;

      gsap.set(el, { y: 50, opacity: 0, rotation: gsap.utils.random(-12, 12) });

      const tl = gsap.timeline({ repeat: -1, delay: note.delay });
      tl.to(el, { opacity: note.maxOpacity, y: 0, duration: note.dur * 0.22, ease: "power1.out" })
        .to(el, { y: -160, duration: note.dur * 0.52, ease: "none" }, "<")
        .to(el, { opacity: 0, y: -290, duration: note.dur * 0.26, ease: "power1.in" })
        .set(el, { y: 50, opacity: 0 });
      timelines.push(tl);

      // Reduce x-drift on mobile so notes don't escape the viewport
      const maxDrift = window.innerWidth < 640 ? 10 : 36;
      const drift = gsap.to(el, {
        x: gsap.utils.random(8, maxDrift) * (i % 2 === 0 ? 1 : -1),
        duration: note.dur * 0.65,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        delay: note.delay + note.dur * 0.1,
      });
      drifts.push(drift);
    });

    return () => {
      timelines.forEach((t) => t.kill());
      drifts.forEach((t) => t.kill());
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {NOTES.map((note, i) => {
        // Parse the left% value; hide very-edge notes on mobile
        const pct = parseFloat(note.x);
        const hideOnMobile = pct < 8 || pct > 88;
        return (
          <div
            key={i}
            data-note
            className={`absolute bottom-16 ${hideOnMobile ? "hidden sm:block" : ""}`}
            style={{
              left: note.x,
              width: note.size,
              height: note.type === "double" ? note.size * 1.4 : note.size * 2,
            }}
          >
            <NoteIcon type={note.type} color={note.color} />
          </div>
        );
      })}
    </div>
  );
};

export default MusicNotesBackground;
