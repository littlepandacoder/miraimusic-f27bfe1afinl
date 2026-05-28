import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ChevronRight, Check, Music, Target, Clock, Sparkles } from "lucide-react";

interface OnboardingWizardProps {
  onComplete: () => void;
}

const SKILL_LEVELS = [
  { id: "beginner",     label: "Complete Beginner",    emoji: "🌱", desc: "Never played before" },
  { id: "some",        label: "Some Experience",       emoji: "🎹", desc: "Know a few notes or chords" },
  { id: "intermediate",label: "Intermediate",          emoji: "🎵", desc: "Can play simple songs" },
  { id: "advanced",    label: "Advanced",              emoji: "🏆", desc: "Comfortable with complex pieces" },
];

const GOALS = [
  { id: "songs",    label: "Play my favourite songs" },
  { id: "theory",   label: "Understand music theory" },
  { id: "technique",label: "Improve my technique" },
  { id: "teach",    label: "Teach students" },
  { id: "fun",      label: "Just for fun" },
  { id: "exams",    label: "Prepare for exams" },
];

const PRACTICE_TIMES = [
  { id: "15min", label: "~15 minutes",  desc: "Short daily sessions" },
  { id: "30min", label: "~30 minutes",  desc: "Consistent practice" },
  { id: "1hr",   label: "~1 hour",     desc: "Serious student" },
  { id: "2hr+",  label: "2+ hours",    desc: "Dedicated musician" },
];

const FOCUS_AREAS = [
  { id: "foundation", label: "Foundation Lessons",   emoji: "📚", desc: "Structured beginner curriculum" },
  { id: "games",     label: "Theory Games",          emoji: "🎮", desc: "Note naming, rhythm, key sigs" },
  { id: "sight",     label: "Sight Reading",         emoji: "👁️", desc: "Read sheet music fluently" },
  { id: "hero",      label: "Piano Hero",            emoji: "🎸", desc: "Play songs with others live" },
];

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [skillLevel, setSkillLevel] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [practiceTime, setPracticeTime] = useState("");
  const [focusArea, setFocusArea] = useState("");
  const [aiPath, setAiPath] = useState("");
  const [generatingPath, setGeneratingPath] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalSteps = 5;
  const progress = ((step) / totalSteps) * 100;

  const toggleGoal = (id: string) => {
    setGoals(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const generatePath = async () => {
    setGeneratingPath(true);
    try {
      const context = `Student profile: ${skillLevel} level. Goals: ${goals.join(", ")}. Practice time: ${practiceTime}/day. Focus: ${focusArea}.`;
      const { data } = await supabase.functions.invoke("ai-coach", {
        body: {
          messages: [{
            role: "user",
            content: `Based on this student profile, write a 3-sentence personalised learning path for them. Be specific and motivating. Profile: ${context}`,
          }],
          userContext: { skillLevel, goals, practiceTime, focusArea },
        },
      });
      setAiPath(data?.reply ?? "You're all set! Your dashboard is personalised and ready.");
    } catch {
      setAiPath("You're all set! Your personalised dashboard is ready — let's start your journey.");
    } finally {
      setGeneratingPath(false);
    }
  };

  const handleNext = async () => {
    if (step === 3) {
      // Moving to step 4 (AI path) — generate now
      setStep(4);
      await generatePath();
      return;
    }
    setStep(s => s + 1);
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await (supabase as any).from("user_onboarding").upsert({
        user_id: user.id,
        skill_level: skillLevel,
        goals,
        practice_time: practiceTime,
        focus_area: focusArea,
        ai_path: aiPath,
        completed_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("[onboarding] save failed (non-blocking):", e);
    } finally {
      setSaving(false);
      onComplete();
    }
  };

  const canNext = () => {
    if (step === 0) return true;
    if (step === 1) return !!skillLevel;
    if (step === 2) return goals.length > 0;
    if (step === 3) return !!practiceTime && !!focusArea;
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-xl">

        {/* Progress bar */}
        {step > 0 && (
          <div className="mb-6">
            <div className="flex justify-between text-xs text-muted-foreground mb-2 font-mono">
              <span>Step {step} of {totalSteps - 1}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-pink-400 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-8">

          {/* ── Step 0: Welcome ── */}
          {step === 0 && (
            <div className="text-center space-y-5">
              <div className="text-5xl">🎹</div>
              <div>
                <h1 className="text-2xl font-bold mb-2">Welcome to Musicable</h1>
                <p className="text-muted-foreground">
                  Let's set up your personalised learning experience. Takes about 60 seconds.
                </p>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground text-left max-w-xs mx-auto">
                {["Personalised learning path from Claude AI", "Dashboard configured for your goals", "No generic content — everything tailored"].map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <Check size={14} className="text-green-500 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStep(1)}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                Let's go <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* ── Step 1: Skill level ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Music size={16} className="text-primary" />
                </div>
                <h2 className="text-lg font-bold">What's your current level?</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {SKILL_LEVELS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSkillLevel(s.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      skillLevel === s.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-white/30"
                    }`}
                  >
                    <div className="text-2xl mb-1">{s.emoji}</div>
                    <div className="font-semibold text-sm">{s.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Goals ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Target size={16} className="text-primary" />
                </div>
                <h2 className="text-lg font-bold">What do you want to achieve?</h2>
              </div>
              <p className="text-sm text-muted-foreground -mt-2">Select all that apply.</p>
              <div className="flex flex-wrap gap-2">
                {GOALS.map(g => (
                  <button
                    key={g.id}
                    onClick={() => toggleGoal(g.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${
                      goals.includes(g.id)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:border-white/30 text-muted-foreground"
                    }`}
                  >
                    {goals.includes(g.id) && <Check size={12} className="inline mr-1.5" />}
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3: Time + Focus ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Clock size={16} className="text-primary" />
                </div>
                <h2 className="text-lg font-bold">How do you want to practise?</h2>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Daily practice time</p>
                <div className="grid grid-cols-2 gap-2">
                  {PRACTICE_TIMES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setPracticeTime(t.id)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        practiceTime === t.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-white/30"
                      }`}
                    >
                      <div className="font-semibold text-sm">{t.label}</div>
                      <div className="text-xs text-muted-foreground">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Where do you want to start?</p>
                <div className="grid grid-cols-2 gap-2">
                  {FOCUS_AREAS.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFocusArea(f.id)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        focusArea === f.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-white/30"
                      }`}
                    >
                      <div className="text-lg mb-0.5">{f.emoji}</div>
                      <div className="font-semibold text-sm">{f.label}</div>
                      <div className="text-xs text-muted-foreground">{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: AI path ── */}
          {step === 4 && (
            <div className="space-y-5 text-center">
              <div className="flex items-center gap-3 justify-center mb-1">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Sparkles size={16} className="text-primary" />
                </div>
                <h2 className="text-lg font-bold">Your personalised path</h2>
              </div>

              {generatingPath ? (
                <div className="py-8 space-y-3">
                  <Loader2 size={32} className="animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">Melody is building your learning plan…</p>
                </div>
              ) : (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 text-left">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-lg">🎵</div>
                    <span className="text-sm font-semibold text-primary">From Melody, your AI coach</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{aiPath}</p>
                </div>
              )}

              {!generatingPath && (
                <div className="text-xs text-muted-foreground">
                  Your dashboard is now personalised. You can ask Melody anything at any time using the chat button.
                </div>
              )}
            </div>
          )}

          {/* ── Navigation buttons ── */}
          {step > 0 && step < 4 && (
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(s => s - 1)}
                className="px-5 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-white/30 transition-all"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!canNext()}
                className="flex-1 h-10 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                Continue <ChevronRight size={16} />
              </button>
            </div>
          )}

          {step === 4 && !generatingPath && (
            <button
              onClick={handleFinish}
              disabled={saving}
              className="w-full h-12 mt-6 bg-gradient-to-r from-primary to-pink-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-90"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <>
                Let's start playing <span className="text-lg">🎹</span>
              </>}
            </button>
          )}

        </div>
      </div>
    </div>
  );
}
