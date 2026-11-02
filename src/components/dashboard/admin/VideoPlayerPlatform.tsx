import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Music,
  Video,
  Waves,
  FileMusic,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Download,
} from "lucide-react";

interface VideoProject {
  id: string;
  title: string;
  description: string;
  creator_id: string;
  creator_name: string;
  video_url: string | null;
  audio_url: string | null;
  waveform_data: string | null;
  sheet_music_url: string | null;
  midi_url: string | null;
  synchronization_status: "pending" | "processing" | "completed" | "failed";
  published: boolean;
  total_checkpoints: number;
  student_interactions: number;
  created_at: string;
  updated_at: string;
}

const VideoPlayerPlatform = () => {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "popular" | "status">("recent");

  // Form fields
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    creator_name: "",
  });

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("video_projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast({ title: "Error loading projects", description: error.message, variant: "destructive" });
      } else {
        setProjects((data as VideoProject[]) || []);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleAddProject = async () => {
    if (!formData.title.trim() || !formData.creator_name.trim()) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const { error } = await supabase.from("video_projects").insert({
        title: formData.title.trim(),
        description: formData.description.trim(),
        creator_id: authData.user?.id,
        creator_name: formData.creator_name.trim(),
        synchronization_status: "pending",
        published: false,
        total_checkpoints: 0,
        student_interactions: 0,
      });

      if (error) {
        toast({ title: "Error creating project", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Project created successfully" });
        setFormData({ title: "", description: "", creator_name: "" });
        setShowForm(false);
        fetchProjects();
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Delete this video project? This action cannot be undone.")) return;

    try {
      const { error } = await supabase.from("video_projects").delete().eq("id", id);
      if (error) {
        toast({ title: "Error deleting project", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Project deleted" });
        setProjects(prev => prev.filter(p => p.id !== id));
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const togglePublish = async (project: VideoProject) => {
    try {
      const { error } = await supabase
        .from("video_projects")
        .update({ published: !project.published })
        .eq("id", project.id);

      if (error) {
        toast({ title: "Error updating project", description: error.message, variant: "destructive" });
      } else {
        setProjects(prev =>
          prev.map(p => (p.id === project.id ? { ...p, published: !p.published } : p))
        );
        toast({ title: project.published ? "Project unpublished" : "Project published" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const getSyncStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pending", className: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
      processing: { label: "Processing", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
      completed: { label: "Completed", className: "bg-green-500/20 text-green-400 border-green-500/30" },
      failed: { label: "Failed", className: "bg-red-500/20 text-red-400 border-red-500/30" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const sortedProjects = [...projects].sort((a, b) => {
    if (sortBy === "recent") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else if (sortBy === "popular") {
      return b.student_interactions - a.student_interactions;
    } else {
      const statusOrder = { completed: 0, processing: 1, failed: 2, pending: 3 };
      return (
        (statusOrder[a.synchronization_status as keyof typeof statusOrder] || 3) -
        (statusOrder[b.synchronization_status as keyof typeof statusOrder] || 3)
      );
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Video className="w-8 h-8 text-primary" />
            Musicable Video Player Platform
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage interactive piano tutorial projects with MIDI synchronization
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </div>

      {/* Create Project Form */}
      {showForm && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Create New Video Project</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Project Title *</label>
              <Input
                placeholder="e.g., Chopin Nocturne Tutorial"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-background border-border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Creator Name *</label>
              <Input
                placeholder="Piano teacher or instructor name"
                value={formData.creator_name}
                onChange={(e) => setFormData({ ...formData, creator_name: e.target.value })}
                className="bg-background border-border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Textarea
                placeholder="Describe the piano tutorial and learning objectives..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-background border-border resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAddProject}
                disabled={saving}
                className="bg-primary hover:bg-primary/90"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Create Project
              </Button>
              <Button
                onClick={() => setShowForm(false)}
                variant="outline"
                className="border-border"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <Video className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Total Projects</p>
              <p className="text-3xl font-bold">{projects.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Published</p>
              <p className="text-3xl font-bold">{projects.filter(p => p.published).length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <BarChart3 className="w-8 h-8 text-cyan mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Total Interactions</p>
              <p className="text-3xl font-bold">{projects.reduce((sum, p) => sum + p.student_interactions, 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <Music className="w-8 h-8 text-lime mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Total Checkpoints</p>
              <p className="text-3xl font-bold">{projects.reduce((sum, p) => sum + p.total_checkpoints, 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sort Controls */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={sortBy === "recent" ? "default" : "outline"}
          onClick={() => setSortBy("recent")}
          className="border-border"
        >
          Recent
        </Button>
        <Button
          size="sm"
          variant={sortBy === "popular" ? "default" : "outline"}
          onClick={() => setSortBy("popular")}
          className="border-border"
        >
          Popular
        </Button>
        <Button
          size="sm"
          variant={sortBy === "status" ? "default" : "outline"}
          onClick={() => setSortBy("status")}
          className="border-border"
        >
          By Status
        </Button>
      </div>

      {/* Projects List */}
      <div className="space-y-3">
        {sortedProjects.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <Video className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No video projects yet. Create one to get started!</p>
            </CardContent>
          </Card>
        ) : (
          sortedProjects.map((project) => (
            <Card
              key={project.id}
              className="bg-card border-border overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
            >
              <div
                className="p-4"
                onClick={() => setExpandedId(expandedId === project.id ? null : project.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold truncate">{project.title}</h3>
                      {project.published && <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Published</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{project.creator_name}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1">{project.description || "No description"}</p>
                    <div className="flex gap-4 mt-3 flex-wrap">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Waves className="w-3 h-3" />
                        Sync Status: {getSyncStatusBadge(project.synchronization_status)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Music className="w-3 h-3" />
                        {project.total_checkpoints} Checkpoints
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <BarChart3 className="w-3 h-3" />
                        {project.student_interactions} Interactions
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePublish(project);
                      }}
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      title={project.published ? "Unpublish" : "Publish"}
                    >
                      {project.published ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.id);
                      }}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === project.id && (
                <div className="border-t border-border bg-black/20 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Video className="w-4 h-4" /> Video Assets
                      </h4>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>Video: {project.video_url ? <span className="text-green-400">✓ Uploaded</span> : "—"}</p>
                        <p>Audio: {project.audio_url ? <span className="text-green-400">✓ Extracted</span> : "—"}</p>
                        <p>Waveform: {project.waveform_data ? <span className="text-green-400">✓ Generated</span> : "—"}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Music className="w-4 h-4" /> Music Assets
                      </h4>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>Sheet Music: {project.sheet_music_url ? <span className="text-green-400">✓ Imported</span> : "—"}</p>
                        <p>MIDI: {project.midi_url ? <span className="text-green-400">✓ Imported</span> : "—"}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold mb-2">Synchronization</h4>
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-background rounded h-2 overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              project.synchronization_status === "completed"
                                ? "bg-green-500 w-full"
                                : project.synchronization_status === "processing"
                                  ? "bg-blue-500 w-1/2"
                                  : project.synchronization_status === "failed"
                                    ? "bg-red-500 w-full"
                                    : "bg-gray-500 w-1/4"
                            }`}
                          />
                        </div>
                        {getSyncStatusBadge(project.synchronization_status)}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold mb-2">Created</h4>
                      <p className="text-xs text-muted-foreground">
                        {new Date(project.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/50 flex gap-2">
                    <Button size="sm" variant="outline" className="border-border flex items-center gap-2">
                      <Edit2 className="w-3 h-3" /> Edit Project
                    </Button>
                    <Button size="sm" variant="outline" className="border-border flex items-center gap-2">
                      <Download className="w-3 h-3" /> Export Report
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Feature Overview Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-cyan/10 border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            Platform Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex gap-2">
              <Video className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Video Upload & Processing</p>
                <p className="text-xs text-muted-foreground">Upload and extract audio from piano tutorial videos</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Waves className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Waveform Synchronization</p>
                <p className="text-xs text-muted-foreground">Visually sync audio, MIDI, and sheet music</p>
              </div>
            </div>
            <div className="flex gap-2">
              <FileMusic className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">MusicXML & MIDI Import</p>
                <p className="text-xs text-muted-foreground">Support for multiple music notation formats</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Music className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Interactive Checkpoints</p>
                <p className="text-xs text-muted-foreground">MIDI-gated learning with real piano keyboards</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Play className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Synchronized Playback</p>
                <p className="text-xs text-muted-foreground">Video, audio, and notation sync in real-time</p>
              </div>
            </div>
            <div className="flex gap-2">
              <BarChart3 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Student Analytics</p>
                <p className="text-xs text-muted-foreground">Track student progress and interactions</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoPlayerPlatform;
