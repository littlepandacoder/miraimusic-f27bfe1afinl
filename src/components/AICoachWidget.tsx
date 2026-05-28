import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import { MessageCircle, X, Send, Loader2, Volume2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const GREETINGS = [
  "Hey! 🎵 I'm Melody, your AI practice coach. Ask me anything about piano, music theory, or how to use Musicable.",
  "Hi there! 🎹 I'm Melody. Whether it's theory, technique, or navigating the app — I've got you.",
  "Hey! I'm Melody, your personal music coach 🎵 What are we working on today?",
];

export default function AICoachWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasNotification, setHasNotification] = useState(false);
  const [onboardingCtx, setOnboardingCtx] = useState<Record<string, unknown> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load onboarding context for personalisation
  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("user_onboarding")
      .select("skill_level, goals, practice_time, focus_area")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) setOnboardingCtx(data);
      });
  }, [user]);

  // Initialise with greeting on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
      setMessages([{ role: "assistant", content: greeting }]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Show notification bubble after 30s if user hasn't opened
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!open) setHasNotification(true);
    }, 30_000);
    return () => clearTimeout(timer);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleOpen = () => {
    setOpen(true);
    setHasNotification(false);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const pageLabel = location.pathname.replace("/dashboard", "Dashboard").replace("/", " / ");
      const { data, error } = await supabase.functions.invoke("ai-coach", {
        body: {
          messages: newMessages,
          userContext: {
            ...(onboardingCtx ?? {}),
            currentPage: pageLabel || "Dashboard",
          },
        },
      });

      if (error) throw error;
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Sorry, I had a hiccup! Try again in a moment 🎵" },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      {/* Chat panel */}
      {open && (
        <div className="w-80 bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ height: "420px" }}>

          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-pink-500 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-base">🎵</div>
              <div>
                <div className="text-white font-bold text-sm leading-none">Melody</div>
                <div className="text-white/70 text-xs">AI Practice Coach</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs mr-1.5 shrink-0 mt-0.5">
                    🎵
                  </div>
                )}
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-white rounded-br-sm"
                    : "bg-secondary text-foreground rounded-bl-sm"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs mr-1.5 shrink-0">🎵</div>
                <div className="bg-secondary px-3 py-2 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1 items-center h-4">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-2.5 flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask Melody anything…"
              className="flex-1 bg-secondary rounded-xl px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all shrink-0"
            >
              {loading ? <Loader2 size={15} className="animate-spin text-white" /> : <Send size={15} className="text-white" />}
            </button>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={handleOpen}
        className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary to-pink-500 shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
      >
        {open ? <Volume2 size={22} className="text-white" /> : <MessageCircle size={22} className="text-white" />}
        {hasNotification && !open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full flex items-center justify-center">
            <span className="text-[9px] font-bold text-white">1</span>
          </span>
        )}
      </button>
    </div>
  );
}
