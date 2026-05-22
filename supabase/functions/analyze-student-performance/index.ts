import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentName, gameStats, quizStats, sessionStats } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const gameLines = (gameStats as any[]).length > 0
      ? (gameStats as any[]).map((g: any) =>
          `${g.game}: ${g.sessions} session(s), avg accuracy ${g.avgAccuracy ?? "—"}%, best accuracy ${g.bestAccuracy ?? "—"}%, best streak ${g.bestStreak}`
        ).join("\n")
      : "No game sessions recorded yet";

    const quizLines = [
      `Total quiz attempts: ${quizStats.total}`,
      `Pass rate: ${quizStats.passRate ?? "—"}%`,
      `Average accuracy: ${quizStats.avgAccuracy ?? "—"}%`,
      `Daily Review sessions: ${quizStats.dailyReviewSessions}`,
      `Daily Review avg accuracy: ${quizStats.avgDailyAccuracy ?? "—"}%`,
    ].join("\n");

    const systemPrompt =
      `You are an expert piano and music theory educator. Analyse a student's performance data and write a clear, encouraging, actionable coaching note.

Rules:
- Write in plain prose paragraphs — no markdown, no bullet symbols, no asterisks, no headings with #.
- Structure: (1) brief overall summary, (2) 2-3 specific strengths, (3) 2-3 specific areas to improve with concrete practice tips.
- Reference the actual games and accuracy numbers provided.
- Keep the total response under 350 words.
- Address the student directly (use "you" / "your").`;

    const userPrompt =
      `Student name: ${studentName}

Game performance:
${gameLines}

Quiz performance:
${quizLines}

Session activity:
Total login sessions: ${sessionStats.totalLogins}
Total time spent: ${sessionStats.totalTime}

Write the coaching note now.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content ?? "";

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("analyze-student-performance error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate analysis" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
