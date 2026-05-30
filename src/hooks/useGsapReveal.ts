import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface RevealOptions {
  y?: number;
  x?: number;
  duration?: number;
  delay?: number;
  ease?: string;
  stagger?: number;
  /** If true, animate direct children instead of the ref element itself */
  children?: boolean;
  start?: string;
}

export function useGsapReveal<T extends HTMLElement = HTMLDivElement>(
  options: RevealOptions = {}
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets = options.children
      ? Array.from(el.children) as HTMLElement[]
      : [el];

    if (!targets.length) return;

    gsap.set(targets, { opacity: 0, y: options.y ?? 40, x: options.x ?? 0 });

    const tween = gsap.to(targets, {
      opacity: 1,
      y: 0,
      x: 0,
      duration: options.duration ?? 0.7,
      delay: options.delay ?? 0,
      ease: options.ease ?? "power2.out",
      stagger: options.stagger ?? 0,
      scrollTrigger: {
        trigger: el,
        start: options.start ?? "top 82%",
        once: true,
      },
    });

    return () => {
      tween.kill();
      ScrollTrigger.getAll().forEach((t) => {
        if (t.vars.trigger === el) t.kill();
      });
    };
  }, []);

  return ref;
}
