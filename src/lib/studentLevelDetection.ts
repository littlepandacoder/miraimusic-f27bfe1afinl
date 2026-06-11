import { supabase } from "@/integrations/supabase/client";
import { MusicTheoryLevel } from "./musicTheoryQuestions";

export interface StudentData {
  id: string;
  email: string;
  full_name: string;
  current_level: MusicTheoryLevel;
  lessons_completed: number;
  grade: string;
  experience_level?: string;
}

/**
 * Determine student's music theory level based on their profile
 */
export async function detectStudentLevel(userId: string): Promise<StudentData> {
  // Fetch student profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    throw new Error("Could not fetch student profile");
  }

  // Fetch lesson progress
  const { data: lessons, error: lessonsError } = await supabase
    .from("foundation_lessons")
    .select("id")
    .eq("student_id", userId)
    .eq("completed", true);

  const lessonsCompleted = lessons?.length || 0;

  // Determine level based on lessons completed and metadata
  let currentLevel: MusicTheoryLevel = "Level 1";

  // Check if custom level is stored in metadata
  if (profile.metadata?.music_theory_level) {
    currentLevel = profile.metadata.music_theory_level as MusicTheoryLevel;
  } else {
    // Auto-detect based on lessons completed
    if (lessonsCompleted >= 80) {
      currentLevel = "Grade 4";
    } else if (lessonsCompleted >= 60) {
      currentLevel = "Grade 3";
    } else if (lessonsCompleted >= 40) {
      currentLevel = "Grade 2";
    } else if (lessonsCompleted >= 20) {
      currentLevel = "Grade 1";
    } else if (lessonsCompleted >= 10) {
      currentLevel = "Level 2";
    } else {
      currentLevel = "Level 1";
    }
  }

  return {
    id: userId,
    email: profile.email,
    full_name: profile.full_name || "Student",
    current_level: currentLevel,
    lessons_completed: lessonsCompleted,
    grade: profile.metadata?.grade || "Unknown",
    experience_level: profile.metadata?.experience_level || "beginner",
  };
}

/**
 * Update student's music theory level
 */
export async function updateStudentLevel(userId: string, level: MusicTheoryLevel): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      metadata: {
        music_theory_level: level,
      },
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`Failed to update student level: ${error.message}`);
  }
}

/**
 * Save quiz results
 */
export async function saveQuizResult(
  userId: string,
  level: MusicTheoryLevel,
  score: number,
  totalQuestions: number
): Promise<void> {
  const timestamp = new Date().toISOString();

  const { error } = await supabase.from("music_theory_quiz_results").insert({
    user_id: userId,
    level: level,
    score: score,
    total_questions: totalQuestions,
    percentage: Math.round((score / totalQuestions) * 100),
    completed_at: timestamp,
  });

  if (error) {
    console.error("Failed to save quiz result:", error);
  }
}

/**
 * Check if student needs to take a quiz (e.g., hasn't taken one today)
 */
export async function shouldShowQuiz(userId: string): Promise<boolean> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("music_theory_quiz_results")
    .select("completed_at")
    .eq("user_id", userId)
    .gte("completed_at", `${today}T00:00:00`)
    .order("completed_at", { ascending: false })
    .limit(1);

  // If no error and data exists, they've already taken a quiz today
  if (!error && data && data.length > 0) {
    return false;
  }

  return true;
}

/**
 * Get student's quiz statistics
 */
export async function getQuizStats(userId: string): Promise<{
  totalAttempts: number;
  averageScore: number;
  bestScore: number;
  lastQuizDate: string | null;
}> {
  const { data, error } = await supabase
    .from("music_theory_quiz_results")
    .select("percentage, completed_at")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false });

  if (error || !data || data.length === 0) {
    return {
      totalAttempts: 0,
      averageScore: 0,
      bestScore: 0,
      lastQuizDate: null,
    };
  }

  const percentages = data.map((d) => d.percentage);
  const averageScore = Math.round(
    percentages.reduce((a, b) => a + b, 0) / percentages.length
  );
  const bestScore = Math.max(...percentages);
  const lastQuizDate = data[0].completed_at;

  return {
    totalAttempts: data.length,
    averageScore,
    bestScore,
    lastQuizDate,
  };
}
