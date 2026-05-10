import { useEffect, useRef } from "react";

const COLORS = [
  "#ff69b4", "#ffd700", "#ff1493", "#c084fc",
  "#60a5fa", "#f9a8d4", "#facc15", "#e879f9", "#ffffff",
];
const SHAPES = ["✦", "✧", "⋆", "✺", "✩", "★", "·", "✶"];

const MusicCursor = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const last = useRef({ x: -100, y: -100 });
  const raf = useRef<number>();

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    // Smooth cursor follow via rAF
    const tick = () => {
      cursor.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`;
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

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
        zIndex: "9997",
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

      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      if (Math.hypot(dx, dy) > 7) {
        last.current = { x: e.clientX, y: e.clientY };
        spawnSparkle(e.clientX, e.clientY);
      }
    };

    // Inject cursor-hide style
    const style = document.createElement("style");
    style.id = "music-cursor-style";
    style.textContent = `* { cursor: none !important; }`;
    document.head.appendChild(style);

    document.addEventListener("mousemove", onMove);

    return () => {
      document.removeEventListener("mousemove", onMove);
      if (raf.current) cancelAnimationFrame(raf.current);
      document.getElementById("music-cursor-style")?.remove();
    };
  }, []);

  return (
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
  );
};

export default MusicCursor;
