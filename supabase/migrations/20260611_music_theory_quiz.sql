-- Create music theory quiz results table
CREATE TABLE IF NOT EXISTS public.music_theory_quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level VARCHAR(50) NOT NULL, -- Level 1, Level 2, Grade 1, Grade 2, Grade 3, Grade 4
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON public.music_theory_quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_completed_at ON public.music_theory_quiz_results(completed_at);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_date ON public.music_theory_quiz_results(user_id, completed_at DESC);

-- Enable RLS
ALTER TABLE public.music_theory_quiz_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "users_can_view_own_quiz_results" ON public.music_theory_quiz_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_quiz_results" ON public.music_theory_quiz_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admins_can_view_all_quiz_results" ON public.music_theory_quiz_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
