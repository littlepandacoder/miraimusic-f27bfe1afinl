import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FolderOpen, Folder, Plus, Pencil, Trash2, Loader2, ArrowLeft, Music2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  color: string;
  description: string | null;
  sort_order: number;
  songCount?: number;
}

interface Song {
  id: string;
  title: string;
  composer: string | null;
  difficulty: string;
  bpm: number;
  song_key: string | null;
  category_id: string | null;
  sort_order: number;
}

const PALETTE = [
  "#ec4899", "#a855f7", "#3b82f6", "#06b6d4",
  "#10b981", "#f59e0b", "#ef4444", "#f97316",
];

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner:     "bg-green-500/20 text-green-400 border-green-500/50",
  intermediate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  advanced:     "bg-red-500/20 text-red-400 border-red-500/50",
};

const ManagePianoHero = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCategory, setOpenCategory] = useState<Category | null>(null);

  // Category dialog
  const [catDialog, setCatDialog] = useState<{ open: boolean; editing: Category | null }>({ open: false, editing: null });
  const [catForm, setCatForm] = useState({ name: "", color: "#ec4899", description: "" });
  const [catSaving, setCatSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Song assign dialog
  const [songDialog, setSongDialog] = useState(false);
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
  const [songSaving, setSongSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [catRes, songRes] = await Promise.all([
      (supabase as any).from("piano_hero_categories").select("*").order("sort_order").order("name"),
      (supabase as any).from("piano_hero_songs").select("*").order("sort_order").order("title"),
    ]);
    const cats: Category[] = (catRes.data || []).map((c: any) => ({
      ...c,
      songCount: (songRes.data || []).filter((s: any) => s.category_id === c.id).length,
    }));
    setCategories(cats);
    setSongs(songRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Category CRUD ────────────────────────────────────────
  const openNewCat = () => {
    setCatForm({ name: "", color: "#ec4899", description: "" });
    setCatDialog({ open: true, editing: null });
  };

  const openEditCat = (cat: Category) => {
    setCatForm({ name: cat.name, color: cat.color, description: cat.description ?? "" });
    setCatDialog({ open: true, editing: cat });
  };

  const saveCat = async () => {
    if (!catForm.name.trim()) return;
    setCatSaving(true);
    try {
      if (catDialog.editing) {
        const { error } = await (supabase as any)
          .from("piano_hero_categories")
          .update({ name: catForm.name.trim(), color: catForm.color, description: catForm.description || null })
          .eq("id", catDialog.editing.id);
        if (error) throw error;
        if (openCategory?.id === catDialog.editing.id) {
          setOpenCategory(prev => prev ? { ...prev, name: catForm.name.trim(), color: catForm.color } : prev);
        }
      } else {
        const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) + 1 : 0;
        const { error } = await (supabase as any)
          .from("piano_hero_categories")
          .insert({ name: catForm.name.trim(), color: catForm.color, description: catForm.description || null, sort_order: maxOrder });
        if (error) throw error;
      }
      toast({ title: catDialog.editing ? "Category updated" : "Category created" });
      setCatDialog({ open: false, editing: null });
      fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setCatSaving(false);
    }
  };

  const deleteCat = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // Unassign songs first
      await (supabase as any).from("piano_hero_songs").update({ category_id: null }).eq("category_id", deleteTarget.id);
      const { error } = await (supabase as any).from("piano_hero_categories").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast({ title: "Category deleted" });
      setDeleteTarget(null);
      if (openCategory?.id === deleteTarget.id) setOpenCategory(null);
      fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  // ── Song assign / remove ─────────────────────────────────
  const unassignedSongs = songs.filter(s => !s.category_id);
  const categorySongs = openCategory ? songs.filter(s => s.category_id === openCategory.id) : [];

  const toggleSongSelection = (id: string) => {
    setSelectedSongIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const assignSongs = async () => {
    if (!selectedSongIds.size || !openCategory) return;
    setSongSaving(true);
    try {
      const ids = Array.from(selectedSongIds);
      const { error } = await (supabase as any)
        .from("piano_hero_songs").update({ category_id: openCategory.id }).in("id", ids);
      if (error) throw error;
      setSelectedSongIds(new Set());
      setSongDialog(false);
      fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSongSaving(false);
    }
  };

  const removeSong = async (song: Song) => {
    await (supabase as any).from("piano_hero_songs").update({ category_id: null }).eq("id", song.id);
    fetchAll();
  };

  // ── Render ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Folder (category) detail view
  if (openCategory) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setOpenCategory(null)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full shrink-0" style={{ background: openCategory.color }} />
            <h2 className="text-xl font-bold">{openCategory.name}</h2>
          </div>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={() => openEditCat(openCategory)} className="gap-2">
              <Pencil className="w-4 h-4" /> Rename
            </Button>
            <Button size="sm" onClick={() => setSongDialog(true)} className="btn-primary gap-2">
              <Plus className="w-4 h-4" /> Add Song
            </Button>
          </div>
        </div>

        {categorySongs.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-16 text-center space-y-2">
              <Music2 className="w-10 h-10 mx-auto opacity-30" />
              <p className="text-muted-foreground">No songs in this category yet.</p>
              <Button size="sm" onClick={() => setSongDialog(true)} className="btn-primary mt-2">Add Song</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categorySongs.map(song => (
              <Card key={song.id} className="bg-card border-border hover:border-primary/50 transition-colors">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm leading-tight">{song.title}</p>
                    <Button
                      size="icon" variant="ghost"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeSong(song)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  {song.composer && <p className="text-xs text-muted-foreground">{song.composer}</p>}
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-xs capitalize", DIFFICULTY_COLORS[song.difficulty] ?? "")}>{song.difficulty}</Badge>
                    <span className="text-xs text-muted-foreground">♩= {song.bpm}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add song dialog — multi-select */}
        <Dialog open={songDialog} onOpenChange={(o) => { if (!o) { setSongDialog(false); setSelectedSongIds(new Set()); } }}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader><DialogTitle>Add Songs to "{openCategory.name}"</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              {unassignedSongs.length === 0 ? (
                <p className="text-sm text-muted-foreground">All songs are already assigned to a category.</p>
              ) : (
                <>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between mb-2">
                      <Label>Select Songs</Label>
                      <button
                        className="text-xs text-primary hover:underline"
                        onClick={() => setSelectedSongIds(
                          selectedSongIds.size === unassignedSongs.length
                            ? new Set()
                            : new Set(unassignedSongs.map(s => s.id))
                        )}
                      >
                        {selectedSongIds.size === unassignedSongs.length ? "Deselect all" : "Select all"}
                      </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
                      {unassignedSongs.map(s => (
                        <label
                          key={s.id}
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                            selectedSongIds.has(s.id) ? "bg-primary/15 border border-primary/30" : "hover:bg-secondary"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={selectedSongIds.has(s.id)}
                            onChange={() => toggleSongSelection(s.id)}
                            className="accent-pink-500 w-4 h-4 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{s.title}</p>
                            <p className="text-xs text-muted-foreground">{s.composer} · <span className="capitalize">{s.difficulty}</span> · ♩={s.bpm}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                    {selectedSongIds.size > 0 && (
                      <p className="text-xs text-primary pt-1">{selectedSongIds.size} song{selectedSongIds.size !== 1 ? "s" : ""} selected</p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={assignSongs} disabled={!selectedSongIds.size || songSaving} className="flex-1 btn-primary">
                      {songSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Add {selectedSongIds.size > 0 ? selectedSongIds.size : ""} Song{selectedSongIds.size !== 1 ? "s" : ""}
                    </Button>
                    <Button variant="outline" onClick={() => { setSongDialog(false); setSelectedSongIds(new Set()); }} className="flex-1">Cancel</Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Rename category dialog (reused from main) */}
        <Dialog open={catDialog.open} onOpenChange={(o) => !o && setCatDialog({ open: false, editing: null })}>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Rename Category</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                  className="bg-secondary border-border" placeholder="Category name" />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {PALETTE.map(c => (
                    <button key={c} onClick={() => setCatForm({ ...catForm, color: c })}
                      className={cn("w-7 h-7 rounded-full border-2 transition-transform hover:scale-110",
                        catForm.color === c ? "border-white scale-110" : "border-transparent")}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={saveCat} disabled={catSaving || !catForm.name.trim()} className="flex-1 btn-primary">
                  {catSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Save
                </Button>
                <Button variant="outline" onClick={() => setCatDialog({ open: false, editing: null })} className="flex-1">Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Category grid (folder view)
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Piano Hero — Song Categories</h2>
          <p className="text-sm text-muted-foreground">Organise songs into folders for students</p>
        </div>
        <Button onClick={openNewCat} className="btn-primary gap-2">
          <Plus className="w-4 h-4" /> New Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-16 text-center space-y-2">
            <Folder className="w-12 h-12 mx-auto opacity-30" />
            <p className="text-muted-foreground">No categories yet. Create your first folder.</p>
            <Button onClick={openNewCat} className="btn-primary mt-2 gap-2"><Plus className="w-4 h-4" />New Category</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map(cat => (
            <Card
              key={cat.id}
              className="bg-card border-border hover:border-primary/50 transition-all duration-200 cursor-pointer group"
              onClick={() => setOpenCategory(cat)}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: cat.color + "25", border: `1.5px solid ${cat.color}55` }}>
                    <FolderOpen className="w-6 h-6" style={{ color: cat.color }} />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => openEditCat(cat)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(cat)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="font-semibold">{cat.name}</p>
                  {cat.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{cat.description}</p>}
                </div>
                <p className="text-xs text-muted-foreground">{cat.songCount} song{cat.songCount !== 1 ? "s" : ""}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Unassigned songs summary */}
      {unassignedSongs.length > 0 && (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{unassignedSongs.length}</span> song{unassignedSongs.length !== 1 ? "s" : ""} not yet assigned to a category:&nbsp;
              {unassignedSongs.slice(0, 5).map(s => s.title).join(", ")}{unassignedSongs.length > 5 ? ` +${unassignedSongs.length - 5} more` : ""}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit category dialog */}
      <Dialog open={catDialog.open} onOpenChange={(o) => !o && setCatDialog({ open: false, editing: null })}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{catDialog.editing ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                className="bg-secondary border-border" placeholder="e.g. Beginner Classics" />
            </div>
            <div className="space-y-2">
              <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })}
                className="bg-secondary border-border" placeholder="Short description…" />
            </div>
            <div className="space-y-2">
              <Label>Folder Color</Label>
              <div className="flex gap-2 flex-wrap">
                {PALETTE.map(c => (
                  <button key={c} onClick={() => setCatForm({ ...catForm, color: c })}
                    className={cn("w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                      catForm.color === c ? "border-white scale-110" : "border-transparent")}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <Button onClick={saveCat} disabled={catSaving || !catForm.name.trim()} className="flex-1 btn-primary">
                {catSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {catDialog.editing ? "Save Changes" : "Create Category"}
              </Button>
              <Button variant="outline" onClick={() => setCatDialog({ open: false, editing: null })} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Delete Category</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Delete <span className="font-semibold text-foreground">"{deleteTarget?.name}"</span>? Songs inside will be unassigned but not deleted.
            </p>
            <div className="flex gap-3">
              <Button variant="destructive" onClick={deleteCat} disabled={deleting} className="flex-1">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Delete
              </Button>
              <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagePianoHero;
