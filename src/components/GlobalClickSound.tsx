import { useEffect } from "react";

// A short click sound for every button, link and tappable control in the app.
const CLICKABLE = 'button, a, [role="button"], input[type="button"], input[type="submit"], input[type="checkbox"], input[type="radio"]';

const playClick = () => {
  try {
    const audio = new Audio("/sounds/select-click.mp3");
    audio.volume = 0.5;
    audio.play().catch(() => {}); // browsers block sound until the page has had a click
  } catch {
    // audio unavailable: stay silent
  }
};

export const GlobalClickSound = () => {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const control = target?.closest?.(CLICKABLE) as HTMLButtonElement | null;
      if (!control || control.disabled) return;
      playClick();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
};

export default GlobalClickSound;
