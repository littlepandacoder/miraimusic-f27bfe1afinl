import { useEffect, useRef } from "react";
import gsap from "gsap";

const MorphBlob = () => {
  const groupRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;

    // Slide in from scale 0.5
    gsap.fromTo(
      g,
      { scale: 0.5, opacity: 0 },
      { scale: 1, opacity: 1, duration: 1.5, ease: "power2.out", delay: 0.4, transformOrigin: "50% 50%" }
    );

    // Slow breathe — grows and shrinks organically
    gsap.to(g, {
      scale: 1.08,
      duration: 5.5,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      delay: 2,
      transformOrigin: "50% 50%",
    });

    return () => gsap.killTweensOf(g);
  }, []);

  return (
    <div
      className="absolute inset-0 pointer-events-none flex items-center justify-center"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 800 340"
        className="w-full max-w-5xl"
        style={{ overflow: "visible" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Turbulence morph filter */}
          <filter id="morph-filter" x="-25%" y="-25%" width="150%" height="150%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.011 0.011"
              numOctaves="3"
              seed="7"
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                dur="13s"
                values="0.011 0.011; 0.017 0.013; 0.011 0.019; 0.015 0.011; 0.011 0.011"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              xChannelSelector="R"
              yChannelSelector="G"
              scale="52"
            />
          </filter>

          {/* Radial gradient fill: pink core → purple → transparent */}
          <radialGradient id="blob-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="hsl(330 85% 55%)" stopOpacity="0.22" />
            <stop offset="50%"  stopColor="hsl(280 70% 60%)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="hsl(330 85% 55%)" stopOpacity="0.00" />
          </radialGradient>
        </defs>

        <g ref={groupRef} style={{ opacity: 0 }}>
          {/* Soft glow halo — large blurred ellipse behind */}
          <ellipse
            cx="400" cy="170"
            rx="340" ry="148"
            fill="hsl(330 85% 55%)"
            fillOpacity="0.09"
            style={{ filter: "blur(32px)" }}
          />

          {/* Main morphing fill */}
          <ellipse
            cx="400" cy="170"
            rx="315" ry="133"
            fill="url(#blob-grad)"
            filter="url(#morph-filter)"
          />

          {/* Glowing stroke border */}
          <ellipse
            cx="400" cy="170"
            rx="315" ry="133"
            fill="none"
            stroke="hsl(330 85% 55%)"
            strokeWidth="1.5"
            strokeOpacity="0.40"
            filter="url(#morph-filter)"
          />

          {/* Inner shimmer ring */}
          <ellipse
            cx="400" cy="170"
            rx="270" ry="108"
            fill="none"
            stroke="hsl(280 70% 70%)"
            strokeWidth="0.8"
            strokeOpacity="0.25"
            filter="url(#morph-filter)"
          />
        </g>
      </svg>
    </div>
  );
};

export default MorphBlob;
