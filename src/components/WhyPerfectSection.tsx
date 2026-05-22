import { useNavigate } from "react-router-dom";

const sightReadingBullets = [
  { bold: "STRUGGLE", rest: " TO READ NOTES?" },
  { bold: "ANXIETY", rest: " DURING SIGHT READING SECTION?" },
  { bold: "DYING", rest: " TO PICK UP YOUR FAVORITE PIECE WITH EASE?" },
  { bold: "WISHING", rest: " IT TAKES YOU 10 MINUTES OR LESS TO LEARN A PIECE?" },
];

const gamifiedBullets = [
  { bold: "SAY GOODBYE", rest: " TO TRADITIONAL BORING CLASSES." },
  { bold: "SAY HELLO", rest: " TO COOLER WAY OF LEARNING." },
  { bold: "GET YOUR", rest: " ASSESSMENT ON THE GO!" },
];

const ClipboardIcon = () => (
  <svg viewBox="0 0 220 240" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Clipboard board */}
    <rect x="30" y="30" width="145" height="185" rx="10" fill="#2a6b5e" />
    <rect x="40" y="50" width="125" height="155" rx="6" fill="#f5f5f0" />
    {/* Clip */}
    <rect x="75" y="18" width="55" height="28" rx="8" fill="#1a4a40" />
    <rect x="85" y="24" width="35" height="16" rx="4" fill="#f5f5f0" />
    {/* Lines on clipboard */}
    <rect x="55" y="70" width="95" height="8" rx="4" fill="#ccc" />
    <rect x="55" y="88" width="75" height="8" rx="4" fill="#ccc" />
    <rect x="55" y="106" width="85" height="8" rx="4" fill="#ccc" />
    {/* Hand holding pencil */}
    <ellipse cx="130" cy="185" rx="38" ry="22" fill="#f4c49e" />
    <ellipse cx="110" cy="195" rx="28" ry="16" fill="#f4c49e" />
    {/* Pencil */}
    <rect x="118" y="140" width="10" height="60" rx="3" transform="rotate(-30 118 140)" fill="#f5c518" />
    <polygon points="130,188 136,198 122,194" fill="#f5a623" />
    <rect x="130" y="138" width="10" height="12" rx="1" transform="rotate(-30 130 138)" fill="#e8c4a0" />
    <polygon points="134,135 140,145 128,142" fill="#333" />
  </svg>
);

const RobotIcon = () => (
  <svg viewBox="0 0 220 260" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Body */}
    <rect x="55" y="120" width="110" height="90" rx="20" fill="#f0f0f5" />
    {/* Head */}
    <rect x="65" y="55" width="90" height="75" rx="18" fill="#f0f0f5" />
    {/* Antenna */}
    <rect x="106" y="30" width="8" height="28" rx="4" fill="#c0a0e0" />
    <circle cx="110" cy="26" r="9" fill="#c084fc" />
    {/* Eyes */}
    <ellipse cx="92" cy="90" rx="14" ry="14" fill="#7c3aed" />
    <ellipse cx="128" cy="90" rx="14" ry="14" fill="#7c3aed" />
    <ellipse cx="92" cy="90" rx="8" ry="8" fill="#a78bfa" />
    <ellipse cx="128" cy="90" rx="8" ry="8" fill="#a78bfa" />
    <circle cx="95" cy="87" r="3" fill="white" />
    <circle cx="131" cy="87" r="3" fill="white" />
    {/* Mouth */}
    <rect x="90" y="112" width="40" height="10" rx="5" fill="#c084fc" opacity="0.5" />
    {/* Chest panel */}
    <rect x="72" y="135" width="76" height="55" rx="10" fill="#e8e0f8" />
    <circle cx="92" cy="158" r="10" fill="#7c3aed" opacity="0.4" />
    <circle cx="110" cy="155" r="7" fill="#a78bfa" opacity="0.5" />
    <circle cx="128" cy="158" r="10" fill="#7c3aed" opacity="0.4" />
    {/* Arms */}
    <rect x="22" y="125" width="35" height="22" rx="11" fill="#f0f0f5" />
    <rect x="163" y="125" width="35" height="22" rx="11" fill="#f0f0f5" />
    {/* Legs */}
    <rect x="75" y="205" width="30" height="35" rx="12" fill="#f0f0f5" />
    <rect x="115" y="205" width="30" height="35" rx="12" fill="#f0f0f5" />
  </svg>
);

const WhyPerfectSection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20" style={{ background: "linear-gradient(180deg, #0d0d2b 0%, #130d2e 100%)" }}>
      <div className="container mx-auto px-4 max-w-5xl">

        {/* Title */}
        <h2
          className="text-3xl md:text-4xl font-black uppercase mb-16"
          style={{ fontFamily: "'Montserrat',sans-serif", color: "#fff" }}
        >
          WHY IT'S{" "}
          <span
            className="px-3 py-1 rounded"
            style={{ background: "#e91e8c", color: "#fff" }}
          >
            PERFECT FOR YOU
          </span>
        </h2>

        {/* Row 1 — Sight Reading */}
        <div className="flex flex-col md:flex-row items-center gap-8 mb-16">
          {/* Icon */}
          <div className="w-52 h-52 shrink-0">
            <ClipboardIcon />
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3
              className="text-2xl md:text-3xl font-black uppercase mb-6"
              style={{ fontFamily: "'Montserrat',sans-serif", color: "#fff" }}
            >
              <span style={{ color: "#e91e8c" }}>MASTER</span>{" "}
              <span className="font-light text-xl md:text-2xl tracking-widest" style={{ color: "#ccc" }}>
                THE ART OF SIGHT READING
              </span>
            </h3>
            <div className="space-y-3">
              {sightReadingBullets.map((b, i) => (
                <p
                  key={i}
                  className="text-sm tracking-widest uppercase"
                  style={{ fontFamily: "'Montserrat',sans-serif", color: "#aaa" }}
                >
                  <strong style={{ color: "#fff" }}>{b.bold}</strong>{b.rest}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2 — Gamified */}
        <div className="flex flex-col md:flex-row items-center gap-8 mb-20">
          {/* Icon */}
          <div className="w-52 h-52 shrink-0">
            <RobotIcon />
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3
              className="text-2xl md:text-3xl font-black uppercase mb-6"
              style={{ fontFamily: "'Montserrat',sans-serif", color: "#fff" }}
            >
              <span style={{ color: "#e91e8c" }}>GAMIFIED</span>{" "}
              <span className="font-light text-xl md:text-2xl tracking-widest" style={{ color: "#ccc" }}>
                LECTURES WITH AI INTEGRATION
              </span>
            </h3>
            <div className="space-y-3">
              {gamifiedBullets.map((b, i) => (
                <p
                  key={i}
                  className="text-sm tracking-widest uppercase"
                  style={{ fontFamily: "'Montserrat',sans-serif", color: "#aaa" }}
                >
                  <strong style={{ color: "#fff" }}>{b.bold}</strong>{b.rest}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <p
            className="text-xl md:text-2xl font-black uppercase tracking-wide text-white"
            style={{ fontFamily: "'Montserrat',sans-serif" }}
          >
            SEE IF YOU'RE A PERFECT FIT.
          </p>
          <button
            onClick={() => navigate("/signup")}
            className="px-8 py-4 rounded-full font-black uppercase tracking-widest text-white transition-transform hover:scale-105 active:scale-95 text-lg shrink-0"
            style={{
              background: "linear-gradient(135deg, #e91e8c, #c2185b)",
              fontFamily: "'Montserrat',sans-serif",
              boxShadow: "0 4px 24px rgba(233,30,140,0.4)",
            }}
          >
            START FOR FREE
          </button>
        </div>

      </div>
    </section>
  );
};

export default WhyPerfectSection;
