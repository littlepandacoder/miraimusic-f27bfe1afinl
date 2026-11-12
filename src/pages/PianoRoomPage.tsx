import { useEffect, useState } from "react";

const LIBRARY_URL = "/sheet-music-practice/library.html";
const LOADER_MS = 3000; // the short startup sound: it fades out, then the library opens
const FALLBACK_MS = LOADER_MS + 1500; // if the browser blocks the sound, go on anyway

const NOTES = ["♪", "♫", "♬", "♩", "♪"];

// The Piano Room entry: a cute loading screen, then a gentle fade into the sheet music library.
export default function PianoRoomPage() {
  useEffect(() => {
    // Startup sound for the loading screen. The library opens when the sound has finished. If the browser
    // blocks it until the page is clicked, it plays on the first click, and the fallback timer still moves on.
    const startup = new Audio("/sounds/page-load.mp3");
    startup.volume = 0.5;
    let done = false;
    const goToLibrary = () => {
      if (done) return;
      done = true;
      window.clearTimeout(fallbackTimer);
      // The library shows the same loading screen and keeps it up until its content is ready.
      try { sessionStorage.setItem("pianoRoomLoader", "1"); } catch (e) {}
      window.location.replace(LIBRARY_URL);
    };
    startup.onended = goToLibrary;
    startup.play().catch(() => {
      document.addEventListener("pointerdown", () => startup.play().catch(() => {}), { once: true, capture: true });
    });
    const fallbackTimer = window.setTimeout(goToLibrary, FALLBACK_MS);
    return () => {
      done = true;
      startup.pause();
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  return (
    <div
      className="pr-loader"
      role="status"
      aria-live="polite"
    >
      <style>{`
        .pr-loader {
          position: fixed; inset: 0; z-index: 100; display: flex; flex-direction: column;
          align-items: center; justify-content: center; overflow: hidden;
          background: radial-gradient(circle at 50% 40%, #1e1b4b 0%, #0f172a 60%, #0b0f1a 100%);
        }
        .pr-note {
          position: absolute; bottom: -40px; font-size: 26px; color: #f472b6;
          text-shadow: 0 0 10px rgba(192, 132, 252, 0.8); animation: pr-float linear infinite; opacity: 0;
        }
        @keyframes pr-float {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          15% { opacity: 0.9; }
          100% { transform: translateY(-110vh) rotate(20deg); opacity: 0; }
        }
        .pr-disc {
          position: relative; width: 160px; height: 160px; border-radius: 50%;
          background:
            repeating-radial-gradient(circle, #0b0f1a 0 2px, #1f2937 3px 4px),
            #111827;
          box-shadow: 0 0 0 4px #0b0f1a, 0 18px 40px rgba(0,0,0,.6), 0 0 40px rgba(244,114,182,.35);
          animation: pr-spin 2.4s linear infinite;
        }
        .pr-disc::after {
          content: ""; position: absolute; inset: 0; border-radius: 50%;
          background: linear-gradient(115deg, transparent 40%, rgba(255,255,255,.22) 50%, transparent 60%);
        }
        .pr-label {
          position: absolute; top: 50%; left: 50%; width: 62px; height: 62px; margin: -31px 0 0 -31px;
          border-radius: 50%; background: conic-gradient(#f472b6, #fde68a, #34d399, #60a5fa, #c084fc, #f472b6);
          box-shadow: 0 0 0 2px #0b0f1a;
        }
        .pr-label::after {
          content: ""; position: absolute; top: 50%; left: 50%; width: 10px; height: 10px; margin: -5px 0 0 -5px;
          border-radius: 50%; background: #0b0f1a;
        }
        @keyframes pr-spin { to { transform: rotate(360deg); } }
        .pr-title {
          margin-top: 28px; font-size: 22px; font-weight: 900; letter-spacing: .04em;
          background: linear-gradient(90deg, #f472b6, #c084fc, #fde68a, #34d399, #60a5fa, #f472b6);
          background-size: 300% 100%; -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: pr-rainbow 3s linear infinite;
          filter: drop-shadow(0 0 8px rgba(244,114,182,.6));
        }
        @keyframes pr-rainbow { to { background-position: 300% 50%; } }
        .pr-sub { margin-top: 6px; font-size: 14px; color: #cbd5e1; }
        .pr-bar {
          margin-top: 22px; width: 220px; height: 6px; border-radius: 6px; background: rgba(255,255,255,.12); overflow: hidden;
        }
        .pr-bar > span {
          display: block; height: 100%; width: 0; border-radius: 6px;
          background: linear-gradient(90deg, #f472b6, #c084fc, #60a5fa, #34d399, #fde68a);
          animation: pr-fill ${LOADER_MS}ms ease-out forwards;
        }
        @keyframes pr-fill { to { width: 100%; } }
        @media (prefers-reduced-motion: reduce) {
          .pr-disc, .pr-note, .pr-title { animation: none !important; }
        }
      `}</style>

      {NOTES.map((n, i) => (
        <span
          key={i}
          className="pr-note"
          aria-hidden="true"
          style={{
            left: `${12 + i * 19}%`,
            animationDuration: `${7 + i * 1.3}s`,
            animationDelay: `${-i * 1.7}s`,
          }}
        >
          {n}
        </span>
      ))}

      <div className="pr-disc" aria-hidden="true">
        <div className="pr-label" />
      </div>
      <p className="pr-title">Warming up the piano…</p>
      <p className="pr-sub">Getting the sheet music ready</p>
      <div className="pr-bar" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}
