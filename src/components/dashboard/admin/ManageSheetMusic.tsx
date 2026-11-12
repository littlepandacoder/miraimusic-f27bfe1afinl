import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";

// Tables and buckets from supabase/migrations/20261105_*, 20261106_* and 20261107_* are not in the
// generated types yet, so they are accessed through an untyped client.
const db = supabase as any;
const SONG_BUCKET = "sheet-music-library";
const THUMB_BUCKET = "sheet-music-thumbs";
const SONG_FILE = /\.(musicxml|xml|mxl)$/i;
const THUMB_FILE = /\.(png|jpe?g|webp)$/i;
const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

interface Category {
  id: string;
  name: string;
  sort_order: number;
  thumbnail_path: string | null;
}

interface LibrarySong {
  id: string;
  title: string;
  composer: string | null;
  file_name: string;
  file_size_bytes: number;
  storage_path: string;
  thumbnail_path: string | null;
  category_id: string | null;
  created_at: string;
}

// A song waiting to be uploaded. Its title starts as the file name.
interface Draft {
  key: string;
  file: File;
  title: string;
  composer: string;
  thumb: File | null;
}

const formatSize = (bytes: number) =>
  bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const ManageSheetMusic = () => {
  const [songs, setSongs] = useState<LibrarySong[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [newCategory, setNewCategory] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [catThumbUrls, setCatThumbUrls] = useState<Record<string, string>>({});
  // The song being edited in place (one at a time). Thumbnail is optional: null keeps the current one.
  const [editing, setEditing] = useState<{ id: string; title: string; composer: string; categoryId: string; thumb: File | null } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "No category";

  const loadCategories = async () => {
    const { data, error } = await db
      .from("sheet_music_categories")
      .select("id, name, sort_order, thumbnail_path")
      .order("sort_order")
      .order("name");
    if (error) {
      toast({ title: "Error loading categories", description: error.message, variant: "destructive" });
      return;
    }
    const rows = (data ?? []) as Category[];
    setCategories(rows);
    const urls: Record<string, string> = {};
    await Promise.all(
      rows
        .filter((c) => c.thumbnail_path)
        .map(async (c) => {
          const { data: signed } = await supabase.storage.from(THUMB_BUCKET).createSignedUrl(c.thumbnail_path as string, 3600);
          if (signed?.signedUrl) urls[c.id] = signed.signedUrl;
        }),
    );
    setCatThumbUrls(urls);
  };

  const load = async () => {
    setLoading(true);
    await loadCategories();
    const { data, error } = await db
      .from("sheet_music_library")
      .select("id, title, composer, file_name, file_size_bytes, storage_path, thumbnail_path, category_id, created_at")
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

  // ---- Categories: create, rename, delete ----

  const addCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    setSavingCategory(true);
    const sortOrder = categories.reduce((max, c) => Math.max(max, c.sort_order), 0) + 1;
    const { error } = await db.from("sheet_music_categories").insert({ name, sort_order: sortOrder });
    setSavingCategory(false);
    if (error) {
      toast({ title: "Could not add category", description: error.message, variant: "destructive" });
      return;
    }
    setNewCategory("");
    toast({ title: "Category added" });
    await loadCategories();
  };

  const renameCategory = async (category: Category) => {
    const name = editingCategoryName.trim();
    if (!name || name === category.name) {
      setEditingCategoryId(null);
      return;
    }
    const { data, error } = await db
      .from("sheet_music_categories")
      .update({ name })
      .eq("id", category.id)
      .select("id");
    if (error || !data || data.length === 0) {
      toast({
        title: "Could not rename category",
        description: error?.message ?? "Check that you are signed in as an admin.",
        variant: "destructive",
      });
      return;
    }
    setEditingCategoryId(null);
    toast({ title: "Category renamed" });
    await loadCategories();
  };

  const deleteCategory = async (category: Category) => {
    const count = songs.filter((s) => s.category_id === category.id).length;
    const note = count > 0 ? ` Its ${count} song(s) will be kept with no category.` : "";
    if (!confirm(`Delete the category "${category.name}"?${note}`)) return;
    const { data, error } = await db.from("sheet_music_categories").delete().eq("id", category.id).select("id");
    if (error || !data || data.length === 0) {
      toast({
        title: "Could not delete category",
        description: error?.message ?? "Check that you are signed in as an admin.",
        variant: "destructive",
      });
      return;
    }
    if (category.thumbnail_path) await supabase.storage.from(THUMB_BUCKET).remove([category.thumbnail_path]);
    toast({ title: "Category deleted" });
    await load();
  };

  // Category thumbnail: the picture students see for this category on the library page.
  const uploadCategoryThumb = async (category: Category, image: File | undefined) => {
    if (!image) return;
    if (!THUMB_FILE.test(image.name)) {
      toast({ title: "Unsupported image", description: "Choose a .png, .jpg or .webp image.", variant: "destructive" });
      return;
    }
    const ext = image.name.split(".").pop()!.toLowerCase();
    const path = `category-${category.id}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from(THUMB_BUCKET).upload(path, image, {
      contentType: image.type || "image/png",
      upsert: false,
    });
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      return;
    }
    const { data, error } = await db
      .from("sheet_music_categories")
      .update({ thumbnail_path: path })
      .eq("id", category.id)
      .select("id");
    if (error || !data || data.length === 0) {
      await supabase.storage.from(THUMB_BUCKET).remove([path]);
      toast({
        title: "Could not save the image",
        description: error?.message ?? "Check that you are signed in as an admin.",
        variant: "destructive",
      });
      return;
    }
    if (category.thumbnail_path) await supabase.storage.from(THUMB_BUCKET).remove([category.thumbnail_path]);
    toast({ title: "Category image saved" });
    await loadCategories();
  };

  // ---- Songs ----

  const moveSong = async (song: LibrarySong, newCategoryId: string) => {
    const value = newCategoryId || null;
    if (value === song.category_id) return;
    const { data, error } = await db
      .from("sheet_music_library")
      .update({ category_id: value })
      .eq("id", song.id)
      .select("id");
    if (error || !data || data.length === 0) {
      toast({
        title: "Could not change category",
        description: error?.message ?? "Check that you are signed in as an admin.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Category updated" });
    await load();
  };

  const startEdit = (song: LibrarySong) => {
    setEditing({
      id: song.id,
      title: song.title,
      composer: song.composer ?? "",
      categoryId: song.category_id ?? "",
      thumb: null,
    });
  };

  // Saves name, composer, category and (optionally) a new thumbnail. A new thumbnail gets a new path,
  // so the old one is removed only after the database row points at the new one.
  const saveEdit = async (song: LibrarySong) => {
    if (!editing) return;
    const title = editing.title.trim();
    if (!title) {
      toast({ title: "Every song needs a title", variant: "destructive" });
      return;
    }
    let newThumbPath: string | null = null;
    if (editing.thumb) {
      if (!THUMB_FILE.test(editing.thumb.name)) {
        toast({ title: "Unsupported image", description: "Choose a .png, .jpg or .webp image.", variant: "destructive" });
        return;
      }
      const ext = editing.thumb.name.split(".").pop()!.toLowerCase();
      newThumbPath = `${song.id}-${Date.now()}.${ext}`;
      const { error: thumbError } = await supabase.storage.from(THUMB_BUCKET).upload(newThumbPath, editing.thumb, {
        contentType: editing.thumb.type || "image/png",
        upsert: false,
      });
      if (thumbError) {
        toast({ title: "Could not upload the thumbnail", description: thumbError.message, variant: "destructive" });
        return;
      }
    }

    setSavingEdit(true);
    const changes = {
      title,
      composer: editing.composer.trim() || null,
      category_id: editing.categoryId || null,
      ...(newThumbPath ? { thumbnail_path: newThumbPath } : {}),
    };
    const { data, error } = await db.from("sheet_music_library").update(changes).eq("id", song.id).select("id");
    setSavingEdit(false);
    if (error || !data || data.length === 0) {
      if (newThumbPath) await supabase.storage.from(THUMB_BUCKET).remove([newThumbPath]);
      toast({
        title: "Could not save changes",
        description: error?.message ?? "Check that you are signed in as an admin.",
        variant: "destructive",
      });
      return;
    }
    if (newThumbPath && song.thumbnail_path) await supabase.storage.from(THUMB_BUCKET).remove([song.thumbnail_path]);
    setEditing(null);
    toast({ title: "Song updated" });
    await load();
  };

  // Adds the chosen music files as pending songs. The title defaults to the file name.
  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const added: Draft[] = [];
    for (const file of Array.from(files)) {
      if (!SONG_FILE.test(file.name)) {
        toast({ title: "Skipped", description: `${file.name} is not a .musicxml, .xml or .mxl file.`, variant: "destructive" });
        continue;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast({ title: "Skipped", description: `${file.name} is larger than 20 MB.`, variant: "destructive" });
        continue;
      }
      added.push({
        key: crypto.randomUUID(),
        file,
        title: file.name.replace(/\.[^.]+$/, ""),
        composer: "",
        thumb: null,
      });
    }
    setDrafts((current) => [...current, ...added]);
  };

  const updateDraft = (key: string, changes: Partial<Draft>) => {
    setDrafts((current) => current.map((d) => (d.key === key ? { ...d, ...changes } : d)));
  };

  // Uploads one song: thumbnail (optional), music file, then the database row. Cleans up on failure.
  const uploadOne = async (draft: Draft, userId: string) => {
    const uploaded: { bucket: string; path: string }[] = [];
    try {
      const id = crypto.randomUUID();
      const isMxl = /\.mxl$/i.test(draft.file.name);
      const songPath = `${id}.${isMxl ? "mxl" : "musicxml"}`;
      let thumbPath: string | null = null;
      if (draft.thumb) {
        const thumbExt = draft.thumb.name.split(".").pop()!.toLowerCase();
        thumbPath = `${id}.${thumbExt}`;
        const { error: thumbError } = await supabase.storage.from(THUMB_BUCKET).upload(thumbPath, draft.thumb, {
          contentType: draft.thumb.type || "image/png",
          upsert: false,
        });
        if (thumbError) throw thumbError;
        uploaded.push({ bucket: THUMB_BUCKET, path: thumbPath });
      }

      const { error: songError } = await supabase.storage.from(SONG_BUCKET).upload(songPath, draft.file, {
        contentType: isMxl ? "application/vnd.recordare.musicxml" : "application/vnd.recordare.musicxml+xml",
        upsert: false,
      });
      if (songError) throw songError;
      uploaded.push({ bucket: SONG_BUCKET, path: songPath });

      const { error: insertError } = await db.from("sheet_music_library").insert({
        title: draft.title.trim(),
        composer: draft.composer.trim() || null,
        file_name: draft.file.name,
        file_type: isMxl ? "mxl" : "musicxml",
        file_size_bytes: draft.file.size,
        storage_path: songPath,
        thumbnail_path: thumbPath,
        category_id: categoryId || null,
        uploaded_by: userId,
      });
      if (insertError) throw insertError;
    } catch (e) {
      for (const item of uploaded) {
        await supabase.storage.from(item.bucket).remove([item.path]);
      }
      throw e;
    }
  };

  const handleUpload = async () => {
    if (drafts.length === 0 || drafts.some((d) => !d.title.trim())) {
      toast({ title: "Every song needs a title", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("You are not signed in.");

      const failed: Draft[] = [];
      let added = 0;
      for (const draft of drafts) {
        try {
          await uploadOne(draft, userId);
          added++;
        } catch (e: any) {
          failed.push(draft);
          toast({ title: `Could not upload ${draft.file.name}`, description: e.message, variant: "destructive" });
        }
      }
      if (added > 0) {
        toast({ title: `${added} song${added === 1 ? "" : "s"} added`, description: "Students will see them in the Sheet Music library." });
      }
      setDrafts(failed);
      setFileInputKey((k) => k + 1);
      await load();
    } catch (e: any) {
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

  // Inline editor for one song: name, composer, category and an optional new thumbnail.
  const renderEditRow = (song: LibrarySong) => {
    if (!editing) return null;
    return (
      <li key={song.id} className="grid gap-3 py-3 md:grid-cols-[auto_1fr_1fr_1fr] md:items-end">
        {thumbUrls[song.id] ? (
          <img src={thumbUrls[song.id]} alt="" className="w-16 h-20 rounded-md object-cover border border-border shrink-0" />
        ) : (
          <div className="w-16 h-20 rounded-md border border-border shrink-0 bg-muted flex items-center justify-center p-1 text-center text-[10px] font-semibold leading-tight overflow-hidden break-words">
            {editing.title}
          </div>
        )}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Title *</label>
          <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Composer</label>
          <Input
            value={editing.composer}
            onChange={(e) => setEditing({ ...editing, composer: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Category</label>
          <select
            className={selectClass}
            value={editing.categoryId}
            onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 md:col-span-4">
          <label className="text-xs font-medium text-muted-foreground">
            Thumbnail {editing.thumb ? `(new: ${editing.thumb.name})` : "(optional, leave empty to keep the current one)"}
          </label>
          <Input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              setEditing((current) => (current ? { ...current, thumb: e.target.files?.[0] ?? null } : current));
              e.target.value = "";
            }}
          />
        </div>
        <div className="flex items-center gap-2 md:col-span-4">
          <Button onClick={() => saveEdit(song)} disabled={savingEdit || !editing.title.trim()}>
            {savingEdit ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save changes
          </Button>
          <Button variant="outline" onClick={() => setEditing(null)} disabled={savingEdit}>
            Cancel
          </Button>
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sheet Music Library</h1>
        <p className="text-sm text-muted-foreground">
          Upload a MusicXML file and a thumbnail image, and put it in a category. Each category is a section on the
          "Choose a piece" page for students.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No categories yet. Add one below.</p>
          ) : (
            <ul className="divide-y divide-border">
              {categories.map((category) => (
                <li key={category.id} className="flex items-center justify-between gap-4 py-2">
                  {editingCategoryId === category.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <Input
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") renameCategory(category);
                          if (e.key === "Escape") setEditingCategoryId(null);
                        }}
                        autoFocus
                      />
                      <Button size="sm" onClick={() => renameCategory(category)}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingCategoryId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4 min-w-0">
                        {catThumbUrls[category.id] ? (
                          <img src={catThumbUrls[category.id]} alt="" className="w-12 h-16 rounded-md object-cover border border-border shrink-0" />
                        ) : (
                          <div className="w-12 h-16 rounded-md border border-border shrink-0 bg-muted" />
                        )}
                        <p className="font-semibold truncate">{category.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {songs.filter((s) => s.category_id === category.id).length} song(s)
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <label className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md hover:bg-accent" title="Upload category image" aria-label={`Upload image for ${category.name}`}>
                          <Upload className="w-4 h-4" />
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              uploadCategoryThumb(category, e.target.files?.[0]);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Rename ${category.name}`}
                          onClick={() => {
                            setEditingCategoryId(category.id);
                            setEditingCategoryName(category.name);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${category.name}`}
                          onClick={() => deleteCategory(category)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-2">
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addCategory();
              }}
              placeholder="New category name, e.g. Grade 1"
            />
            <Button onClick={addCategory} disabled={savingCategory || !newCategory.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Add category
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add sheet music</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">MusicXML files *</label>
              <Input
                key={fileInputKey}
                type="file"
                multiple
                accept=".musicxml,.xml,.mxl"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <p className="text-xs text-muted-foreground">Choose one or many. Each file becomes a song, titled by its file name.</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Category (for all of these)</label>
              <select className={selectClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {drafts.length > 0 && (
            <ul className="divide-y divide-border rounded-md border border-border">
              {drafts.map((draft) => (
                <li key={draft.key} className="grid gap-3 p-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Title * ({draft.file.name})</label>
                    <Input value={draft.title} onChange={(e) => updateDraft(draft.key, { title: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Composer</label>
                    <Input value={draft.composer} onChange={(e) => updateDraft(draft.key, { composer: e.target.value })} placeholder="Optional" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Thumbnail {draft.thumb ? `(${draft.thumb.name})` : "(optional)"}</label>
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => updateDraft(draft.key, { thumb: e.target.files?.[0] ?? null })}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${draft.file.name}`}
                    onClick={() => setDrafts((current) => current.filter((d) => d.key !== draft.key))}
                    disabled={saving}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <Button onClick={handleUpload} disabled={saving || drafts.length === 0 || drafts.some((d) => !d.title.trim())}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            {saving ? "Uploading..." : `Upload ${drafts.length || ""} to library`.replace("  ", " ")}
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
              {songs.map((song) => editing?.id === song.id ? renderEditRow(song) : (
                <li key={song.id} className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    {thumbUrls[song.id] ? (
                      <img
                        src={thumbUrls[song.id]}
                        alt=""
                        className="w-16 h-20 rounded-md object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-20 rounded-md border border-border shrink-0 bg-muted flex items-center justify-center p-1 text-center text-[10px] font-semibold leading-tight overflow-hidden break-words">
                        {song.title}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{song.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {song.composer ? `${song.composer} · ` : ""}
                        {song.file_name} · {formatSize(song.file_size_bytes)} · added{" "}
                        {new Date(song.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Category: {categoryName(song.category_id)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className={`${selectClass} md:w-56`}
                      value={song.category_id ?? ""}
                      onChange={(e) => moveSong(song, e.target.value)}
                      aria-label={`Category for ${song.title}`}
                    >
                      <option value="">No category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(song)}
                      disabled={editing !== null || deletingId !== null}
                      aria-label={`Edit ${song.title}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
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
                  </div>
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
