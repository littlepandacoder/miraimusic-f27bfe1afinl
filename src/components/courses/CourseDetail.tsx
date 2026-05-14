import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Play, FileText, Plus, Trash2, Edit2,
  Loader2, AlertCircle, Music
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import VideoPlayer from "./VideoPlayer";
import NoteViewer from "./NoteViewer";
import VideoForm from "./VideoForm";
import NoteForm from "./NoteForm";

interface CourseDetailProps {
  course: {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    level: "beginner" | "intermediate" | "advanced";
    instructor_name: string;
  };
  isEnrolled: boolean;
  canEdit: boolean;
  onBack: () => void;
  onEdit: () => void;
}

interface Video {
  id: string;
  title: string;
  description: string;
  video_url: string;
  duration: number;
  order: number;
}

interface Note {
  id: string;
  title: string;
  content: string;
  order: number;
}

type EditMode = null | "video" | "note";

const CourseDetail = ({
  course,
  isEnrolled,
  canEdit,
  onBack,
  onEdit,
}: CourseDetailProps) => {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  // Fetch videos
  const { data: videos = [], isLoading: videosLoading, refetch: refetchVideos } = useQuery({
    queryKey: ["course-videos", course.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_videos")
        .select("*")
        .eq("course_id", course.id)
        .order("order", { ascending: true });

      if (error) throw error;
      return data as Video[];
    },
  });

  // Fetch notes
  const { data: notes = [], isLoading: notesLoading, refetch: refetchNotes } = useQuery({
    queryKey: ["course-notes", course.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_notes")
        .select("*")
        .eq("course_id", course.id)
        .order("order", { ascending: true });

      if (error) throw error;
      return data as Note[];
    },
  });

  // Set first video as selected
  useEffect(() => {
    if (videos.length > 0 && !selectedVideo) {
      setSelectedVideo(videos[0]);
    }
  }, [videos, selectedVideo]);

  // Delete video
  const handleDeleteVideo = async (videoId: string) => {
    setDeletingVideoId(videoId);
    try {
      const { error } = await supabase
        .from("course_videos")
        .delete()
        .eq("id", videoId);

      if (error) throw error;
      await refetchVideos();
      if (selectedVideo?.id === videoId) {
        setSelectedVideo(videos[0] || null);
      }
    } catch (err) {
      console.error("Error deleting video:", err);
      toast({ title: "Failed to delete video", variant: "destructive" });
    } finally {
      setDeletingVideoId(null);
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    setDeletingNoteId(noteId);
    try {
      const { error } = await supabase
        .from("course_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;
      await refetchNotes();
      if (selectedNote?.id === noteId) {
        setSelectedNote(notes[0] || null);
      }
    } catch (err) {
      console.error("Error deleting note:", err);
      toast({ title: "Failed to delete note", variant: "destructive" });
    } finally {
      setDeletingNoteId(null);
    }
  };

  if (!isEnrolled && !canEdit) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md text-center p-8 border-pink/20 bg-card/50">
          <div className="w-16 h-16 rounded-full bg-pink/20 flex items-center justify-center mx-auto mb-4">
            <Music className="w-8 h-8 text-pink" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Course Locked
          </h2>
          <p className="text-muted-foreground mb-6">
            Subscribe to access this course
          </p>
          <Button onClick={onBack} variant="outline">
            Back to Courses
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={onBack}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft size={20} />
              Back
            </Button>
            {canEdit && (
              <div className="flex gap-2">
                <Button
                  onClick={onEdit}
                  variant="outline"
                  className="gap-2"
                >
                  <Edit2 size={18} />
                  Edit Course
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-20">
        {/* Course Header */}
        <section className="bg-gradient-to-b from-pink/5 to-transparent border-b border-border/30 py-12">
          <div className="container mx-auto px-4">
            <Badge variant="outline" className="mb-4">
              {course.level.toUpperCase()}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black text-foreground mb-2">
              {course.title}
            </h1>
            <p className="text-lg text-muted-foreground mb-4">
              {course.description}
            </p>
            <p className="text-sm text-muted-foreground">
              by {course.instructor_name}
            </p>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Video Player - Main */}
              <div className="lg:col-span-2">
                {selectedVideo ? (
                  <VideoPlayer video={selectedVideo} />
                ) : (
                  <Card className="aspect-video bg-card/50 border-border/30 flex items-center justify-center">
                    <Play className="w-12 h-12 text-muted-foreground" />
                  </Card>
                )}

                {/* Video Description */}
                {selectedVideo && (
                  <Card className="mt-6 p-6 bg-card/50 border-border/30">
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                      {selectedVideo.title}
                    </h2>
                    <p className="text-muted-foreground">
                      {selectedVideo.description}
                    </p>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Videos Section */}
                <Card className="p-6 bg-card/50 border-border/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Play size={20} className="text-pink" />
                      Videos
                    </h3>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowVideoForm(true)}
                        className="gap-1 text-pink hover:bg-pink/10"
                      >
                        <Plus size={16} />
                      </Button>
                    )}
                  </div>

                  {videosLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : videos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No videos yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {videos.map((video) => (
                        <div
                          key={video.id}
                          className={`p-3 rounded-lg cursor-pointer transition-all ${
                            selectedVideo?.id === video.id
                              ? "bg-pink/20 border border-pink/50"
                              : "bg-background/50 border border-border/30 hover:border-pink/30"
                          }`}
                          onClick={() => setSelectedVideo(video)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {video.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {video.duration}m
                              </p>
                            </div>
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteVideo(video.id);
                                }}
                                disabled={deletingVideoId === video.id}
                                className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                              >
                                {deletingVideoId === video.id
                                  ? <Loader2 size={14} className="animate-spin" />
                                  : <Trash2 size={14} />}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Notes Section */}
                <Card className="p-6 bg-card/50 border-border/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <FileText size={20} className="text-pink" />
                      Notes
                    </h3>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowNoteForm(true)}
                        className="gap-1 text-pink hover:bg-pink/10"
                      >
                        <Plus size={16} />
                      </Button>
                    )}
                  </div>

                  {notesLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No notes yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {notes.map((note) => (
                        <div
                          key={note.id}
                          className={`p-3 rounded-lg cursor-pointer transition-all ${
                            selectedNote?.id === note.id
                              ? "bg-pink/20 border border-pink/50"
                              : "bg-background/50 border border-border/30 hover:border-pink/30"
                          }`}
                          onClick={() => setSelectedNote(note)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground truncate flex-1">
                              {note.title}
                            </p>
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteNote(note.id);
                                }}
                                disabled={deletingNoteId === note.id}
                                className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                              >
                                {deletingNoteId === note.id
                                  ? <Loader2 size={14} className="animate-spin" />
                                  : <Trash2 size={14} />}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>

            {/* Notes Viewer */}
            {selectedNote && (
              <Card className="mt-8 p-6 bg-card/50 border-border/30">
                <NoteViewer note={selectedNote} />
              </Card>
            )}

            {/* Forms */}
            {showVideoForm && (
              <VideoForm
                courseId={course.id}
                onSuccess={() => {
                  setShowVideoForm(false);
                  refetchVideos();
                }}
                onCancel={() => setShowVideoForm(false)}
              />
            )}

            {showNoteForm && (
              <NoteForm
                courseId={course.id}
                onSuccess={() => {
                  setShowNoteForm(false);
                  refetchNotes();
                }}
                onCancel={() => setShowNoteForm(false)}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default CourseDetail;
