import { useEffect, useRef, useState } from "react";
import { X, ChevronRight } from "lucide-react";
import gsap from "gsap";

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
  const [showHint,     setShowHint]     = useState(false);

  const botRef     = useRef<HTMLDivElement>(null);
  const hintRef    = useRef<HTMLDivElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);
  const questionEl = useRef<HTMLDivElement>(null);
  const hintTl     = useRef<gsap.core.Timeline | null>(null);

  // Bot slides up after 2.5 s, hint bubble appears at 4 s then fades
  useEffect(() => {
    const bot = botRef.current;
    if (!bot) return;

    gsap.fromTo(bot,
      { y: 80, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "back.out(1.7)", delay: 2.5 }
    );

    const timer = setTimeout(() => {
      setShowHint(true);
      const hint = hintRef.current;
      if (!hint) return;
      hintTl.current = gsap.timeline()
        .fromTo(hint,
          { scale: 0.8, opacity: 0, y: 10 },
          { scale: 1, opacity: 1, y: 0, duration: 0.45, ease: "back.out(2)" }
        )
        .to(hint, { opacity: 0, y: -8, duration: 0.4, ease: "power2.in", delay: 4 })
        .call(() => setShowHint(false));
    }, 4000);

    return () => { clearTimeout(timer); hintTl.current?.kill(); };
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
    setShowHint(false);
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
      {showHint && phase === "idle" && (
        <div
          ref={hintRef}
          className="bg-card border border-pink/40 rounded-2xl rounded-br-sm px-4 py-2.5 text-sm font-semibold text-foreground shadow-lg max-w-[200px] text-right"
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
              <span className="text-xl">🤖</span>
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
          {phase === "idle" ? "🤖" : <X size={22} className="text-white" />}
        </button>
      </div>
    </div>
  );
};

export default QuizBot;
