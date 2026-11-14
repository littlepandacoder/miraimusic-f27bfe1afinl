/**
 * sheet-music-coach — on-demand coaching note for a student's sheet music practice.
 *
 * Reads the signed-in student's finished sessions for one song (row-level security limits
 * this to their own rows), works out the numbers, and asks OpenAI for a short coaching note.
 *
 * Request:  POST { song_key: string }   with the student's access token (verify_jwt is on)
 * Response: { reply: string } or { error: string }
 *
 * Required Supabase secrets: OPENAI_API_KEY (already set for ai-coach).
 * SUPABASE_URL and SUPABASE_ANON_KEY are provided by the platform.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COACH_PROMPT = `You are Melody, Musicable's friendly piano coach. You are given numbers from a student's sheet music practice sessions.

Write a short coaching note for the student:
- 3 to 4 sentences, warm and encouraging, never harsh.
- Mention one thing that improved (if the numbers show it) and one specific thing to work on.
- Use the numbers you are given. Do not invent bars, notes or percentages.
- End with one concrete practice tip for their next session.`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const fmt = (v: number | null) => (v == null ? "n/a" : `${Math.round(v)}%`);

// Builds a plain-text summary of the sessions for the model. Rows are newest first.
function describeSessions(title: string, rows: any[]): string {
  const lines: string[] = [];
  lines.push(`Song: ${title}`);
  lines.push(`Finished sessions: ${rows.length}`);

  for (const mode of ["wait", "sync"] as const) {
    const of = rows.filter((r) => r.mode === mode);
    if (!of.length) continue;
    const scores = of.map((r) => Number(r.score)); // newest first
    const half = Math.floor(scores.length / 2);
    const label = mode === "wait" ? "Wait-for-note mode (score = notes right first time)" : "Sync mode (score = pitch and rhythm)";
    lines.push(`\n${label}:`);
    lines.push(`- plays: ${of.length}, average ${fmt(avg(scores))}, best ${fmt(Math.max(...scores))}, latest ${fmt(scores[0])}`);
    if (of.length >= 4) {
      const newer = avg(scores.slice(0, half));
      const older = avg(scores.slice(half));
      lines.push(`- trend: earlier plays averaged ${fmt(older)}, recent plays averaged ${fmt(newer)}`);
    }
    if (mode === "wait") {
      const wrong = avg(of.map((r) => Number(r.wrong_presses ?? 0)));
      lines.push(`- wrong key presses per session: ${wrong == null ? "n/a" : wrong.toFixed(1)}`);
      // Bars where mistakes happened most often, across the wait-mode sessions.
      const byBar = new Map<number, number>();
      for (const r of of) {
        const mistakes = r.analysis?.mistakes ?? [];
        for (const m of mistakes) byBar.set(m.bar, (byBar.get(m.bar) ?? 0) + 1);
      }
      const top = [...byBar.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
      if (top.length) lines.push(`- bars with the most mistakes: ${top.map(([bar, n]) => `bar ${bar} (${n} sessions)`).join(", ")}`);
    }
    if (mode === "sync") {
      const late = of.reduce((s, r) => s + Number(r.late_count ?? 0), 0);
      const early = of.reduce((s, r) => s + Number(r.early_count ?? 0), 0);
      const onTime = of.reduce((s, r) => s + Number(r.on_time_count ?? 0), 0);
      lines.push(`- timing across all sessions: ${onTime} on time, ${late} late, ${early} early`);
      lines.push(`- average pitch accuracy ${fmt(avg(of.map((r) => Number(r.pitch_accuracy ?? NaN)).filter(Number.isFinite)))}, rhythm accuracy ${fmt(avg(of.map((r) => Number(r.rhythm_accuracy ?? NaN)).filter(Number.isFinite)))}`);
    }
  }
  return lines.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { song_key } = await req.json();
    if (!song_key || typeof song_key !== "string") throw new Error("song_key is required");

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

    // Query as the student: row-level security returns only their own sessions.
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: rows, error } = await sb
      .from("sheet_music_sessions")
      .select("song_title, mode, score, pitch_accuracy, rhythm_accuracy, wrong_presses, late_count, early_count, on_time_count, analysis, created_at")
      .eq("song_key", song_key)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return json({ reply: "Finish this song once and I'll have something to say about it." });

    const facts = describeSessions(rows[0].song_title, rows);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 300,
        messages: [
          { role: "system", content: COACH_PROMPT },
          { role: "user", content: facts },
        ],
      }),
    });
    if (!response.ok) throw new Error(`OpenAI API error: ${await response.text()}`);
    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? "";
    return json({ reply });
  } catch (err: any) {
    console.error("[sheet-music-coach]", err.message);
    return json({ error: err.message }, 500);
  }
});
