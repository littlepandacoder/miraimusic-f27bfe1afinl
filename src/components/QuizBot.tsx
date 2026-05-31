import { useEffect, useRef, useState } from "react";
import { X, ChevronRight } from "lucide-react";
import gsap from "gsap";

/* ── Brand-coloured robot SVG icon for the bot button ─────────────── */
const BotIcon = ({ size = 28 }: { size?: number }) => (
  <svg viewBox="0 0 512 512" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
    <path fill="white" d="M256.002,90.32c-4.725,0-8.553-3.829-8.553-8.553V23.369c0-4.723,3.828-8.553,8.553-8.553
      c4.725,0,8.553,3.829,8.553,8.553v58.398C264.555,86.49,260.727,90.32,256.002,90.32z"/>
    <rect x="191.825" y="208.645" fill="rgba(255,255,255,0.6)" width="128.351" height="34.782"/>
    <path fill="rgba(255,255,255,0.95)" d="M364.126,81.047v136.721h-43.951H191.825h-43.951V81.047
      c0-15.977,12.955-28.932,28.932-28.932h79.2h79.189C351.182,52.116,364.126,65.071,364.126,81.047z"/>
    <path fill="rgba(255,255,255,0.6)" d="M196.192,52.116h-19.387c-15.977,0-28.932,12.955-28.932,28.932v136.721h19.387V81.047
      C167.261,65.071,180.216,52.116,196.192,52.116z"/>
    <rect x="171.606" y="363.784" fill="rgba(255,255,255,0.8)" width="33.413" height="121.303"/>
    <rect x="306.992" y="363.784" fill="rgba(255,255,255,0.8)" width="33.402" height="121.303"/>
    <path fill="rgba(255,255,255,0.55)" d="M306.992,364.924v42.103h33.402v-42.103H306.992z M171.606,407.027h33.413v-42.103h-33.413V407.027z"/>
    <rect x="348.799" y="264.091" fill="rgba(255,255,255,0.8)" width="62.299" height="35.17"/>
    <rect x="100.468" y="264.091" fill="rgba(255,255,255,0.8)" width="63.166" height="35.17"/>
    <path fill="rgba(255,255,255,0.7)" d="M203.251,108.576c16.513,0,29.89,13.388,29.89,29.89c0,16.513-13.377,29.89-29.89,29.89
      c-16.501,0-29.878-13.377-29.878-29.89C173.373,121.964,186.75,108.576,203.251,108.576z"/>
    <path fill="rgba(255,255,255,0.7)" d="M308.749,108.576c16.501,0,29.89,13.388,29.89,29.89c0,16.513-13.388,29.89-29.89,29.89
      c-16.513,0-29.89-13.377-29.89-29.89C278.859,121.964,292.236,108.576,308.749,108.576z"/>
    <polygon fill="rgba(255,255,255,0.95)" points="224.36,471.562 224.36,512 152.265,512 152.265,471.562 171.606,471.562 205.019,471.562"/>
    <polygon fill="rgba(255,255,255,0.95)" points="359.735,471.562 359.735,512 287.651,512 287.651,471.562 306.992,471.562 340.394,471.562"/>
    <path fill="rgba(255,255,255,0.95)" d="M416.253,269.611v140.416h-31.885V299.261v-35.17v-26.366l0,0
      C401.978,237.725,416.253,252.001,416.253,269.611z"/>
    <path fill="rgba(255,255,255,0.95)" d="M127.632,299.261v110.766H95.747V269.611c0-17.61,14.275-31.885,31.885-31.885l0,0v26.366V299.261z"/>
    <path fill="rgba(255,255,255,0.9)" d="M364.126,299.261v78.048h-23.731v-0.011h-33.402v0.011H205.019v-0.011h-33.413v0.011h-23.731v-78.048
      v-35.17v-26.366h43.951h128.351h43.951v26.366L364.126,299.261L364.126,299.261z"/>
    <rect x="147.874" y="237.725" fill="rgba(255,255,255,0.55)" width="38.043" height="139.572"/>
    {/* Eye rings — dark for contrast */}
    <path fill="rgba(0,0,0,0.55)" d="M241.698,138.467c0-21.196-17.245-38.441-38.441-38.441c-21.198,0-38.442,17.245-38.442,38.441
      s17.245,38.441,38.442,38.441C224.453,176.908,241.698,159.663,241.698,138.467z M181.92,138.467
      c0-11.764,9.572-21.336,21.337-21.336s21.336,9.571,21.336,21.336c0,11.764-9.571,21.336-21.336,21.336
      S181.92,150.231,181.92,138.467z"/>
    <path fill="rgba(0,0,0,0.55)" d="M308.748,176.908c21.196,0,38.441-17.245,38.441-38.441s-17.245-38.441-38.441-38.441
      c-21.198,0-38.442,17.245-38.442,38.441S287.55,176.908,308.748,176.908z M308.748,117.13c11.764,0,21.335,9.571,21.335,21.336
      s-9.571,21.336-21.335,21.336s-21.337-9.571-21.337-21.336S296.983,117.13,308.748,117.13z"/>
    <circle fill="rgba(0,0,0,0.5)" cx="316.275" cy="271.127" r="8.553"/>
    <circle fill="rgba(0,0,0,0.5)" cx="195.725" cy="271.127" r="8.553"/>
    {/* Antenna ball */}
    <circle fill="white" cx="256.006" cy="14.816" r="14.816"/>
    {/* Mouth */}
    <path fill="rgba(255,255,255,0.45)" d="M303.469,330.906h-94.937c0-11.073,3.798-21.268,10.149-29.342
      c8.701-11.039,22.181-18.132,37.325-18.132C282.223,283.432,303.469,304.689,303.469,330.906z"/>
    <path fill="rgba(255,255,255,0.7)" d="M294.813,330.906h-86.282c0-11.073,3.798-21.268,10.149-29.342
      c8.074-6.352,18.258-10.149,29.342-10.149C271.515,291.415,291.027,308.486,294.813,330.906z"/>
  </svg>
);

/* ── 4 representative questions from different theory categories ─────── */
const QUESTIONS = [
  {
    q: "What does 'forte' (f) mean in music?",
    options: ["Soft", "Medium", "Loud", "Very fast"],
    correct: 2,
    emoji: "🔊",
  },
  {
    q: "How many beats does a semibreve (whole note) receive in 4/4 time?",
    options: ["1 beat", "2 beats", "3 beats", "4 beats"],
    correct: 3,
    emoji: "🎵",
  },
  {
    q: "What are the 7 letter names used in music?",
    options: ["A B C D E F G", "A B C D E F G H", "C D E F G A B C", "Do Re Mi Fa Sol La"],
    correct: 0,
    emoji: "🎹",
  },
  {
    q: "What does a sharp (♯) do to a note?",
    options: ["Lowers it by a semitone", "Raises it by a semitone", "Doubles its length", "Lowers it by a tone"],
    correct: 1,
    emoji: "🎼",
  },
];

type Phase = "idle" | "quiz" | "result";

const QuizBot = () => {
  const [phase,        setPhase]        = useState<Phase>("idle");
  const [qIndex,       setQIndex]       = useState(0);
  const [selected,     setSelected]     = useState<number | null>(null);
  const [scores,       setScores]       = useState<boolean[]>([]);
  const [hintVisible,  setHintVisible]  = useState(false);

  const botRef     = useRef<HTMLDivElement>(null);
  const hintRef    = useRef<HTMLDivElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);
  const questionEl = useRef<HTMLDivElement>(null);
  const hintTl     = useRef<gsap.core.Timeline | null>(null);

  // Bot slides up after 2.5 s, hint bubble appears at 4 s then fades
  useEffect(() => {
    const bot = botRef.current;
    if (!bot) return;

    // Bot slides up, then hint bubble fades in — and stays permanently
    gsap.fromTo(bot,
      { y: 80, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 0.8, ease: "back.out(1.7)", delay: 2.5,
        onComplete: () => {
          setHintVisible(true);
          const hint = hintRef.current;
          if (!hint) return;
          gsap.fromTo(hint,
            { scale: 0.8, opacity: 0, y: 8 },
            { scale: 1, opacity: 1, y: 0, duration: 0.45, ease: "back.out(2)" }
          );
        },
      }
    );

    return () => { hintTl.current?.kill(); };
  }, []);

  // Animate panel in when phase changes
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || phase === "idle") return;
    gsap.fromTo(panel,
      { y: 30, opacity: 0, scale: 0.88 },
      { y: 0, opacity: 1, scale: 1, duration: 0.42, ease: "back.out(1.6)", transformOrigin: "bottom right" }
    );
  }, [phase]);

  // Animate new question sliding in
  useEffect(() => {
    const el = questionEl.current;
    if (!el || phase !== "quiz") return;
    gsap.fromTo(el,
      { x: 28, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.32, ease: "power2.out" }
    );
  }, [qIndex, phase]);

  const openQuiz = () => {
    hintTl.current?.kill();
    setHintVisible(false);
    setPhase("quiz");
    setQIndex(0);
    setSelected(null);
    setScores([]);
  };

  const closePanel = () => {
    const panel = panelRef.current;
    if (panel) {
      gsap.to(panel, {
        y: 20, opacity: 0, scale: 0.9, duration: 0.25, ease: "power2.in",
        onComplete: () => setPhase("idle"),
      });
    } else {
      setPhase("idle");
    }
  };

  const choose = (i: number) => {
    if (selected !== null) return;
    setSelected(i);

    const correct = i === QUESTIONS[qIndex].correct;
    const newScores = [...scores, correct];

    // Shake on wrong answer
    if (!correct) {
      const opts = document.querySelectorAll("[data-opt]");
      gsap.to(opts[i], { x: [-5, 5, -5, 5, 0], duration: 0.35, ease: "power1.out" });
    }

    setTimeout(() => {
      if (qIndex < QUESTIONS.length - 1) {
        setScores(newScores);
        setQIndex(qIndex + 1);
        setSelected(null);
      } else {
        setScores(newScores);
        setPhase("result");
      }
    }, 900);
  };

  const totalScore  = scores.filter(Boolean).length;
  const pct         = Math.round((totalScore / QUESTIONS.length) * 100);
  const passed      = pct >= 80;
  const current     = QUESTIONS[qIndex];

  return (
    <div className="fixed bottom-6 right-4 sm:right-6 z-40 flex flex-col items-end gap-3">

      {/* Hint bubble */}
      {hintVisible && phase === "idle" && (
        <div
          ref={hintRef}
          className="bg-card border border-pink/40 rounded-2xl rounded-br-sm px-4 py-2.5 text-sm font-semibold text-foreground shadow-lg max-w-[200px] text-center"
          style={{ boxShadow: "0 0 24px hsl(330 85% 55% / 0.25)" }}
        >
          🎹 Want to play a game?
        </div>
      )}

      {/* Quiz / Result panel */}
      {phase !== "idle" && (
        <div
          ref={panelRef}
          className="w-[min(340px,90vw)] rounded-2xl border border-pink/30 overflow-hidden"
          style={{
            background: "hsl(222 47% 10%)",
            boxShadow: "0 0 48px hsl(330 85% 55% / 0.18), 0 20px 60px rgba(0,0,0,0.5)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: "hsl(330 85% 55% / 0.15)" }}
          >
            <div className="flex items-center gap-2">
              <BotIcon size={22} />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-pink">Music Quiz</p>
                <p className="text-foreground font-black text-sm leading-none">
                  {phase === "quiz"
                    ? `Question ${qIndex + 1} of ${QUESTIONS.length}`
                    : "Your Results"}
                </p>
              </div>
            </div>
            <button
              onClick={closePanel}
              className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center hover:bg-pink/20 transition-colors"
            >
              <X size={14} className="text-muted-foreground" />
            </button>
          </div>

          {/* Progress bar */}
          {phase === "quiz" && (
            <div className="h-1 bg-border/30">
              <div
                className="h-full bg-pink transition-all duration-300"
                style={{ width: `${((qIndex) / QUESTIONS.length) * 100}%` }}
              />
            </div>
          )}

          {/* Quiz body */}
          {phase === "quiz" && (
            <div ref={questionEl} className="p-4">
              <div className="flex items-start gap-2 mb-4">
                <span className="text-2xl shrink-0">{current.emoji}</span>
                <p className="text-foreground font-semibold text-sm leading-snug">{current.q}</p>
              </div>

              <div className="space-y-2">
                {current.options.map((opt, i) => {
                  const isCorrect  = i === current.correct;
                  const isSelected = i === selected;
                  let bg = "bg-secondary/60 hover:bg-secondary border-border/40 hover:border-pink/40";
                  if (selected !== null) {
                    if (isCorrect)       bg = "bg-green-500/20 border-green-500/60";
                    else if (isSelected) bg = "bg-red-500/20 border-red-500/60";
                    else                 bg = "bg-secondary/30 border-border/20 opacity-50";
                  }

                  return (
                    <button
                      key={i}
                      data-opt
                      onClick={() => choose(i)}
                      disabled={selected !== null}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${bg}`}
                    >
                      <span className="font-black text-pink mr-2">
                        {["A", "B", "C", "D"][i]}.
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Result body */}
          {phase === "result" && (
            <div className="p-5 text-center">
              {/* Score ring */}
              <div
                className="w-20 h-20 rounded-full flex flex-col items-center justify-center mx-auto mb-4 border-2"
                style={{
                  borderColor: passed ? "#22d3ee" : "#ec4899",
                  background: passed ? "rgba(34,211,238,0.08)" : "rgba(236,72,153,0.08)",
                  boxShadow: passed
                    ? "0 0 28px rgba(34,211,238,0.3)"
                    : "0 0 28px rgba(236,72,153,0.3)",
                }}
              >
                <span className="text-2xl font-black" style={{ color: passed ? "#22d3ee" : "#ec4899" }}>
                  {pct}%
                </span>
                <span className="text-xs text-muted-foreground">{totalScore}/{QUESTIONS.length}</span>
              </div>

              {passed ? (
                <>
                  <p className="text-foreground font-black text-base mb-1">Impressive! 🌟</p>
                  <p className="text-muted-foreground text-xs mb-4 leading-snug">
                    You clearly have a musical ear. Take your skills all the way to a Trinity exam pass.
                  </p>
                  <a
                    href="/signup"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-black text-sm text-white uppercase tracking-wider animate-pulse-glow"
                    style={{ background: "hsl(330 85% 55%)" }}
                  >
                    Start Free Trial <ChevronRight size={16} />
                  </a>
                </>
              ) : (
                <>
                  <p className="text-foreground font-black text-base mb-1">
                    {pct >= 50 ? "Good effort! 🎵" : "Room to grow! 🎹"}
                  </p>
                  <p className="text-muted-foreground text-xs mb-1 leading-snug">
                    You got {totalScore} out of {QUESTIONS.length}. Want to improve your music theory?
                  </p>
                  <p className="text-pink font-black text-sm mb-4">
                    Try Musicable for just <span className="text-lg">$8</span>/month
                  </p>
                  <a
                    href="/signup"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-black text-sm text-white uppercase tracking-wider animate-pulse-glow"
                    style={{ background: "hsl(330 85% 55%)" }}
                  >
                    Improve Now — $8/month <ChevronRight size={16} />
                  </a>
                </>
              )}

              <button
                onClick={() => { setPhase("quiz"); setQIndex(0); setSelected(null); setScores([]); }}
                className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating bot button */}
      <div ref={botRef} style={{ opacity: 0 }}>
        <button
          onClick={phase === "idle" ? openQuiz : closePanel}
          className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg transition-transform hover:scale-110 active:scale-95"
          style={{
            background: "linear-gradient(135deg, hsl(330 85% 55%) 0%, hsl(280 70% 55%) 100%)",
            boxShadow: "0 0 24px hsl(330 85% 55% / 0.5), 0 8px 20px rgba(0,0,0,0.3)",
          }}
          aria-label="Open music quiz"
        >
          {phase === "idle" ? <BotIcon size={30} /> : <X size={22} className="text-white" />}
        </button>
      </div>
    </div>
  );
};

export default QuizBot;
