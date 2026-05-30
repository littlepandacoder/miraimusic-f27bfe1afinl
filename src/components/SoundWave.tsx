import { useEffect, useRef } from "react";
import gsap from "gsap";

const BAR_COUNT = 28;
const BAR_W = 4;
const GAP = 3;
const MAX_H = 48;
const SVG_W = BAR_COUNT * (BAR_W + GAP) - GAP;

// Pink → purple → indigo → cyan → back
const PALETTE = [
  "#ec4899", "#d946ef", "#a855f7", "#8b5cf6",
  "#6366f1", "#818cf8", "#22d3ee", "#818cf8",
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
];

const SoundWave = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const bars = Array.from(svg.querySelectorAll<SVGRectElement>("rect"));

    const tweens = bars.map((bar, i) => {
      const t = i / (BAR_COUNT - 1);
      const bell = Math.sin(t * Math.PI);
      const maxH = MAX_H * (0.25 + bell * 0.75);
      return gsap.to(bar, {
        attr: { height: gsap.utils.random(5, maxH) },
        duration: gsap.utils.random(0.3, 1.1),
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        delay: i * 0.05,
      });
    });

    return () => tweens.forEach((t) => t.kill());
  }, []);

  return (
    <div className="w-full max-w-xs mx-auto opacity-55" aria-hidden="true">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${MAX_H}`}
        className="w-full"
        style={{ height: MAX_H, transform: "scaleY(-1)" }}
      >
        {Array.from({ length: BAR_COUNT }).map((_, i) => {
          const t = i / (BAR_COUNT - 1);
          const bell = Math.sin(t * Math.PI);
          const h = Math.round(MAX_H * (0.15 + bell * 0.6));
          const colorIdx = Math.round(t * (PALETTE.length - 1));
          return (
            <rect
              key={i}
              x={i * (BAR_W + GAP)}
              y={0}
              width={BAR_W}
              height={Math.max(h, 4)}
              rx={2}
              fill={PALETTE[colorIdx]}
            />
          );
        })}
      </svg>
    </div>
  );
};

export default SoundWave;
