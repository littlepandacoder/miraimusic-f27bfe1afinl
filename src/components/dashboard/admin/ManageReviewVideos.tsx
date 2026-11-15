import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// The review columns and the Module 1 links come from supabase/migrations/20261115_sheet_music_review_*.
// Those columns are not in the generated types yet, so the untyped client is used here.
const db = supabase as any;
const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

interface Category {
  id: string;
  name: string;
}

interface Song {
  id: string;
  title: string;
  category_id: string | null;
  progression_step: number | null;
  review_video_title: string | null;
  review_video_url: string | null;
}

interface FundamentalsVideo {
  title: string;
  url: string;
}

// What the admin has typed or picked for one song, before it is saved.
interface Draft {
  title: string;
  url: string;
}

const ManageReviewVideos = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [videos, setVideos] = useState<FundamentalsVideo[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: cats, error: catError }, { data: rows, error: songError }, { data: vids, error: vidError }] =
      await Promise.all([
        db.from("sheet_music_categories").select("id, name").order("sort_order"),
        db
          .from("sheet_music_library")
          .select("id, title, category_id, progression_step, review_video_title, review_video_url")
          .order("progression_step", { ascending: true, nullsFirst: false })
          .order("title"),
        db.from("lesson_videos").select("title, url").not("url", "is", null).order("title"),
      ]);
    const firstError = catError || songError || vidError;
    if (firstError) {
      toast({ title: "Could not load", description: firstError.message, variant: "destructive" });
    }
    const catList: Category[] = cats ?? [];
    setCategories(catList);
    setSongs(rows ?? []);
    // One entry per video title, so the picker has no repeats.
    const unique = new Map<string, FundamentalsVideo>();
    (vids ?? []).forEach((v: FundamentalsVideo) => {
      if (!unique.has(v.title)) unique.set(v.title, v);
    });
    setVideos([...unique.values()]);
    setCategoryFilter((current) => {
      if (current) return current;
      return catList.find((c) => c.name === "Module 1")?.id ?? catList[0]?.id ?? "";
    });
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draftFor = (song: Song): Draft =>
    drafts[song.id] ?? { title: song.review_video_title ?? "", url: song.review_video_url ?? "" };

  const setDraft = (song: Song, next: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [song.id]: { ...draftFor(song), ...next } }));

  const save = async (song: Song, draft: Draft) => {
    setSavingId(song.id);
    const { error } = await db
      .from("sheet_music_library")
      .update({
        review_video_title: draft.title.trim() || null,
        review_video_url: draft.url.trim() || null,
      })
      .eq("id", song.id);
    setSavingId(null);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Review video saved" });
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[song.id];
      return next;
    });
    load();
  };

  const clear = (song: Song) => save(song, { title: "", url: "" });

  const visibleSongs = songs.filter((s) => s.category_id === categoryFilter);
  const categoryName = categories.find((c) => c.id === categoryFilter)?.name ?? "";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Review Videos</h1>
        <p className="text-sm text-muted-foreground">
          Each library song opens with a REVIEW LESSON pop-up that plays this video first. Pick a Fundamentals video,
          or paste a video URL.
        </p>
      </div>

      <div className="max-w-sm">
        <label className="mb-1 block text-sm font-semibold">Category</label>
        <select className={selectClass} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {visibleSongs.length === 0 && (
        <p className="text-sm text-muted-foreground">No songs in {categoryName || "this category"} yet.</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {visibleSongs.map((song) => {
          const draft = draftFor(song);
          const dirty =
            draft.title !== (song.review_video_title ?? "") || draft.url !== (song.review_video_url ?? "");
          return (
            <Card key={song.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {song.progression_step != null ? `Lesson ${song.progression_step} · ` : ""}
                  {song.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Now: {song.review_video_url ? song.review_video_title || "video set" : "no review video"}
                </p>

                <div>
                  <label className="mb-1 block text-sm font-semibold">Pick a Fundamentals video</label>
                  <select
                    className={selectClass}
                    value=""
                    onChange={(e) => {
                      const picked = videos.find((v) => v.title === e.target.value);
                      if (picked) setDraft(song, { title: picked.title, url: picked.url });
                    }}
                  >
                    <option value="">Choose…</option>
                    {videos.map((v) => (
                      <option key={v.title} value={v.title}>
                        {v.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">Or paste a video URL</label>
                  <Input
                    placeholder="https://…/video.mp4"
                    value={draft.url}
                    onChange={(e) => setDraft(song, { url: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">Pop-up title</label>
                  <Input
                    placeholder="e.g. Treble Clef Notes"
                    value={draft.title}
                    onChange={(e) => setDraft(song, { title: e.target.value })}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => save(song, draft)} disabled={!dirty || savingId === song.id}>
                    {savingId === song.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                  </Button>
                  <Button variant="outline" onClick={() => clear(song)} disabled={savingId === song.id}>
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ManageReviewVideos;
