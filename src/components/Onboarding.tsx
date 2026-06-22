import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { updateSignupData } from "@/lib/firestore";


type Step = "goals" | "skillLevel" | "topics" | "genres" | "trial";

interface OnboardingData {
  email: string;
  goals: string[];
  skillLevel: string;
  topics: string[];
  genres: string[];
}

interface OnboardingProps {
  email: string;
  docId: string;
  onComplete?: (data: OnboardingData) => void;
}

const Onboarding = ({ email, docId, onComplete }: OnboardingProps) => {
  const [step, setStep] = useState<Step>("goals");
  const [data, setData] = useState<OnboardingData>({
    email,
    goals: [],
    skillLevel: "",
    topics: [],
    genres: [],
  });

  const goals = [
    "Learn as many songs as possible",
    "Stick to a consistent practice routine",
    "Learn piano theory",
    "Improve piano technique",
    "Explore techniques, genres, and styles",
  ];

  const skillLevels = [
    {
      label: "New",
      description: "I'm just starting out on the piano. Show me the basics first!",
    },
    {
      label: "Beginner",
      description: "I'm familiar with the keyboard layout and can play a few chords and scales.",
    },
    {
      label: "Intermediate",
      description: "I can play some songs and understand basic theory concepts.",
    },
    {
      label: "Advanced",
      description: "I can play many songs in multiple styles from start to finish.",
    },
    {
      label: "Expert",
      description: "I'm confident playing the piano and can learn and play most songs easily.",
    },
  ];

  const topics = [
    "Hand Independence",
    "Technique",
    "Sight Reading",
    "Creativity",
    "Performance",
    "Scales",
    "Exercises",
    "Improvisation",
    "Chording",
    "Intervals",
    "Practice",
    "Speed",
    "I'm unsure",
  ];

  const genres = [
    "Classical",
    "Rock",
    "Pop",
    "Jazz",
    "Blues",
    "Country",
    "Metal",
    "Funk",
    "Soul",
    "Christian",
    "Hip-Hop/Rap",
  ];

  const handleGoalToggle = (goal: string) => {
    setData({
      ...data,
      goals: data.goals.includes(goal)
        ? data.goals.filter((g) => g !== goal)
        : [...data.goals, goal],
    });
  };

  const handleTopicToggle = (topic: string) => {
    setData({
      ...data,
      topics: data.topics.includes(topic)
        ? data.topics.filter((t) => t !== topic)
        : [...data.topics, topic],
    });
  };

  const handleGenreToggle = (genre: string) => {
    setData({
      ...data,
      genres: data.genres.includes(genre)
        ? data.genres.filter((g) => g !== genre)
        : [...data.genres, genre],
    });
  };

  const getProgress = () => {
    switch (step) {
      case "goals":
        return 20;
      case "skillLevel":
        return 40;
      case "topics":
        return 60;
      case "genres":
        return 80;
      case "trial":
        return 100;
      default:
        return 0;
    }
  };

  const canProceed = () => {
    switch (step) {
      case "goals":
        return data.goals.length > 0;
      case "skillLevel":
        return data.skillLevel !== "";
      case "topics":
        return data.topics.length > 0;
      case "genres":
        return data.genres.length > 0;
      case "trial":
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) return;

    const steps: Step[] = ["goals", "skillLevel", "topics", "genres", "trial"];
    const currentIndex = steps.indexOf(step);

    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handleNext_Old = async () => {
    if (!canProceed()) return;

    const steps: Step[] = ["goals", "skillLevel", "topics", "genres", "trial"];
    const currentIndex = steps.indexOf(step);

    if (step === "genres" && currentIndex === steps.indexOf("genres")) {
      // Save to Firestore before moving to trial
      try {
        await updateSignupData(docId, data);
      } catch (err) {
        console.error("Error updating signup data:", err);
      }
    }

    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: Step[] = ["goals", "skillLevel", "topics", "genres"];
    const currentIndex = steps.indexOf(step);

    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy/50 to-background">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-background/30 z-40">
        <div
          className="h-full bg-gradient-to-r from-pink to-pink/60 transition-all duration-300"
          style={{ width: `${getProgress()}%` }}
        />
      </div>

      <div className="pt-8 pb-20">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Header */}
          {step !== "trial" && (
            <div className="mb-12">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
              >
                <ArrowLeft size={20} />
                Back
              </button>
              <h1 className="text-4xl md:text-5xl font-black text-foreground mb-3">
                {step === "goals" && "What are your goals?"}
                {step === "skillLevel" && "What's your skill level?"}
                {step === "topics" && "What topics do you want to learn?"}
                {step === "genres" && "What kinds of songs are you into these days?"}
              </h1>
              <p className="text-lg text-muted-foreground">
                {step === "goals" &&
                  "Knowing your \"why\" helps you stay motivated and on track."}
                {step === "skillLevel" &&
                  "This helps us recommend the right lessons for you."}
                {step === "topics" &&
                  "This helps us find your perfect lessons. Choose as many as you like."}
                {step === "genres" &&
                  "You'll find more than 900+ popular songs from all genres inside Musicable. Choose your favorites so we can help you learn them!"}
              </p>
            </div>
          )}

          {/* Content */}
          {step === "goals" && (
            <div className="space-y-3 mb-8">
              {goals.map((goal) => (
                <button
                  key={goal}
                  onClick={() => handleGoalToggle(goal)}
                  className={`w-full p-4 text-left rounded-xl border-2 transition-all font-semibold text-lg ${
                    data.goals.includes(goal)
                      ? "bg-pink/20 border-pink text-foreground"
                      : "bg-card/50 border-border/30 text-foreground hover:border-pink/50"
                  }`}
                >
                  {goal}
                </button>
              ))}
            </div>
          )}

          {step === "skillLevel" && (
            <div className="space-y-3 mb-8">
              {skillLevels.map((level) => (
                <button
                  key={level.label}
                  onClick={() => setData({ ...data, skillLevel: level.label })}
                  className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                    data.skillLevel === level.label
                      ? "bg-pink/20 border-pink"
                      : "bg-card/50 border-border/30 hover:border-pink/50"
                  }`}
                >
                  <h3 className="font-bold text-lg text-foreground mb-1">
                    {level.label}
                  </h3>
                  <p className="text-sm text-muted-foreground">{level.description}</p>
                </button>
              ))}
            </div>
          )}

          {step === "topics" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {topics.map((topic) => (
                <button
                  key={topic}
                  onClick={() => handleTopicToggle(topic)}
                  className={`p-3 rounded-xl border-2 font-semibold transition-all text-center ${
                    data.topics.includes(topic)
                      ? "bg-pink/20 border-pink text-foreground"
                      : "bg-card/50 border-border/30 text-foreground hover:border-pink/50"
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          )}

          {step === "genres" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {genres.map((genre) => (
                <button
                  key={genre}
                  onClick={() => handleGenreToggle(genre)}
                  className={`p-3 rounded-xl border-2 font-semibold transition-all text-center ${
                    data.genres.includes(genre)
                      ? "bg-pink/20 border-pink text-foreground"
                      : "bg-card/50 border-border/30 text-foreground hover:border-pink/50"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          )}

          {step === "trial" && (
            <div className="text-center space-y-8">
              <div className="space-y-4">
                <CheckCircle2 className="w-16 h-16 text-pink mx-auto" />
                <h2 className="text-4xl font-black text-foreground">
                  You're All Set!
                </h2>
                <p className="text-lg text-muted-foreground max-w-lg mx-auto">
                  Great! We've got a personalized learning path ready for you. Now let's get you started.
                </p>
              </div>

              {/* Trial Info */}
              <div className="bg-card/50 border border-pink/30 rounded-2xl p-8 space-y-6">
                <div>
                  <h3 className="text-3xl font-black text-pink mb-2">
                    $17/month
                  </h3>
                  <p className="text-foreground font-semibold">
                    Cancel anytime.
                  </p>
                </div>

                <div className="space-y-3 text-left">
                  <div className="flex items-start gap-3">
                    <span className="text-pink font-bold text-xl mt-1">✓</span>
                    <div>
                      <p className="font-bold text-foreground">
                        Unlimited piano lessons.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-pink font-bold text-xl mt-1">✓</span>
                    <div>
                      <p className="font-bold text-foreground">
                        900+ popular songs.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-pink font-bold text-xl mt-1">✓</span>
                    <div>
                      <p className="font-bold text-foreground">
                        Unlimited personal support.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-pink font-bold text-xl mt-1">✓</span>
                    <div>
                      <p className="font-bold text-foreground">
                        Join a community of 101,921 students.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground border-t border-border/30 pt-4">
                  $17/month, charged today. Cancel anytime from your account.
                </div>
              </div>

              {onComplete && (
                <Button
                  onClick={async () => {
                    try {
                      // Save all onboarding data to Firestore
                      await updateSignupData(docId, data);
                      onComplete(data);
                    } catch (err) {
                      console.error("Error saving onboarding data:", err);
                    }
                  }}
                  className="w-full bg-pink hover:bg-pink/90 text-background font-bold py-6 text-lg rounded-full"
                >
                  CONTINUE TO BILLING
                </Button>
              )}
            </div>
          )}

          {/* Footer Actions */}
          {step !== "trial" && (
            <div className="flex gap-3 justify-end">
              {step !== "goals" && (
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="px-8 py-6 font-bold"
                >
                  BACK
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="px-8 py-6 font-bold bg-pink hover:bg-pink/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                NEXT
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
