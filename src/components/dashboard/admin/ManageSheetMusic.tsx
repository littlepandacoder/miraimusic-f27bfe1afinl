import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Loader2, Trash2, Upload } from "lucide-react";

// Tables and buckets from supabase/migrations/20261105_* and 20261106_* are not in the
// generated types yet, so they are accessed through an untyped client.
const db = supabase as any;
const SONG_BUCKET = "sheet-music-library";
const THUMB_BUCKET = "sheet-music-thumbs";
const SONG_FILE = /\.(musicxml|xml|mxl)$/i;
const THUMB_FILE = /\.(png|jpe?g|webp)$/i;

interface LibrarySong {
  id: string;
  title: string;
  composer: string | null;
  file_name: string;
  file_size_bytes: number;
  storage_path: string;
  thumbnail_path: string | null;
  created_at: string;
}

const formatSize = (bytes: number) =>
  bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const ManageSheetMusic = () => {
  const [songs, setSongs] = useState<LibrarySong[]>([]);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [composer, setComposer] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [thumbInputKey, setThumbInputKey] = useState(0);

  const load = async () => {
    setLoading(true);
    const { data, error } = await db
      .from("sheet_music_library")
      .select("id, title, composer, file_name, file_size_bytes, storage_path, thumbnail_path, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error loading sheet music", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as LibrarySong[];
    setSongs(rows);

    // Signed links so the private thumbnails can be shown in the list.
    const urls: Record<string, string> = {};
    await Promise.all(
      rows
        .filter((row) => row.thumbnail_path)
        .map(async (row) => {
          const { data: signed } = await supabase.storage
            .from(THUMB_BUCKET)
            .createSignedUrl(row.thumbnail_path as string, 3600);
          if (signed?.signedUrl) urls[row.id] = signed.signedUrl;
        }),
    );
    setThumbUrls(urls);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpload = async () => {
    if (!title.trim() || !file || !thumb) {
      toast({ title: "Add a title, a music file and a thumbnail image", variant: "destructive" });
      return;
    }
    if (!SONG_FILE.test(file.name)) {
      toast({ title: "Unsupported music file", description: "Choose a .musicxml, .xml or .mxl file.", variant: "destructive" });
      return;
    }
    if (!THUMB_FILE.test(thumb.name)) {
      toast({ title: "Unsupported image", description: "Choose a .png, .jpg or .webp image.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const uploaded: { bucket: string; path: string }[] = [];
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("You are not signed in.");

      const id = crypto.randomUUID();
      const isMxl = /\.mxl$/i.test(file.name);
      const songPath = `${id}.${isMxl ? "mxl" : "musicxml"}`;
      const thumbExt = thumb.name.split(".").pop()!.toLowerCase();
      const thumbPath = `${id}.${thumbExt}`;

      const { error: thumbError } = await supabase.storage.from(THUMB_BUCKET).upload(thumbPath, thumb, {
        contentType: thumb.type || "image/png",
        upsert: false,
      });
      if (thumbError) throw thumbError;
      uploaded.push({ bucket: THUMB_BUCKET, path: thumbPath });

      const { error: songError } = await supabase.storage.from(SONG_BUCKET).upload(songPath, file, {
        contentType: isMxl ? "application/vnd.recordare.musicxml" : "application/vnd.recordare.musicxml+xml",
        upsert: false,
      });
      if (songError) throw songError;
      uploaded.push({ bucket: SONG_BUCKET, path: songPath });

      const { error: insertError } = await db.from("sheet_music_library").insert({
        title: title.trim(),
        composer: composer.trim() || null,
        file_name: file.name,
        file_type: isMxl ? "mxl" : "musicxml",
        file_size_bytes: file.size,
        storage_path: songPath,
        thumbnail_path: thumbPath,
        uploaded_by: userId,
      });
      if (insertError) throw insertError;

      toast({ title: "Sheet music added", description: "Students will see it in the Sheet Music library." });
      setTitle("");
      setComposer("");
      setFile(null);
      setThumb(null);
      setFileInputKey((k) => k + 1);
      setThumbInputKey((k) => k + 1);
      await load();
    } catch (e: any) {
      // Remove anything already uploaded so no orphan files are left behind.
      for (const item of uploaded) {
        await supabase.storage.from(item.bucket).remove([item.path]);
      }
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (song: LibrarySong) => {
    if (!confirm(`Remove "${song.title}" from the library for all students?`)) return;
    setDeletingId(song.id);
    try {
      const { data, error } = await db
        .from("sheet_music_library")
        .delete()
        .eq("id", song.id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Nothing was removed. Check that you are signed in as an admin.");
      await supabase.storage.from(SONG_BUCKET).remove([song.storage_path]);
      if (song.thumbnail_path) await supabase.storage.from(THUMB_BUCKET).remove([song.thumbnail_path]);
      toast({ title: "Removed from the library" });
      await load();
    } catch (e: any) {
      toast({ title: "Could not remove", description: e.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sheet Music Library</h1>
        <p className="text-sm text-muted-foreground">
          Upload a MusicXML file and a thumbnail image. Each song appears as a picture with its title in the
          library for every student.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add sheet music</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Title *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Twinkle Twinkle" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Composer</label>
              <Input value={composer} onChange={(e) => setComposer(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">MusicXML file *</label>
              <Input
                key={fileInputKey}
                type="file"
                accept=".musicxml,.xml,.mxl"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">.musicxml, .xml or .mxl, up to 20 MB</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Thumbnail image *</label>
              <Input
                key={thumbInputKey}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setThumb(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">.png, .jpg or .webp, up to 5 MB. Shown above the title.</p>
            </div>
          </div>
          <Button onClick={handleUpload} disabled={saving || !title.trim() || !file || !thumb}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            {saving ? "Uploading..." : "Upload to library"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">In the library ({songs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : songs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sheet music yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {songs.map((song) => (
                <li key={song.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex items-center gap-4 min-w-0">
                    {thumbUrls[song.id] ? (
                      <img
                        src={thumbUrls[song.id]}
                        alt=""
                        className="w-16 h-20 rounded-md object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-20 rounded-md border border-border shrink-0 bg-muted" />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{song.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {song.composer ? `${song.composer} · ` : ""}
                        {song.file_name} · {formatSize(song.file_size_bytes)} · added{" "}
                        {new Date(song.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(song)}
                    disabled={deletingId === song.id}
                    aria-label={`Remove ${song.title}`}
                  >
                    {deletingId === song.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-destructive" />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageSheetMusic;
