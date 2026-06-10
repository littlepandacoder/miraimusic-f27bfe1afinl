import { useEffect, useRef } from "react";
import gsap from "gsap";

const COLORS = [
  "#ff69b4", "#ffd700", "#ff1493", "#c084fc",
  "#60a5fa", "#f9a8d4", "#facc15", "#e879f9", "#ffffff",
];
const SHAPES = ["✦", "✧", "⋆", "✺", "✩", "★", "·", "✶"];

// Trail configuration — each index is one dot behind the cursor
const TRAIL_COUNT = 14;
const TRAIL_COLORS = [
  "#ec4899", "#d946ef", "#a855f7", "#8b5cf6",
  "#6366f1", "#818cf8", "#22d3ee", "#60a5fa",
  "#818cf8", "#6366f1", "#8b5cf6", "#a855f7",
  "#d946ef", "#ec4899",
];
const TRAIL_SIZES = Array.from({ length: TRAIL_COUNT }, (_, i) =>
  Math.max(Math.round(10 - (i / (TRAIL_COUNT - 1)) * 8), 2)
);
const TRAIL_OPACITIES = Array.from({ length: TRAIL_COUNT }, (_, i) =>
  +(0.85 - (i / (TRAIL_COUNT - 1)) * 0.8).toFixed(2)
);

const MusicCursor = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const trailRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pos = useRef({ x: -100, y: -100 });
  const last = useRef({ x: -100, y: -100 });
  const raf = useRef<number>();
  const isModalOpen = useRef(false);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    // Check if modal is open and update cursor style
    const updateCursorForModal = () => {
      const modals = document.querySelectorAll('[role="dialog"][open], [role="dialog"]');
      isModalOpen.current = modals.length > 0;
      if (isModalOpen.current) {
        cursor.style.filter = "drop-shadow(0 0 10px #ff1493) drop-shadow(0 0 20px #ff69b4) drop-shadow(0 0 30px #c084fc)";
        cursor.style.fontSize = "32px";
      } else {
        cursor.style.filter = "drop-shadow(0 0 6px #ff69b4) drop-shadow(0 0 12px #c084fc)";
        cursor.style.fontSize = "28px";
      }
    };

    updateCursorForModal();
    const observer = new MutationObserver(updateCursorForModal);
    observer.observe(document.body, { childList: true, subtree: true });

    // Main cursor — smooth rAF follow
    const tick = () => {
      cursor.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`;
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    // GSAP quickTo for trail dots — each has more lag than the previous
    const dots = trailRefs.current.filter(Boolean) as HTMLDivElement[];
    dots.forEach((dot) => gsap.set(dot, { x: -300, y: -300 }));

    const quickXArr = dots.map((dot, i) =>
      gsap.quickTo(dot, "x", { duration: 0.25 + i * 0.04, ease: "power3" })
    );
    const quickYArr = dots.map((dot, i) =>
      gsap.quickTo(dot, "y", { duration: 0.25 + i * 0.04, ease: "power3" })
    );

    const spawnSparkle = (x: number, y: number) => {
      const el = document.createElement("span");
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const size = Math.random() * 13 + 7;
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 45 + 20;
      const tx = Math.cos(angle) * radius;
      const ty = Math.sin(angle) * radius;
      const duration = Math.random() * 350 + 400;

      el.textContent = shape;
      Object.assign(el.style, {
        position: "fixed",
        left: "0",
        top: "0",
        pointerEvents: "none",
        zIndex: "9996",
        fontSize: `${size}px`,
        color,
        textShadow: `0 0 8px ${color}, 0 0 16px ${color}`,
        transform: `translate(${x - size / 2}px, ${y - size / 2}px)`,
        transition: `transform ${duration}ms cubic-bezier(0.25,0.46,0.45,0.94), opacity ${duration}ms ease-out`,
        opacity: "1",
        willChange: "transform, opacity",
        userSelect: "none",
      });

      document.body.appendChild(el);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.transform = `translate(${x - size / 2 + tx}px, ${y - size / 2 + ty}px) scale(0.1)`;
          el.style.opacity = "0";
        });
      });

      setTimeout(() => el.remove(), duration + 50);
    };

    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };

      // Feed cursor position into each trail dot (offset by half its size to center it)
      quickXArr.forEach((qx, i) => qx(e.clientX - TRAIL_SIZES[i] / 2));
      quickYArr.forEach((qy, i) => qy(e.clientY - TRAIL_SIZES[i] / 2));

      // Sparkle burst on movement
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      if (Math.hypot(dx, dy) > 7) {
        last.current = { x: e.clientX, y: e.clientY };
        spawnSparkle(e.clientX, e.clientY);
      }
    };

    document.addEventListener("mousemove", onMove);

    return () => {
      document.removeEventListener("mousemove", onMove);
      if (raf.current) cancelAnimationFrame(raf.current);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      {/* GSAP-powered glowing cursor trail */}
      {Array.from({ length: TRAIL_COUNT }).map((_, i) => (
        <div
          key={i}
          className="music-cursor-trail"
          ref={(el) => { trailRefs.current[i] = el; }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: TRAIL_SIZES[i],
            height: TRAIL_SIZES[i],
            borderRadius: "50%",
            background: TRAIL_COLORS[i],
            opacity: TRAIL_OPACITIES[i],
            pointerEvents: "none",
            zIndex: 9998,
            boxShadow: `0 0 ${TRAIL_SIZES[i] * 2}px ${TRAIL_COLORS[i]}`,
            willChange: "transform",
            transition: "opacity 200ms ease-out",
          }}
          aria-hidden="true"
        />
      ))}

      {/* Main ♪ cursor */}
      <div
        ref={cursorRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          pointerEvents: "none",
          zIndex: 9999,
          fontSize: "28px",
          lineHeight: 1,
          userSelect: "none",
          filter: "drop-shadow(0 0 6px #ff69b4) drop-shadow(0 0 12px #c084fc)",
          marginLeft: "-4px",
          marginTop: "-28px",
        }}
        aria-hidden="true"
      >
        ♪
      </div>
    </>
  );
};

export default MusicCursor;
