import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Trophy, ArrowRight, RotateCcw } from "lucide-react";

// ─── Question bank ────────────────────────────────────────────────────────────
type Category = "note_naming" | "rhythm" | "theory" | "sight_reading" | "piano";

interface Q {
  question: string;
  options: string[];
  correct: number;
  category: Category;
  level: 1 | 2 | 3;
  explanation?: string;
}

const BANK: Q[] = [
  // ── Level 1 — Note Naming ──────────────────────────────────────────────────
  { level: 1, category: "note_naming", question: "Which note is in the middle of the piano keyboard?", options: ["B3", "Middle C (C4)", "D4", "A3"], correct: 1, explanation: "Middle C (C4) sits in the centre of a standard 88-key piano." },
  { level: 1, category: "note_naming", question: "What are the 7 letter names used in music?", options: ["A B C D E F G", "C D E F G A B C", "A B C D E F G H", "Do Re Mi Fa Sol La Si"], correct: 0, explanation: "The musical alphabet uses only A through G, then repeats." },
  { level: 1, category: "note_naming", question: "What note comes after G in the musical alphabet?", options: ["H", "A", "G#", "B"], correct: 1, explanation: "The musical alphabet loops: … F G A B C …" },
  { level: 1, category: "note_naming", question: "The treble clef is also known as which clef?", options: ["F clef", "C clef", "G clef", "Alto clef"], correct: 2, explanation: "The treble clef curls around the G4 line, so it's called the G clef." },
  { level: 1, category: "note_naming", question: "On which line of the treble staff does G4 sit?", options: ["1st line", "2nd line", "3rd line", "4th line"], correct: 1, explanation: "G4 sits on the second line from the bottom of the treble staff." },
  { level: 1, category: "note_naming", question: "The bass clef is also known as which clef?", options: ["G clef", "F clef", "C clef", "Bass G clef"], correct: 1, explanation: "The bass clef anchors on the F3 line, so it's called the F clef." },
  // ── Level 1 — Rhythm ──────────────────────────────────────────────────────
  { level: 1, category: "rhythm", question: "How many beats does a whole note receive in 4/4 time?", options: ["1", "2", "3", "4"], correct: 3, explanation: "A whole note fills an entire measure in 4/4, which has 4 beats." },
  { level: 1, category: "rhythm", question: "How many beats does a half note receive in 4/4 time?", options: ["1", "2", "3", "4"], correct: 1, explanation: "A half note lasts for 2 beats — half of a 4/4 measure." },
  { level: 1, category: "rhythm", question: "How many quarter notes equal one whole note?", options: ["2", "3", "4", "8"], correct: 2, explanation: "4 quarter notes fill a whole note (and a 4/4 measure)." },
  { level: 1, category: "rhythm", question: "How many eighth notes equal one quarter note?", options: ["2", "3", "4", "6"], correct: 0, explanation: "An eighth note is half a quarter note, so 2 eighth notes = 1 quarter note." },
  { level: 1, category: "rhythm", question: "What does the top number of a time signature tell you?", options: ["The note value of the beat", "How many beats are in each measure", "The tempo", "The key signature"], correct: 1, explanation: "The top number counts the beats per measure; the bottom number shows which note gets one beat." },
  // ── Level 1 — Theory ──────────────────────────────────────────────────────
  { level: 1, category: "theory", question: "What does 'forte' (f) mean in music?", options: ["Soft", "Medium", "Loud", "Very soft"], correct: 2, explanation: "Forte (f) is Italian for strong/loud." },
  { level: 1, category: "theory", question: "What does 'piano' (p) mean in music?", options: ["Loud", "Soft", "Fast", "Slow"], correct: 1, explanation: "Piano (p) is Italian for soft. Yes — the instrument is named after its ability to play soft and loud!" },
  { level: 1, category: "theory", question: "What is a rest in music?", options: ["A repeat sign", "A period of silence", "A type of note head", "A key signature"], correct: 1, explanation: "A rest is a notated silence — you stop playing for its indicated duration." },
  { level: 1, category: "theory", question: "What does 'tempo' mean?", options: ["How loud to play", "The key of the music", "The speed of the music", "The time signature"], correct: 2, explanation: "Tempo is the speed of the music, usually measured in beats per minute (BPM)." },
  { level: 1, category: "theory", question: "What does a sharp (♯) do to a note?", options: ["Lowers it by a half step", "Raises it by a half step", "Doubles its length", "Lowers it by a whole step"], correct: 1, explanation: "A sharp raises the note by a semitone (half step)." },
  { level: 1, category: "theory", question: "What does a flat (♭) do to a note?", options: ["Raises it by a half step", "Doubles its length", "Lowers it by a half step", "Raises it by a whole step"], correct: 2, explanation: "A flat lowers the note by a semitone (half step)." },
  // ── Level 2 — Note Naming ─────────────────────────────────────────────────
  { level: 2, category: "note_naming", question: "What are the lines of the treble clef, bottom to top?", options: ["E G B D F", "F A C E G", "G B D F A", "C E G B D"], correct: 0, explanation: "Every Good Boy Does Fine — E, G, B, D, F." },
  { level: 2, category: "note_naming", question: "What are the spaces of the treble clef, bottom to top?", options: ["E G B D", "F A C E", "G B D F", "A C E G"], correct: 1, explanation: "The spaces spell FACE — F, A, C, E." },
  { level: 2, category: "note_naming", question: "What note sits on the first ledger line below the treble staff?", options: ["B3", "A3", "Middle C (C4)", "D4"], correct: 2, explanation: "Middle C hangs on its own little ledger line just below the treble staff." },
  { level: 2, category: "note_naming", question: "What are the lines of the bass clef, bottom to top?", options: ["G B D F A", "F A C E G", "A C E G B", "B D F A C"], correct: 0, explanation: "Good Boys Do Fine Always — G, B, D, F, A." },
  { level: 2, category: "note_naming", question: "What are the spaces of the bass clef, bottom to top?", options: ["G B D F", "A C E G", "F A C E", "B D F A"], correct: 1, explanation: "All Cows Eat Grass — A, C, E, G." },
  { level: 2, category: "note_naming", question: "What is an enharmonic equivalent?", options: ["Two notes with the same pitch but different names", "Two notes an octave apart", "Two notes a half step apart", "Two notes that form a chord"], correct: 0, explanation: "F# and G♭ sound identical on the piano but have different written names — they are enharmonic equivalents." },
  // ── Level 2 — Rhythm ─────────────────────────────────────────────────────
  { level: 2, category: "rhythm", question: "How many beats does a dotted half note get in 4/4?", options: ["2", "2.5", "3", "4"], correct: 2, explanation: "A dot adds half the note's value. Half note = 2 beats + 1 = 3 beats." },
  { level: 2, category: "rhythm", question: "What is 3/4 time often called?", options: ["Common time", "Cut time", "Waltz time", "March time"], correct: 2, explanation: "3/4 has a ONE-two-three feel used in waltzes." },
  { level: 2, category: "rhythm", question: "How many 16th notes fit into one quarter note?", options: ["2", "4", "8", "16"], correct: 1, explanation: "16th note = ¼ of a quarter note, so 4 × 16th = 1 quarter." },
  { level: 2, category: "rhythm", question: "What does a fermata (𝄐) above a note mean?", options: ["Play it staccato", "Hold it longer than written", "Repeat this section", "Play it louder"], correct: 1, explanation: "A fermata tells the player to hold the note beyond its written duration." },
  { level: 2, category: "rhythm", question: "What is a triplet?", options: ["A chord of three notes", "Three notes played in the time of two", "A three-note scale", "A repeat three times"], correct: 1, explanation: "A triplet divides the beat into 3 equal parts instead of 2." },
  // ── Level 2 — Theory ─────────────────────────────────────────────────────
  { level: 2, category: "theory", question: "What are the notes of the C major scale?", options: ["C D E F G A B", "C D E F# G A B", "C D Eb F G A B", "C D E F G Ab B"], correct: 0, explanation: "C major is the only major scale with no sharps or flats." },
  { level: 2, category: "theory", question: "What is an interval?", options: ["The space between two staff lines", "The distance between two pitches", "A mark that increases volume", "The gap between phrases"], correct: 1, explanation: "An interval measures the distance (in half steps or scale degrees) between two notes." },
  { level: 2, category: "theory", question: "What is a triad?", options: ["A set of 2 notes", "A chord built from 3 notes", "A group of 4 musicians", "A three-beat rhythm pattern"], correct: 1, explanation: "A triad stacks three notes: the root, a third above it, and a fifth above the root." },
  { level: 2, category: "theory", question: "What makes a major chord different from a minor chord?", options: ["Major chords have 4 notes", "The 3rd is a half step higher in a major chord", "Minor chords are louder", "They use different clefs"], correct: 1, explanation: "A major chord uses a major 3rd (4 half steps); a minor chord uses a minor 3rd (3 half steps)." },
  { level: 2, category: "theory", question: "What does 'legato' mean?", options: ["Play detached and short", "Play smoothly and connected", "Play loudly", "Play slowly"], correct: 1, explanation: "Legato (Italian for 'tied') means notes should flow smoothly into each other." },
  // ── Level 2 — Sight Reading ───────────────────────────────────────────────
  { level: 2, category: "sight_reading", question: "When sight reading, you should look ahead of the note you are currently playing. How far ahead?", options: ["1 note", "One bar ahead", "As far as possible", "Only at the current note"], correct: 2, explanation: "Experienced readers scan as far ahead as possible to anticipate what is coming." },
  { level: 2, category: "sight_reading", question: "What should you do if you make a mistake while sight reading?", options: ["Stop and correct it", "Start from the beginning", "Keep going and maintain the pulse", "Pause until ready"], correct: 2, explanation: "Keeping the pulse is more important than perfection — stopping disrupts the music." },
  // ── Level 3 — Note Naming ─────────────────────────────────────────────────
  { level: 3, category: "note_naming", question: "What is the enharmonic equivalent of G♯?", options: ["F#", "Ab", "A#", "Gb"], correct: 1, explanation: "G♯ and A♭ are the same piano key — they are enharmonic equivalents." },
  { level: 3, category: "note_naming", question: "What note is a perfect 5th above C?", options: ["F", "G", "A", "E"], correct: 1, explanation: "A perfect 5th above C is G (7 half steps up)." },
  { level: 3, category: "note_naming", question: "What note is a major 3rd above E?", options: ["G", "G#", "Ab", "F#"], correct: 1, explanation: "A major 3rd = 4 half steps. E → F (1) → F# (2) → G (3) → G# (4)." },
  // ── Level 3 — Theory ─────────────────────────────────────────────────────
  { level: 3, category: "theory", question: "How many sharps are in the key of D major?", options: ["1", "2", "3", "4"], correct: 1, explanation: "D major has F# and C# — two sharps." },
  { level: 3, category: "theory", question: "What is the relative minor of C major?", options: ["G minor", "F minor", "A minor", "E minor"], correct: 2, explanation: "The relative minor shares the same key signature and starts on the 6th degree. C major's 6th is A, so it's A minor." },
  { level: 3, category: "theory", question: "What is a perfect cadence?", options: ["I → IV", "IV → I", "V → I", "I → V"], correct: 2, explanation: "A perfect (authentic) cadence moves from the dominant (V) to the tonic (I) — a strong sense of resolution." },
  { level: 3, category: "theory", question: "What does 'diminished' mean when applied to a chord?", options: ["The chord has only 2 notes", "It uses a minor 3rd and a diminished 5th", "The chord is played softly", "The chord has a major 7th"], correct: 1, explanation: "A diminished triad stacks two minor thirds: root → minor 3rd → diminished 5th." },
  { level: 3, category: "theory", question: "What is the Circle of Fifths?", options: ["A scale pattern", "A diagram showing the 12 keys arranged by intervals of a 5th", "A Trinity exam grade", "A type of arpeggiated chord"], correct: 1, explanation: "The Circle of Fifths organises all 12 major (and relative minor) keys, each a perfect 5th apart." },
  // ── Level 3 — Sight Reading ───────────────────────────────────────────────
  { level: 3, category: "sight_reading", question: "What does an 8va marking above a passage mean?", options: ["Play an octave lower", "Play an octave higher", "Play twice as fast", "Repeat the passage"], correct: 1, explanation: "8va (ottava) means play the notes an octave higher than written." },
  { level: 3, category: "sight_reading", question: "What is the difference between staccato and staccatissimo?", options: ["They are the same", "Staccatissimo is shorter and more detached", "Staccato is softer", "Staccatissimo means very loud staccato"], correct: 1, explanation: "Staccatissimo (a wedge mark) indicates an even shorter, more pointed articulation than the dot of staccato." },
];

// ─── Question selection ───────────────────────────────────────────────────────
interface GameSummary { sessions: number; bestAcc: number | null; avgAccuracy: number | null }

function pickQuestions(foundationPct: number, games: Record<string, GameSummary>): Q[] {
  const level: 1 | 2 | 3 = foundationPct >= 66 ? 3 : foundationPct >= 33 ? 2 : 1;

  // Weight categories toward weak areas (avg accuracy < 70 = weak)
  const weak = (key: string) => {
    const g = games[key];
    return g && g.sessions > 0 && (g.avgAccuracy ?? 100) < 70;
  };

  const categoryWeights: Record<Category, number> = {
    note_naming:   weak("note_naming")   ? 3 : 1,
    rhythm:        weak("rhythm_quiz")   ? 3 : 1,
    sight_reading: weak("sight_reading") ? 3 : 1,
    piano:         weak("piano_hero")    ? 2 : 1,
    theory:        2, // always present as a baseline
  };

  // Pool: questions at or below the student's level
  const pool = BANK.filter((q) => q.level <= level);

  // Weighted shuffle
  const weighted: Q[] = [];
  pool.forEach((q) => {
    const w = categoryWeights[q.category] || 1;
    for (let i = 0; i < w; i++) weighted.push(q);
  });

  // Fisher-Yates shuffle on the weighted pool
  for (let i = weighted.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [weighted[i], weighted[j]] = [weighted[j], weighted[i]];
  }

  // De-duplicate by question text — take first 10
  const seen = new Set<string>();
  const selected: Q[] = [];
  for (const q of weighted) {
    if (seen.has(q.question)) continue;
    seen.add(q.question);
    selected.push(q);
    if (selected.length === 10) break;
  }
  return selected;
}

// ─── Component ────────────────────────────────────────────────────────────────
const GRADE_COLORS: Record<string, string> = {
  S: "#39D98A", A: "#00D4FF", B: "#A855F7", C: "#F59E0B", D: "#FF6B35", F: "#EF4444",
};

const DailyReviewQuiz = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation() as { state: { foundationPct?: number; games?: Record<string, GameSummary>; name?: string } | null };

  const foundationPct = state?.foundationPct ?? 0;
  const games = state?.games ?? {};
  const studentName = state?.name ?? "Student";

  const questions = useMemo(() => pickQuestions(foundationPct, games), []);

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const q = questions[current];
  const chosen = answers[current];
  const totalCorrect = questions.filter((q, i) => answers[i] === q.correct).length;
  const pct = Math.round((totalCorrect / questions.length) * 100);
  const grade = pct >= 95 ? "S" : pct >= 85 ? "A" : pct >= 70 ? "B" : pct >= 55 ? "C" : pct >= 40 ? "D" : "F";

  const selectAnswer = (idx: number) => {
    if (revealed) return;
    setAnswers((prev) => ({ ...prev, [current]: idx }));
    setRevealed(true);
  };

  const next = async () => {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      setRevealed(false);
    } else {
      setDone(true);
      if (user) {
        setSaving(true);
        await (supabase as any).from("game_scores").insert({
          user_id: user.id,
          game: "daily_review",
          score: totalCorrect * 100,
          correct: totalCorrect,
          total: questions.length,
          best_streak: 0,
        });
        setSaving(false);
      }
    }
  };

  // ── Results ────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-full flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6 text-center">
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-2" style={{ fontFamily: "'DM Mono',monospace" }}>
              Daily Review Complete
            </p>
            <div
              className="text-7xl font-black mb-1"
              style={{ fontFamily: "'Orbitron',monospace", color: GRADE_COLORS[grade], textShadow: `0 0 40px ${GRADE_COLORS[grade]}80` }}
            >
              {grade}
            </div>
            <p className="text-2xl font-bold text-white">{totalCorrect} / {questions.length} correct</p>
            <p className="text-sm text-muted-foreground mt-1">{pct}% accuracy</p>
          </div>

          {/* Per-question recap */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            {questions.map((q, i) => {
              const correct = answers[i] === q.correct;
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 text-left"
                  style={{ borderBottom: i < questions.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", background: correct ? "rgba(57,217,138,0.06)" : "rgba(239,68,68,0.06)" }}
                >
                  {correct ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{q.question}</p>
                    {!correct && (
                      <p className="text-xs text-green-400 mt-0.5">✓ {q.options[q.correct]}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 gap-2" onClick={() => navigate(-1)}>
              Back to Dashboard
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={() => { setCurrent(0); setAnswers({}); setRevealed(false); setDone(false); }}
              style={{ background: "linear-gradient(135deg,#FF2D78,#A855F7)", border: "none" }}
            >
              <RotateCcw className="w-4 h-4" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Quiz ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full flex flex-col p-6 max-w-xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase" style={{ fontFamily: "'DM Mono',monospace" }}>
            Daily Review · {studentName}
          </p>
          <span className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono',monospace" }}>
            {current + 1} / {questions.length}
          </span>
        </div>
        <Progress value={((current + (revealed ? 1 : 0)) / questions.length) * 100} className="h-1.5" />
      </div>

      {/* Question card */}
      <div
        className="flex-1 rounded-2xl p-6 mb-6 flex flex-col justify-between"
        style={{ background: "linear-gradient(145deg,#151228,#0f0d1a)", border: "1px solid rgba(255,45,120,0.15)" }}
      >
        <div className="space-y-1 mb-6">
          <span
            className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(255,45,120,0.12)",
              color: "#FF2D78",
              fontFamily: "'DM Mono',monospace",
            }}
          >
            {q.category.replace("_", " ")}
          </span>
          <p className="text-lg font-bold text-white mt-2 leading-snug" style={{ fontFamily: "'Inter',sans-serif" }}>
            {q.question}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {q.options.map((opt, i) => {
            const isChosen = chosen === i;
            const isCorrect = i === q.correct;
            let bg = "rgba(255,255,255,0.04)";
            let border = "rgba(255,255,255,0.08)";
            let textColor = "var(--off-white, #E8ECF0)";
            if (revealed) {
              if (isCorrect) { bg = "rgba(57,217,138,0.15)"; border = "rgba(57,217,138,0.5)"; textColor = "#39D98A"; }
              else if (isChosen) { bg = "rgba(239,68,68,0.15)"; border = "rgba(239,68,68,0.5)"; textColor = "#EF4444"; }
            } else if (isChosen) {
              bg = "rgba(255,45,120,0.15)"; border = "rgba(255,45,120,0.5)"; textColor = "#FF2D78";
            }

            return (
              <button
                key={i}
                onClick={() => selectAnswer(i)}
                disabled={revealed}
                className="w-full text-left rounded-xl px-4 py-3 transition-all flex items-center gap-3"
                style={{ background: bg, border: `1px solid ${border}`, color: textColor, cursor: revealed ? "default" : "pointer" }}
              >
                <span
                  className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                  style={{ background: revealed && isCorrect ? "rgba(57,217,138,0.3)" : revealed && isChosen ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)" }}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-sm font-medium">{opt}</span>
                {revealed && isCorrect && <CheckCircle2 className="w-4 h-4 ml-auto flex-shrink-0" />}
                {revealed && isChosen && !isCorrect && <XCircle className="w-4 h-4 ml-auto flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {revealed && q.explanation && (
          <div
            className="mt-4 rounded-xl px-4 py-3 text-sm"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#a0aec0" }}
          >
            💡 {q.explanation}
          </div>
        )}
      </div>

      {/* Next button */}
      {revealed && (
        <Button
          onClick={next}
          className="w-full py-5 text-base font-bold gap-2"
          style={{ background: "linear-gradient(135deg,#FF2D78,#A855F7)", border: "none", fontFamily: "'Orbitron',monospace", letterSpacing: "0.06em" }}
        >
          {current < questions.length - 1 ? (
            <>Next <ArrowRight className="w-4 h-4" /></>
          ) : (
            <><Trophy className="w-4 h-4" /> See Results</>
          )}
        </Button>
      )}
    </div>
  );
};

export default DailyReviewQuiz;
