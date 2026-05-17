import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Trophy, ArrowRight, RotateCcw, Flame, Star, Zap } from "lucide-react";

// ─── Voice announcer (Web Speech API) ────────────────────────────────────────
function say(text: string, pitch = 1.15, rate = 1.05) {
  try {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch  = pitch;
    u.rate   = rate;
    u.volume = 0.9;
    window.speechSynthesis.speak(u);
  } catch (_) { /* unsupported — ignore */ }
}

// ─── Sound engine (Web Audio API — no external deps) ─────────────────────────
let _audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext {
  if (!_audioCtx || _audioCtx.state === "closed") {
    _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return _audioCtx;
}

function playTone(
  freq: number, type: OscillatorType, startOffset: number,
  duration: number, volume = 0.28, pitchEnd?: number
) {
  try {
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    const t = ctx.currentTime + startOffset;
    osc.frequency.setValueAtTime(freq, t);
    if (pitchEnd !== undefined) osc.frequency.linearRampToValueAtTime(pitchEnd, t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.01);
  } catch (_) { /* audio blocked — silently ignore */ }
}

const SFX = {
  correct() {
    // Ascending major-third chime: C5 → E5
    playTone(523.25, "sine", 0,    0.25, 0.28);
    playTone(659.25, "sine", 0.1,  0.28, 0.28);
  },
  wrong() {
    // Descending buzz
    playTone(220, "sawtooth", 0, 0.04, 0.18);
    playTone(180, "sawtooth", 0.06, 0.04, 0.18);
    playTone(150, "sawtooth", 0.12, 0.18, 0.15, 80);
  },
  streak3() {
    // C5 → E5 → G5 arpeggio
    [523.25, 659.25, 783.99].forEach((f, i) => playTone(f, "sine", i * 0.09, 0.3, 0.26));
  },
  streak5() {
    // C5 → E5 → G5 → C6 power arpeggio
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => playTone(f, "sine", i * 0.09, 0.35, 0.26));
  },
  next() {
    // Soft neutral pop — quick sine blip
    playTone(880, "sine", 0, 0.07, 0.18);
    playTone(660, "sine", 0.05, 0.07, 0.10);
  },
  victory() {
    // Short fanfare: C E G E C(oct)
    const notes = [523.25, 659.25, 783.99, 659.25, 1046.5];
    const durs  = [0.14,   0.14,   0.14,   0.1,    0.45 ];
    let t = 0;
    notes.forEach((f, i) => { playTone(f, "sine", t, durs[i] + 0.05, 0.3); t += durs[i] * 0.82; });
  },
};

// ─── Confetti ─────────────────────────────────────────────────────────────────
const CONFETTI_COLORS = ["#FF2D78", "#39D98A", "#00D4FF", "#F59E0B", "#A855F7", "#FF6B35", "#ffffff"];

function useConfetti(active: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    interface Piece {
      x: number; y: number; vx: number; vy: number;
      color: string; w: number; h: number; rot: number; rotV: number; life: number;
    }

    const pieces: Piece[] = Array.from({ length: 180 }, () => ({
      x: Math.random() * canvas.width,
      y: -20,
      vx: (Math.random() - 0.5) * 6,
      vy: 2 + Math.random() * 5,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      w: 6 + Math.random() * 8,
      h: 4 + Math.random() * 6,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.2,
      life: 1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      pieces.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.07; p.rot += p.rotV;
        if (p.y > canvas.height * 0.75) p.life -= 0.02;
        if (p.life <= 0) return;
        alive = true;
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (alive) rafRef.current = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  return canvasRef;
}

// ─── Question bank (British terminology) ─────────────────────────────────────
type Category = "note_naming" | "rhythm" | "theory" | "sight_reading";

interface Q {
  question: string;
  options: string[];
  correct: number;
  category: Category;
  level: 1 | 2 | 3;
  explanation: string;
}

const BANK: Q[] = [
  // ── Level 1 — Note Naming ─────────────────────────────────────
  { level:1, category:"note_naming", question:"Which note sits in the middle of the piano keyboard?", options:["B3","Middle C (C4)","D4","A3"], correct:1, explanation:"Middle C (C4) sits in the centre of a standard 88-key piano." },
  { level:1, category:"note_naming", question:"What are the 7 letter names used in music?", options:["A B C D E F G","C D E F G A B C","A B C D E F G H","Do Re Mi Fa Sol La Si"], correct:0, explanation:"The musical alphabet uses only A through G, then repeats." },
  { level:1, category:"note_naming", question:"What note comes after G in the musical alphabet?", options:["H","A","G#","B"], correct:1, explanation:"The musical alphabet loops: … F G A B C …" },
  { level:1, category:"note_naming", question:"The treble clef is also called which clef?", options:["F clef","C clef","G clef","Alto clef"], correct:2, explanation:"The treble clef curls around the G4 line — so it's called the G clef." },
  { level:1, category:"note_naming", question:"On which line of the treble stave does G4 sit?", options:["1st line","2nd line","3rd line","4th line"], correct:1, explanation:"G4 sits on the second line from the bottom of the treble stave." },
  { level:1, category:"note_naming", question:"The bass clef is also called which clef?", options:["G clef","F clef","C clef","Bass G clef"], correct:1, explanation:"The bass clef anchors on the F3 line — so it's called the F clef." },

  // ── Level 1 — Rhythm (British) ────────────────────────────────
  { level:1, category:"rhythm", question:"How many beats does a semibreve receive in 4/4 time?", options:["1","2","3","4"], correct:3, explanation:"A semibreve (whole note) fills an entire bar in 4/4, which has 4 beats." },
  { level:1, category:"rhythm", question:"How many beats does a minim receive in 4/4 time?", options:["1","2","3","4"], correct:1, explanation:"A minim (half note) lasts 2 beats — half a 4/4 bar." },
  { level:1, category:"rhythm", question:"How many crotchets equal one semibreve?", options:["2","3","4","8"], correct:2, explanation:"4 crotchets (quarter notes) fill a semibreve (whole note)." },
  { level:1, category:"rhythm", question:"How many quavers equal one crotchet?", options:["2","3","4","6"], correct:0, explanation:"A quaver (eighth note) is half a crotchet, so 2 quavers = 1 crotchet." },
  { level:1, category:"rhythm", question:"What does the top number of a time signature tell you?", options:["The note value of the beat","How many beats are in each bar","The tempo","The key signature"], correct:1, explanation:"The top number counts beats per bar; the bottom shows which note gets one beat." },
  { level:1, category:"rhythm", question:"What is another name for a crotchet rest?", options:["Semibreve rest","Minim rest","Quarter rest","Quaver rest"], correct:2, explanation:"In British terminology a crotchet rest is sometimes also called a quarter rest." },

  // ── Level 1 — Theory ─────────────────────────────────────────
  { level:1, category:"theory", question:"What does 'forte' (f) mean in music?", options:["Soft","Medium","Loud","Very soft"], correct:2, explanation:"Forte (f) is Italian for strong/loud." },
  { level:1, category:"theory", question:"What does 'piano' (p) mean in music?", options:["Loud","Soft","Fast","Slow"], correct:1, explanation:"Piano (p) is Italian for soft — the instrument is named after its dynamic range!" },
  { level:1, category:"theory", question:"What is a rest in music?", options:["A repeat sign","A period of silence","A type of note head","A key signature"], correct:1, explanation:"A rest is a notated silence — you stop playing for its indicated duration." },
  { level:1, category:"theory", question:"What does a sharp (♯) do to a note?", options:["Lowers it by a semitone","Raises it by a semitone","Doubles its length","Lowers it by a tone"], correct:1, explanation:"A sharp raises the note by one semitone (half step)." },
  { level:1, category:"theory", question:"What does a flat (♭) do to a note?", options:["Raises it by a semitone","Doubles its length","Lowers it by a semitone","Raises it by a tone"], correct:2, explanation:"A flat lowers the note by one semitone (half step)." },
  { level:1, category:"theory", question:"What does 'tempo' mean?", options:["How loud to play","The key of the music","The speed of the music","The time signature"], correct:2, explanation:"Tempo is the speed of the music, usually measured in beats per minute (BPM)." },

  // ── Level 2 — Note Naming ─────────────────────────────────────
  { level:2, category:"note_naming", question:"What are the lines of the treble stave, bottom to top?", options:["E G B D F","F A C E G","G B D F A","C E G B D"], correct:0, explanation:"Every Good Boy Deserves Football — E, G, B, D, F." },
  { level:2, category:"note_naming", question:"What are the spaces of the treble stave, bottom to top?", options:["E G B D","F A C E","G B D F","A C E G"], correct:1, explanation:"The spaces spell FACE — F, A, C, E." },
  { level:2, category:"note_naming", question:"Which note sits on the first ledger line below the treble stave?", options:["B3","A3","Middle C (C4)","D4"], correct:2, explanation:"Middle C hangs on its own little ledger line just below the treble stave." },
  { level:2, category:"note_naming", question:"What are the lines of the bass stave, bottom to top?", options:["G B D F A","F A C E G","A C E G B","B D F A C"], correct:0, explanation:"Good Boys Deserve Fine Apples — G, B, D, F, A." },
  { level:2, category:"note_naming", question:"What are the spaces of the bass stave, bottom to top?", options:["G B D F","A C E G","F A C E","B D F A"], correct:1, explanation:"All Cows Eat Grass — A, C, E, G." },
  { level:2, category:"note_naming", question:"What is an enharmonic equivalent?", options:["Two notes with the same pitch but different names","Two notes an octave apart","Two notes a semitone apart","Two notes that form a chord"], correct:0, explanation:"F# and G♭ sound identical on the piano but have different written names — they are enharmonic equivalents." },

  // ── Level 2 — Rhythm (British) ────────────────────────────────
  { level:2, category:"rhythm", question:"How many beats does a dotted minim receive in 4/4 time?", options:["2","2.5","3","4"], correct:2, explanation:"A dot adds half the note's value. Minim = 2 beats + 1 = 3 beats." },
  { level:2, category:"rhythm", question:"What is 3/4 time often called?", options:["Common time","Cut time","Waltz time","March time"], correct:2, explanation:"3/4 has a ONE-two-three feel used in waltzes." },
  { level:2, category:"rhythm", question:"How many semiquavers fit into one crotchet?", options:["2","4","8","16"], correct:1, explanation:"A semiquaver is ¼ of a crotchet, so 4 × semiquaver = 1 crotchet." },
  { level:2, category:"rhythm", question:"What does a fermata (𝄐) above a note mean?", options:["Play it staccato","Hold it longer than written","Repeat this section","Play it louder"], correct:1, explanation:"A fermata tells the player to hold the note beyond its written duration." },
  { level:2, category:"rhythm", question:"What is a triplet?", options:["A chord of three notes","Three notes played in the time of two","A three-note scale","Repeat three times"], correct:1, explanation:"A triplet divides the beat into 3 equal parts instead of 2." },
  { level:2, category:"rhythm", question:"How many quavers are in a dotted crotchet?", options:["2","3","4","1.5"], correct:1, explanation:"A crotchet = 2 quavers; a dot adds 1 more quaver. So 3 quavers total." },

  // ── Level 2 — Theory ─────────────────────────────────────────
  { level:2, category:"theory", question:"What are the notes of the C major scale?", options:["C D E F G A B","C D E F# G A B","C D Eb F G A B","C D E F G Ab B"], correct:0, explanation:"C major is the only major scale with no sharps or flats." },
  { level:2, category:"theory", question:"What is an interval?", options:["The space between two stave lines","The distance between two pitches","A dynamic mark","The gap between phrases"], correct:1, explanation:"An interval measures the distance (in semitones or scale degrees) between two notes." },
  { level:2, category:"theory", question:"What is a triad?", options:["A set of 2 notes","A chord built from 3 notes","A group of 4 musicians","A three-beat rhythm pattern"], correct:1, explanation:"A triad stacks three notes: root, a third above, and a fifth above the root." },
  { level:2, category:"theory", question:"What makes a major chord different from a minor chord?", options:["Major chords have 4 notes","The 3rd is a semitone higher in a major chord","Minor chords are louder","They use different clefs"], correct:1, explanation:"A major chord uses a major 3rd (4 semitones); a minor chord uses a minor 3rd (3 semitones)." },
  { level:2, category:"theory", question:"What does 'legato' mean?", options:["Play detached and short","Play smoothly and connected","Play loudly","Play slowly"], correct:1, explanation:"Legato (Italian for 'tied') means notes should flow smoothly into each other." },

  // ── Level 2 — Sight Reading ───────────────────────────────────
  { level:2, category:"sight_reading", question:"When sight reading, how far ahead should you try to look?", options:["1 note ahead","One bar ahead","As far ahead as possible","Only at the current note"], correct:2, explanation:"Experienced readers scan as far ahead as possible to anticipate what is coming." },
  { level:2, category:"sight_reading", question:"What should you do if you make a mistake while sight reading?", options:["Stop and correct it","Start from the beginning","Keep going and maintain the pulse","Pause until ready"], correct:2, explanation:"Keeping the pulse going is more important than perfection — stopping disrupts the ensemble." },

  // ── Level 3 — Note Naming ─────────────────────────────────────
  { level:3, category:"note_naming", question:"What is the enharmonic equivalent of G♯?", options:["F#","Ab","A#","Gb"], correct:1, explanation:"G♯ and A♭ are the same piano key written two different ways." },
  { level:3, category:"note_naming", question:"What note is a perfect 5th above C?", options:["F","G","A","E"], correct:1, explanation:"A perfect 5th = 7 semitones. C → G is 7 semitones." },
  { level:3, category:"note_naming", question:"What note is a major 3rd above E?", options:["G","G#","Ab","F#"], correct:1, explanation:"A major 3rd = 4 semitones. E → F (1) → F# (2) → G (3) → G# (4)." },

  // ── Level 3 — Theory ─────────────────────────────────────────
  { level:3, category:"theory", question:"How many sharps are in the key of D major?", options:["1","2","3","4"], correct:1, explanation:"D major has F# and C# — two sharps." },
  { level:3, category:"theory", question:"What is the relative minor of C major?", options:["G minor","F minor","A minor","E minor"], correct:2, explanation:"The relative minor starts on the 6th degree. C major's 6th is A, so it's A minor." },
  { level:3, category:"theory", question:"What is a perfect cadence?", options:["I → IV","IV → I","V → I","I → V"], correct:2, explanation:"A perfect cadence moves from the dominant (V) to the tonic (I) — a strong resolution." },
  { level:3, category:"theory", question:"What does 'diminished' mean when applied to a chord?", options:["The chord has only 2 notes","It uses a minor 3rd and a diminished 5th","The chord is played softly","The chord has a major 7th"], correct:1, explanation:"A diminished triad stacks two minor thirds: root → minor 3rd → diminished 5th." },
  { level:3, category:"theory", question:"What is the Circle of Fifths?", options:["A scale pattern","A diagram showing the 12 keys arranged by intervals of a 5th","A Trinity exam grade","A type of arpeggiated chord"], correct:1, explanation:"The Circle of Fifths organises all 12 major (and relative minor) keys, each a perfect 5th apart." },

  // ── Level 3 — Rhythm (British) ────────────────────────────────
  { level:3, category:"rhythm", question:"What is the British name for a 32nd note?", options:["Semiquaver","Demisemiquaver","Hemidemisemiquaver","Quasihemidemisemiquaver"], correct:1, explanation:"A demisemiquaver is a 32nd note — half the length of a semiquaver." },
  { level:3, category:"rhythm", question:"How many demisemiquavers equal one minim?", options:["8","16","32","4"], correct:1, explanation:"Minim = 2 crotchets = 4 quavers = 8 semiquavers = 16 demisemiquavers." },

  // ── Level 3 — Sight Reading ───────────────────────────────────
  { level:3, category:"sight_reading", question:"What does an 8va marking above a passage mean?", options:["Play an octave lower","Play an octave higher","Play twice as fast","Repeat the passage"], correct:1, explanation:"8va (ottava) means play the notes an octave higher than written." },
  { level:3, category:"sight_reading", question:"What is the difference between staccato and staccatissimo?", options:["They are the same","Staccatissimo is shorter and more detached","Staccato is softer","Staccatissimo means very loud staccato"], correct:1, explanation:"Staccatissimo (a wedge mark) indicates an even shorter, more pointed articulation than the staccato dot." },
];

// ─── Question selection ───────────────────────────────────────────────────────
interface GameSummary { sessions: number; bestAcc: number | null; avgAccuracy: number | null }

function pickQuestions(foundationPct: number, games: Record<string, GameSummary>): Q[] {
  const level: 1 | 2 | 3 = foundationPct >= 66 ? 3 : foundationPct >= 33 ? 2 : 1;
  const weak = (key: string) => {
    const g = games[key];
    return g && g.sessions > 0 && (g.avgAccuracy ?? 100) < 70;
  };
  const w: Record<Category, number> = {
    note_naming:   weak("note_naming")   ? 3 : 1,
    rhythm:        weak("rhythm_quiz")   ? 3 : 1,
    sight_reading: weak("sight_reading") ? 3 : 1,
    theory:        2,
  };
  const pool = BANK.filter((q) => q.level <= level);
  const weighted: Q[] = [];
  pool.forEach((q) => { for (let i = 0; i < (w[q.category] || 1); i++) weighted.push(q); });
  for (let i = weighted.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [weighted[i], weighted[j]] = [weighted[j], weighted[i]];
  }
  const seen = new Set<string>();
  const out: Q[] = [];
  for (const q of weighted) {
    if (seen.has(q.question)) continue;
    seen.add(q.question);
    out.push(q);
    if (out.length === 10) break;
  }
  return out;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const GRADE_COLORS: Record<string, string> = {
  S: "#39D98A", A: "#00D4FF", B: "#A855F7", C: "#F59E0B", D: "#FF6B35", F: "#EF4444",
};
const CAT_LABELS: Record<Category, string> = {
  note_naming: "Note Naming", rhythm: "Rhythm", theory: "Music Theory", sight_reading: "Sight Reading",
};
const CAT_COLORS: Record<Category, string> = {
  note_naming: "#FF2D78", rhythm: "#F59E0B", theory: "#A855F7", sight_reading: "#00D4FF",
};

// ─── Score pop animation ──────────────────────────────────────────────────────
interface ScorePop { id: number; text: string; color: string }

// ─── Component ───────────────────────────────────────────────────────────────
const DailyReviewQuiz = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation() as {
    state: { foundationPct?: number; games?: Record<string, GameSummary>; name?: string } | null
  };

  const foundationPct = state?.foundationPct ?? 0;
  const games         = state?.games ?? {};
  const studentName   = state?.name ?? "Student";

  const questions = useMemo(() => pickQuestions(foundationPct, games), []);

  const [current,  setCurrent]  = useState(0);
  const [answers,  setAnswers]  = useState<Record<number, number>>({});
  const [revealed, setRevealed] = useState(false);
  const [done,     setDone]     = useState(false);
  const [score,    setScore]    = useState(0);
  const [streak,   setStreak]   = useState(0);
  const [maxStreak,setMaxStreak]= useState(0);
  const [pops,     setPops]     = useState<ScorePop[]>([]);
  const [shake,    setShake]    = useState(false);
  const [bounce,   setBounce]   = useState<number | null>(null);

  const popId = useRef(0);

  const confettiCanvas = useConfetti(done);

  const q       = questions[current];
  const chosen  = answers[current];
  const correct = questions.filter((q, i) => answers[i] === q.correct).length;
  const pct     = Math.round((correct / questions.length) * 100);
  const grade   = pct >= 95 ? "S" : pct >= 85 ? "A" : pct >= 70 ? "B" : pct >= 55 ? "C" : pct >= 40 ? "D" : "F";

  const addPop = useCallback((text: string, color: string) => {
    const id = popId.current++;
    setPops((prev) => [...prev, { id, text, color }]);
    setTimeout(() => setPops((prev) => prev.filter((p) => p.id !== id)), 1200);
  }, []);

  const selectAnswer = (idx: number) => {
    if (revealed) return;
    setAnswers((prev) => ({ ...prev, [current]: idx }));
    setRevealed(true);

    const isCorrect = idx === q.correct;
    if (isCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setMaxStreak((m) => Math.max(m, newStreak));
      const bonus = newStreak >= 5 ? 200 : newStreak >= 3 ? 150 : 100;
      setScore((s) => s + bonus);
      setBounce(idx);
      setTimeout(() => setBounce(null), 500);
      addPop(newStreak >= 5 ? `+${bonus} 🔥 BLAZING!` : newStreak >= 3 ? `+${bonus} ⚡ STREAK!` : `+${bonus}`, "#39D98A");
      if (newStreak >= 5) {
        SFX.streak5();
        const msg = newStreak >= 7 ? "Unstoppable!" : newStreak === 5 ? "Incredible!" : "Blazing!";
        addPop(`${msg} 🔥`, "#FF2D78");
        say(msg, 1.3, 1.1);
      } else if (newStreak === 3) {
        SFX.streak3();
        addPop("AMAZING! 🌟", "#F59E0B");
        say("Amazing!", 1.25, 1.05);
      } else if (newStreak === 4) {
        SFX.streak3();
        addPop("GOOD JOB! ⚡", "#A855F7");
        say("Good job!", 1.2, 1.05);
      } else {
        SFX.correct();
      }
    } else {
      setStreak(0);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      addPop("MISS!", "#EF4444");
      SFX.wrong();
    }
  };

  const next = async () => {
    SFX.next();
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      setRevealed(false);
    } else {
      setDone(true);
      if (user) {
        await (supabase as any).from("game_scores").insert({
          user_id:     user.id,
          game:        "daily_review",
          score,
          correct,
          total:       questions.length,
          best_streak: maxStreak,
        });
      }
    }
  };

  // ── Play victory sound once when results appear ───────────────────────────
  useEffect(() => { if (done) SFX.victory(); }, [done]);

  // ── Results ────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-full flex items-center justify-center p-6 relative">
        {/* Confetti overlay */}
        <canvas
          ref={confettiCanvas}
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: 9999 }}
        />

        <div className="w-full max-w-md space-y-5 text-center relative z-10">
          {/* Grade */}
          <div>
            <p
              className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3"
              style={{ fontFamily: "'DM Mono',monospace" }}
            >
              Daily Review Complete! 🎉
            </p>
            <div
              className="text-8xl font-black mb-2"
              style={{
                fontFamily: "'Orbitron',monospace",
                color: GRADE_COLORS[grade],
                textShadow: `0 0 60px ${GRADE_COLORS[grade]}90`,
                animation: "pop-in 0.5s cubic-bezier(0.34,1.56,0.64,1)",
              }}
            >
              {grade}
            </div>
            <p className="text-3xl font-bold text-white">{correct} / {questions.length}</p>
            <p className="text-sm text-muted-foreground mt-1">{pct}% accuracy</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Score", value: score.toLocaleString(), icon: <Zap className="w-4 h-4" />, color: "#F59E0B" },
              { label: "Best Streak", value: `${maxStreak} 🔥`, icon: <Flame className="w-4 h-4" />, color: "#FF2D78" },
              { label: "Accuracy", value: `${pct}%`, icon: <Star className="w-4 h-4" />, color: "#39D98A" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl p-3"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="flex items-center justify-center gap-1 mb-1" style={{ color: s.color }}>
                  {s.icon}
                </div>
                <p className="text-base font-bold text-white">{s.value}</p>
                <p className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono',monospace" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Per-question recap */}
          <div className="rounded-xl overflow-hidden text-left" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            {questions.map((q, i) => {
              const ok = answers[i] === q.correct;
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3"
                  style={{
                    borderBottom: i < questions.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    background: ok ? "rgba(57,217,138,0.06)" : "rgba(239,68,68,0.06)",
                  }}
                >
                  {ok
                    ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground leading-snug">{q.question}</p>
                    {!ok && <p className="text-xs text-green-400 mt-0.5 font-semibold">✓ {q.options[q.correct]}</p>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>
              Dashboard
            </Button>
            <Button
              className="flex-1 gap-2 font-bold"
              onClick={() => { setCurrent(0); setAnswers({}); setRevealed(false); setDone(false); setScore(0); setStreak(0); setMaxStreak(0); }}
              style={{ background: "linear-gradient(135deg,#FF2D78,#A855F7)", border: "none" }}
            >
              <RotateCcw className="w-4 h-4" /> Retry
            </Button>
          </div>
        </div>

        <style>{`
          @keyframes pop-in {
            from { transform: scale(0.3) rotate(-10deg); opacity: 0; }
            to   { transform: scale(1)   rotate(0deg);   opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // ── Quiz ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full flex flex-col p-4 max-w-xl mx-auto w-full relative">

      {/* Floating score pops */}
      <div className="fixed top-24 left-1/2 -translate-x-1/2 pointer-events-none z-50 space-y-1">
        {pops.map((p) => (
          <div
            key={p.id}
            className="text-center font-black text-lg px-4 py-1 rounded-full"
            style={{
              color: p.color,
              fontFamily: "'Orbitron',monospace",
              textShadow: `0 0 20px ${p.color}`,
              animation: "float-up 1.2s ease-out forwards",
            }}
          >
            {p.text}
          </div>
        ))}
      </div>

      {/* HUD */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          {/* Score */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-sm font-bold text-amber-400" style={{ fontFamily: "'Orbitron',monospace" }}>
              {score.toLocaleString()}
            </span>
          </div>

          {/* Question counter */}
          <span className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono',monospace" }}>
            {current + 1} / {questions.length}
          </span>

          {/* Streak */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all"
            style={{
              background: streak >= 3 ? "rgba(255,45,120,0.2)" : "rgba(255,255,255,0.05)",
              border: streak >= 3 ? "1px solid rgba(255,45,120,0.5)" : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <Flame className="w-3.5 h-3.5" style={{ color: streak >= 3 ? "#FF2D78" : "#6B7280" }} />
            <span className="text-sm font-bold" style={{ color: streak >= 3 ? "#FF2D78" : "#6B7280", fontFamily: "'Orbitron',monospace" }}>
              {streak}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <Progress value={((current + (revealed ? 1 : 0)) / questions.length) * 100} className="h-2" />

        {/* Mini star row */}
        <div className="flex gap-1.5 justify-center">
          {questions.map((_, i) => {
            const answered = i < current || (i === current && revealed);
            const wasCorrect = answered && answers[i] === questions[i].correct;
            return (
              <div
                key={i}
                className="w-5 h-5 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: answered
                    ? wasCorrect ? "rgba(57,217,138,0.3)" : "rgba(239,68,68,0.3)"
                    : i === current ? "rgba(255,45,120,0.2)" : "rgba(255,255,255,0.06)",
                  border: answered
                    ? wasCorrect ? "1px solid #39D98A" : "1px solid #EF4444"
                    : i === current ? "1px solid rgba(255,45,120,0.6)" : "1px solid rgba(255,255,255,0.1)",
                  transform: i === current ? "scale(1.2)" : "scale(1)",
                }}
              >
                {answered && (wasCorrect
                  ? <div className="w-2 h-2 rounded-full bg-green-400" />
                  : <div className="w-2 h-2 rounded-full bg-red-400" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Question card */}
      <div
        className="flex-1 rounded-2xl p-5 mb-4 flex flex-col"
        style={{
          background: "linear-gradient(145deg,#151228,#0f0d1a)",
          border: "1px solid rgba(255,45,120,0.15)",
          animation: shake ? "shake 0.4s ease" : "slide-in 0.3s ease",
        }}
        key={current}
      >
        {/* Category badge */}
        <div className="mb-4">
          <span
            className="text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full"
            style={{
              background: `${CAT_COLORS[q.category]}20`,
              color: CAT_COLORS[q.category],
              border: `1px solid ${CAT_COLORS[q.category]}40`,
              fontFamily: "'DM Mono',monospace",
            }}
          >
            {CAT_LABELS[q.category]}
          </span>
        </div>

        <p className="text-base font-bold text-white leading-snug mb-5 flex-1">
          {q.question}
        </p>

        {/* Options */}
        <div className="space-y-2.5">
          {q.options.map((opt, i) => {
            const isChosen  = chosen === i;
            const isCorrect = i === q.correct;
            let bg     = "rgba(255,255,255,0.04)";
            let border = "rgba(255,255,255,0.08)";
            let color  = "#E8ECF0";
            let transform = "scale(1)";
            if (revealed) {
              if (isCorrect)        { bg = "rgba(57,217,138,0.18)";  border = "#39D98A"; color = "#39D98A"; if (bounce === i) transform = "scale(1.03)"; }
              else if (isChosen)    { bg = "rgba(239,68,68,0.18)";   border = "#EF4444"; color = "#EF4444"; }
            } else if (isChosen)    { bg = "rgba(255,45,120,0.15)";  border = "#FF2D78"; color = "#FF2D78"; }

            return (
              <button
                key={i}
                onClick={() => selectAnswer(i)}
                disabled={revealed}
                className="w-full text-left rounded-xl px-4 py-3 flex items-center gap-3 transition-all"
                style={{
                  background: bg,
                  border: `1px solid ${border}`,
                  color,
                  cursor: revealed ? "default" : "pointer",
                  transform,
                  transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                }}
              >
                <span
                  className="w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.08)", fontFamily: "'DM Mono',monospace" }}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-sm font-medium flex-1">{opt}</span>
                {revealed && isCorrect && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                {revealed && isChosen && !isCorrect && <XCircle className="w-4 h-4 flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {revealed && (
          <div
            className="mt-4 rounded-xl px-4 py-3 text-sm"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "#a0aec0",
              animation: "slide-in 0.25s ease",
            }}
          >
            💡 {q.explanation}
          </div>
        )}
      </div>

      {/* Next */}
      {revealed && (
        <Button
          onClick={next}
          className="w-full py-5 text-base font-bold gap-2"
          style={{
            background: "linear-gradient(135deg,#FF2D78,#A855F7)",
            border: "none",
            fontFamily: "'Orbitron',monospace",
            letterSpacing: "0.06em",
            animation: "slide-in 0.2s ease",
          }}
        >
          {current < questions.length - 1
            ? <><ArrowRight className="w-4 h-4" /> Next</>
            : <><Trophy className="w-4 h-4" /> See Results</>}
        </Button>
      )}

      <style>{`
        @keyframes float-up {
          0%   { opacity:1; transform:translateY(0)   scale(1);   }
          100% { opacity:0; transform:translateY(-60px) scale(1.2); }
        }
        @keyframes shake {
          0%,100%{ transform:translateX(0); }
          20%    { transform:translateX(-8px); }
          40%    { transform:translateX(8px); }
          60%    { transform:translateX(-5px); }
          80%    { transform:translateX(5px); }
        }
        @keyframes slide-in {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default DailyReviewQuiz;
