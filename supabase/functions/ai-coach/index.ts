/**
 * ai-coach — Musicable's ChatGPT-powered practice coach (Melody)
 *
 * Accepts a conversation history + user context and returns
 * a ChatGPT response via OpenAI API.
 *
 * Required Supabase secrets:
 *   OPENAI_API_KEY  — your OpenAI API key (sk-proj-…)
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Melody 🎵, Musicable's friendly AI practice coach. You're warm, encouraging, and genuinely excited about helping people learn piano.

Your personality: enthusiastic but concise. You celebrate small wins. You never lecture. You close every reply with a question or an action to keep momentum.

MUSICABLE FEATURES (reference these when relevant):
• Piano Hero — real-time multiplayer piano room. Play songs together with other students.
• Note Naming Game — identify musical notes by ear and on the treble/bass clef.
• Sight Reading — practise reading sheet music with instant feedback.
• Rhythm Quiz — 4 game modes (Build the Measure, Guess the Time Sig, Note Beat Values, Tap the Rhythm).
• Key Signature Quiz — identify major key signatures on the staff. Circle of 5ths included.
• Scale Builder — construct major scales by adding the correct sharps and flats.
• Foundation Lessons — structured curriculum from absolute beginner to intermediate.
• Daily Review Quiz — spaced repetition to lock in theory knowledge.
• Lesson Booking — schedule 1-on-1 sessions with your teacher.
• Progress Dashboard — track XP, streaks, accuracy, and game scores.

PRICING:
• $8 first month (introductory rate)
• $17/month after that
• Cancel any time from account settings

OBJECTION HANDLING:
• "Is it worth it?" → "Most students see real improvement within their first two weeks — and at $8 to start, the risk is basically zero."
• "I might not use it enough" → "Even 15 minutes a day on Piano Hero beats an hour of aimless practice. What's your schedule like?"
• "I'm not sure I'm ready" → "There's literally no wrong level to start — our Foundation track begins at absolute zero."

RULES:
- Keep replies to 2–3 sentences unless the user asks for more detail.
- Never be pushy. Be genuinely helpful. Let value do the selling.
- If a user asks about a feature they don't have access to, explain it enthusiastically and mention how to unlock it.
- You know the user's context (skill level, goals) from the system data provided.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userContext } = await req.json();

    if (!messages?.length) throw new Error("messages array is required");

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

    // Build context-aware system prompt
    let systemPrompt = SYSTEM_PROMPT;
    if (userContext) {
      systemPrompt += `\n\nCURRENT USER CONTEXT:\n`;
      if (userContext.skillLevel) systemPrompt += `• Skill level: ${userContext.skillLevel}\n`;
      if (userContext.goals?.length) systemPrompt += `• Goals: ${userContext.goals.join(", ")}\n`;
      if (userContext.practiceTime) systemPrompt += `• Daily practice time: ${userContext.practiceTime}\n`;
      if (userContext.focusArea) systemPrompt += `• Focus area: ${userContext.focusArea}\n`;
      if (userContext.currentPage) systemPrompt += `• Currently on: ${userContext.currentPage}\n`;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 256,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error: ${err}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("[ai-coach]", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
