import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, TrendingDown, X } from "lucide-react";

interface RankEntry {
  rank: number;
  user_id: string;
  display_name: string;
  best_acc?: number;
  sessions?: number;
  completion_pct?: number;
  completed_at?: string | null;
}

interface Props {
  type: "game" | "module";
  id: string;
  label: string;
  onClose: () => void;
}

const MEDALS = ["🥇", "🥈", "🥉"];

function prevRankKey(type: string, id: string, userId: string) {
  return `musicable_prev_rank_${type}_${id}_${userId}`;
}

const RankingModal = ({ type, id, label, onClose }: Props) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<RankEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [prevRank, setPrevRank] = useState<number | null>(null);
  const [displayRank, setDisplayRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data } = type === "game"
        ? await (supabase as any).rpc("get_game_leaderboard", { p_game: id, p_limit: 10 })
        : await (supabase as any).rpc("get_module_leaderboard", { p_module_id: id, p_limit: 10 });

      const rows: RankEntry[] = (data || []).map((r: any) => ({ ...r, rank: Number(r.rank) }));
      setEntries(rows);

      const mine = rows.find(r => r.user_id === user.id);
      const current = mine ? mine.rank : null;
      setMyRank(current);

      const key = prevRankKey(type, id, user.id);
      const stored = localStorage.getItem(key);
      const prev = stored ? Number(stored) : null;
      setPrevRank(prev);
      if (current !== null) localStorage.setItem(key, String(current));

      setLoading(false);

      // Animate rank number from prev → current
      if (prev !== null && current !== null && prev !== current) {
        const from = prev;
        const to = current;
        const duration = 900;
        let startTs: number | null = null;
        setDisplayRank(from);
        const step = (ts: number) => {
          if (!startTs) startTs = ts;
          const t = Math.min((ts - startTs) / duration, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          setDisplayRank(Math.round(from + (to - from) * eased));
          if (t < 1) rafRef.current = requestAnimationFrame(step);
          else setDisplayRank(to);
        };
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplayRank(current);
      }
    };

    load();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [user, type, id]);

  const delta = prevRank !== null && myRank !== null ? prevRank - myRank : 0;

  return (
    <div
      className="fixed inset-0 z-[950] flex items-center justify-center bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm mx-4 rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "linear-gradient(145deg, #151228 0%, #0f0d1a 100%)", border: "1px solid rgba(255,45,120,0.25)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #FF2D78, #A855F7, #00D4FF)" }} />

        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>
              Leaderboard
            </p>
            <h2 className="text-lg font-black text-white leading-tight" style={{ fontFamily: "'Orbitron', monospace" }}>
              {label}
            </h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors mt-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* My rank badge */}
        {!loading && (
          <div
            className="mx-5 mb-4 rounded-xl p-4 text-center"
            style={{ background: "rgba(255,45,120,0.1)", border: "1px solid rgba(255,45,120,0.3)" }}
          >
            {myRank !== null ? (
              <>
                <p className="text-xs text-muted-foreground mb-1">Your Rank</p>
                <div className="flex items-center justify-center gap-3">
                  {delta > 0 && prevRank !== null && <TrendingUp className="w-5 h-5 text-green-400" />}
                  {delta < 0 && prevRank !== null && <TrendingDown className="w-5 h-5 text-red-400" />}
                  <span
                    className="text-5xl font-black tabular-nums"
                    style={{ fontFamily: "'Orbitron', monospace", color: "#FF2D78", textShadow: "0 0 30px rgba(255,45,120,0.5)" }}
                  >
                    #{displayRank}
                  </span>
                  {delta !== 0 && prevRank !== null && (
                    <span className={`text-sm font-bold ${delta > 0 ? "text-green-400" : "text-red-400"}`}>
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  )}
                </div>
                {delta !== 0 && prevRank !== null && (
                  <p className="text-xs mt-1.5" style={{ color: delta > 0 ? "#39D98A" : "#FF6B6B" }}>
                    {delta > 0 ? `↑ Up from #${prevRank}` : `↓ Down from #${prevRank}`}
                  </p>
                )}
                {delta === 0 && prevRank !== null && (
                  <p className="text-xs mt-1 text-muted-foreground">Rank unchanged</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-1">Play to appear on the leaderboard!</p>
            )}
          </div>
        )}

        {/* Leaderboard rows */}
        <div className="px-5 pb-5 space-y-1.5 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-6">No rankings yet — be the first!</p>
          ) : (
            entries.map((entry, i) => {
              const isMe = entry.user_id === user?.id;
              return (
                <div
                  key={entry.user_id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{
                    background: isMe ? "rgba(255,45,120,0.12)" : "rgba(255,255,255,0.04)",
                    border: isMe ? "1px solid rgba(255,45,120,0.4)" : "1px solid rgba(255,255,255,0.07)",
                    animation: `rankSlideIn ${80 + i * 55}ms ease-out both`,
                  }}
                >
                  <span className="w-7 text-center text-sm font-bold shrink-0" style={{ fontFamily: "'Orbitron', monospace" }}>
                    {i < 3 ? MEDALS[i] : `${entry.rank}`}
                  </span>
                  <span
                    className="flex-1 text-sm font-semibold truncate"
                    style={{ color: isMe ? "#FF2D78" : "#fff" }}
                  >
                    {isMe ? "You" : entry.display_name}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground shrink-0">
                    {type === "game"
                      ? (entry.best_acc !== undefined ? `${entry.best_acc}%` : "—")
                      : (entry.completion_pct !== undefined ? `${entry.completion_pct}%` : "—")}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <style>{`
          @keyframes rankSlideIn {
            from { opacity: 0; transform: translateX(-14px); }
            to   { opacity: 1; transform: translateX(0); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default RankingModal;
