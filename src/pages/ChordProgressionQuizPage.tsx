import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ChordProgressionSelector from "@/components/chordProgression/ChordProgressionSelector";
import ChordProgressionQuiz from "@/components/chordProgression/ChordProgressionQuiz";
import { ChordProgression } from "@/lib/chordProgressionData";

const ChordProgressionQuizPage = () => {
  const { user, loading, hasRole } = useAuth();
  const navigate = useNavigate();
  const [selectedProgression, setSelectedProgression] = useState<ChordProgression | null>(null);

  if (loading || !user) {
    return null;
  }

  if (!hasRole("student") && !hasRole("teacher")) {
    return (
      <DashboardLayout title="Chord Progression Quiz" role={hasRole("student") ? "student" : "teacher"}>
        <div className="text-center">Access denied</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Chord Progression Quiz" role={hasRole("student") ? "student" : "teacher"}>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden px-4 py-4 border-b border-border flex items-center gap-3">
          <button
            onClick={() => {
              if (selectedProgression) {
                setSelectedProgression(null);
              } else {
                navigate("/dashboard");
              }
            }}
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">
            {selectedProgression ? selectedProgression.name : "Chord Progressions"}
          </h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!selectedProgression ? (
            <ChordProgressionSelector onSelectProgression={setSelectedProgression} />
          ) : (
            <ChordProgressionQuiz
              progression={selectedProgression}
              userId={user.id}
              onBack={() => setSelectedProgression(null)}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ChordProgressionQuizPage;
