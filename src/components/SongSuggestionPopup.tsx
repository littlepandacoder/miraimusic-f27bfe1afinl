import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface SuggestedSong {
  id: string;
  title: string;
  composer: string | null;
  thumbnail_path: string | null;
}

// Shown once per login session: suggests a random song from the sheet music library (the Piano Room).
export const SongSuggestionPopup = () => {
  const { user } = useAuth();
  const [song, setSong] = useState<SuggestedSong | null>(null);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const key = `songSuggested:${user.id}`;
    try {
      if (sessionStorage.getItem(key)) return; // already suggested in this login session
      sessionStorage.setItem(key, "1");
    } catch {
      // storage unavailable: still show the suggestion
    }

    let cancelled = false;
    (async () => {
      const db = supabase as any;
      const { data, error } = await db
        .from("sheet_music_library")
        .select("id, title, composer, thumbnail_path")
        .limit(200);
      if (cancelled || error || !data || data.length === 0) return;

      const pick: SuggestedSong = data[Math.floor(Math.random() * data.length)];
      let url: string | null = null;
      if (pick.thumbnail_path) {
        const { data: signed } = await supabase.storage
          .from("sheet-music-thumbs")
          .createSignedUrl(pick.thumbnail_path, 3600);
        url = signed?.signedUrl ?? null;
      }
      if (cancelled) return;
      setSong(pick);
      setThumbUrl(url);
      setOpen(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!song) return null;

  const playSong = () => {
    window.location.href = `/sheet-music-practice/index.html?song=${encodeURIComponent(`lib-${song.id}`)}`;
  };

  return (
    <>
      <style>{`
        @keyframes try-me-shine {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes try-me-glow {
          0%, 100% { box-shadow: 0 0 18px 4px rgba(236, 72, 153, 0.45), 0 0 40px 8px rgba(139, 92, 246, 0.25); }
          50% { box-shadow: 0 0 30px 10px rgba(236, 72, 153, 0.75), 0 0 60px 16px rgba(139, 92, 246, 0.45); }
        }
      `}</style>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-md border-pink-500/40 bg-card text-center"
          style={{ animation: "try-me-glow 2.4s ease-in-out infinite" }}
        >
          <DialogTitle asChild>
            <h2
              className="text-4xl font-black tracking-widest"
              style={{
                background: "linear-gradient(90deg, #f472b6, #c084fc, #fde68a, #f472b6, #c084fc)",
                backgroundSize: "200% 100%",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                animation: "try-me-shine 3s linear infinite",
                filter: "drop-shadow(0 0 10px rgba(244, 114, 182, 0.6))",
              }}
            >
              TRY ME
            </h2>
          </DialogTitle>
          <DialogDescription className="sr-only">A song suggestion from the Piano Room</DialogDescription>

          {thumbUrl && (
            <img
              src={thumbUrl}
              alt=""
              className="mx-auto mt-4 w-40 h-52 rounded-lg object-cover border border-pink-400/50"
              style={{ boxShadow: "0 0 24px 6px rgba(236, 72, 153, 0.4)" }}
            />
          )}
          <p className="mt-4 text-lg font-semibold">{song.title}</p>
          {song.composer && <p className="text-sm text-muted-foreground">{song.composer}</p>}

          <div className="mt-6 flex flex-col gap-2">
            <Button
              onClick={playSong}
              className="w-full font-bold"
              style={{ boxShadow: "0 0 16px 4px rgba(236, 72, 153, 0.5)" }}
            >
              Play this song
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)} className="w-full">
              Maybe later
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SongSuggestionPopup;
