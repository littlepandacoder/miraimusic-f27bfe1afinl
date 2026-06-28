import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TextWithLinks } from "@/lib/linkParser";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  pending?: boolean;
}

interface ChatWindowProps {
  teacherId: string;
  studentId: string;
  currentUserId: string;
  recipientName: string;
}

export const ChatWindow = ({ teacherId, studentId, currentUserId, recipientName }: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const markIncomingRead = async (msgs: Message[]) => {
    const unreadIds = msgs
      .filter((m) => !m.read_at && m.sender_id !== currentUserId)
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      await (supabase as any)
        .from("chat_messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", unreadIds);
    }
  };

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await (supabase as any)
        .from("chat_messages")
        .select("id, sender_id, content, created_at, read_at")
        .eq("teacher_id", teacherId)
        .eq("student_id", studentId)
        .order("created_at", { ascending: true });

      if (data) {
        setMessages(data);
        await markIncomingRead(data);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat:${teacherId}:${studentId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `teacher_id=eq.${teacherId}`,
        },
        async (payload: any) => {
          const row = payload.new;
          if (row.student_id !== studentId) return;

          setMessages((prev) => {
            // Skip if we already have this id (optimistic insert replaced it)
            if (prev.some((m) => m.id === row.id)) return prev;
            // Replace any pending message with the same content sent by us
            const pendingIdx = prev.findIndex(
              (m) => m.pending && m.sender_id === row.sender_id && m.content === row.content
            );
            if (pendingIdx !== -1) {
              const next = [...prev];
              next[pendingIdx] = { ...row, pending: false };
              return next;
            }
            return [...prev, { ...row, pending: false }];
          });

          if (row.sender_id !== currentUserId) {
            await (supabase as any)
              .from("chat_messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", row.id);
            setMessages((prev) =>
              prev.map((m) => (m.id === row.id ? { ...m, read_at: new Date().toISOString() } : m))
            );
          }
        }
      )
      .on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `teacher_id=eq.${teacherId}`,
        },
        (payload: any) => {
          const updated = payload.new;
          if (updated.student_id !== studentId) return;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, read_at: updated.read_at } : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teacherId, studentId, currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setInput("");

    // Optimistic: show the message immediately on the right side
    const tempId = `pending-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      sender_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      read_at: null,
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    const { data } = await (supabase as any)
      .from("chat_messages")
      .insert({ teacher_id: teacherId, student_id: studentId, sender_id: currentUserId, content })
      .select("id, sender_id, content, created_at, read_at")
      .single();

    if (data) {
      // Swap the temp message for the real one
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...data, pending: false } : m)));
    }

    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const fmtDateLabel = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const groups: { date: string; msgs: Message[] }[] = [];
  for (const msg of messages) {
    const label = fmtDateLabel(msg.created_at);
    const last = groups[groups.length - 1];
    if (last && last.date === label) last.msgs.push(msg);
    else groups.push({ date: label, msgs: [msg] });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border bg-card/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary">
              {recipientName.charAt(0).toUpperCase()}
            </span>
          </div>
          <p className="font-semibold text-sm">{recipientName}</p>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-2">
        {groups.length === 0 && (
          <div className="flex items-center justify-center h-full py-16">
            <p className="text-sm text-muted-foreground">No messages yet — say hello!</p>
          </div>
        )}
        {groups.map(({ date, msgs }) => (
          <div key={date}>
            <div className="flex items-center gap-2 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[11px] text-muted-foreground">{date}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            {msgs.map((msg) => {
              const mine = msg.sender_id === currentUserId;
              return (
                <div key={msg.id} className={`flex mb-2.5 ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[72%] rounded-2xl px-4 py-2.5 transition-opacity ${
                      mine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-secondary text-foreground rounded-bl-sm"
                    } ${msg.pending ? "opacity-60" : "opacity-100"}`}
                  >
                    <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                      <TextWithLinks content={msg.content} />
                    </p>
                    <p
                      className={`text-[10px] mt-1 ${
                        mine ? "text-primary-foreground/60" : "text-muted-foreground"
                      } text-right`}
                    >
                      {msg.pending ? "Sending…" : fmtTime(msg.created_at)}
                      {mine && !msg.pending && msg.read_at && <span className="ml-1">✓</span>}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </ScrollArea>

      <div className="px-4 py-3 border-t border-border bg-card/60 shrink-0">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            className="flex-1 bg-secondary/50 border-secondary"
            autoComplete="off"
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
