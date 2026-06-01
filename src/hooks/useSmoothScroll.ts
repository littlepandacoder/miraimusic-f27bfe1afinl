import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Initialises Lenis smooth scroll and wires it into GSAP's ticker
 * so ScrollTrigger stays in sync.
 */
export function useSmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.25,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.5,
    });

    // Keep ScrollTrigger positions accurate on every Lenis scroll event
    lenis.on("scroll", ScrollTrigger.update);

    // Drive Lenis from GSAP's ticker so animation frames stay in sync
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      // Reset scroll position when unmounting (navigating away)
      window.scrollTo(0, 0);
      lenis.destroy();
      gsap.ticker.remove(tick);
    };
  }, []);
}
