import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Upload, Loader2, X, ChevronUp, ChevronDown, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";

interface StudentVideo {
  id: string;
  name: string;
  age: number;
  achievement: string;
  quote: string;
  icon: string;
  video_url: string | null;
  thumbnail_url: string | null;
  pan_x: number;
  pan_y: number;
  sort_order: number;
  created_at: string;
}

const ManageStudentVideos = () => {
  const [students, setStudents] = useState<StudentVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [showForm, setShowForm] = useState(false);

  // New student form
  const [newName, setNewName] = useState("");
  const [newAge, setNewAge] = useState("8");
  const [newAchievement, setNewAchievement] = useState("");
  const [newQuote, setNewQuote] = useState("");
  const [newIcon, setNewIcon] = useState("🎹");

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from("student_testimonials")
      .select("*")
      .order("sort_order");

    if (error) {
      toast({ title: "Error loading students", description: error.message, variant: "destructive" });
    } else {
      setStudents((data as StudentVideo[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const addStudent = async () => {
    if (!newName.trim() || !newAchievement.trim() || !newQuote.trim()) {
      toast({ title: "Fill in all fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("student_testimonials").insert({
      name: newName.trim(),
      age: parseInt(newAge),
      achievement: newAchievement.trim(),
      quote: newQuote.trim(),
      icon: newIcon,
      sort_order: students.length,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Student added" });
      setNewName("");
      setNewAge("8");
      setNewAchievement("");
      setNewQuote("");
      setNewIcon("🎹");
      setShowForm(false);
      fetchStudents();
    }
    setSaving(false);
  };

  const deleteStudent = async (id: string) => {
    if (!confirm("Delete this student testimonial?")) return;
    const { error } = await supabase.from("student_testimonials").delete().eq("id", id);
    if (!error) {
      setStudents(prev => prev.filter(s => s.id !== id));
      toast({ title: "Student deleted" });
    }
  };

  const moveStudent = async (studentId: string, direction: "up" | "down") => {
    const currentIndex = students.findIndex(s => s.id === studentId);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= students.length) return;

    const currentStudent = students[currentIndex];
    const targetStudent = students[targetIndex];

    await supabase
      .from("student_testimonials")
      .update({ sort_order: targetStudent.sort_order })
      .eq("id", currentStudent.id);

    await supabase
      .from("student_testimonials")
      .update({ sort_order: currentStudent.sort_order })
      .eq("id", targetStudent.id);

    const newStudents = [...students];
    [newStudents[currentIndex], newStudents[targetIndex]] = [newStudents[targetIndex], newStudents[currentIndex]];
    setStudents(newStudents);
    toast({ title: `Moved ${direction}` });
  };

  const updatePan = async (studentId: string, panX: number, panY: number) => {
    await supabase
      .from("student_testimonials")
      .update({ pan_x: panX, pan_y: panY })
      .eq("id", studentId);

    setStudents(prev =>
      prev.map(s => (s.id === studentId ? { ...s, pan_x: panX, pan_y: panY } : s))
    );
  };

  const handleVideoUpload = async (studentId: string, file: File) => {
    setUploadingId(studentId);
    setUploadProgress({ [studentId]: 0 });

    const ext = file.name.split(".").pop();
    const path = `student-testimonials/${studentId}/video.${ext}`;

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        const current = prev[studentId] || 0;
        return { [studentId]: Math.min(current + Math.random() * 30, 90) };
      });
    }, 200);

    const { error: uploadError, data: uploadData } = await supabase.storage
      .from("student-videos")
      .upload(path, file, { upsert: true });

    clearInterval(progressInterval);

    if (uploadError) {
      console.error("Video upload error:", uploadError);
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploadingId(null);
      setUploadProgress({});
      return;
    }

    console.log("Video upload successful:", uploadData);

    setUploadProgress({ [studentId]: 95 });

    const { data: urlData } = supabase.storage.from("student-videos").getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("student_testimonials")
      .update({ video_url: urlData.publicUrl })
      .eq("id", studentId);

    setUploadProgress({ [studentId]: 100 });

    if (!updateError) {
      setStudents(prev =>
        prev.map(s => (s.id === studentId ? { ...s, video_url: urlData.publicUrl } : s))
      );
      toast({ title: "Video uploaded!" });
    }
    setUploadingId(null);
    setUploadProgress({});
  };

  const handleThumbnailUpload = async (studentId: string, file: File) => {
    setUploadingId(studentId);
    setUploadProgress({ [studentId]: 0 });

    const ext = file.name.split(".").pop();
    const path = `student-testimonials/${studentId}/thumbnail.${ext}`;

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        const current = prev[studentId] || 0;
        return { [studentId]: Math.min(current + Math.random() * 30, 90) };
      });
    }, 200);

    const { error: uploadError, data: uploadData } = await supabase.storage
      .from("student-videos")
      .upload(path, file, { upsert: true });

    clearInterval(progressInterval);

    if (uploadError) {
      console.error("Thumbnail upload error:", uploadError);
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploadingId(null);
      setUploadProgress({});
      return;
    }

    console.log("Thumbnail upload successful:", uploadData);

    setUploadProgress({ [studentId]: 95 });

    const { data: urlData } = supabase.storage.from("student-videos").getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("student_testimonials")
      .update({ thumbnail_url: urlData.publicUrl })
      .eq("id", studentId);

    setUploadProgress({ [studentId]: 100 });

    if (!updateError) {
      setStudents(prev =>
        prev.map(s => (s.id === studentId ? { ...s, thumbnail_url: urlData.publicUrl } : s))
      );
      toast({ title: "Thumbnail uploaded!" });
    }
    setUploadingId(null);
    setUploadProgress({});
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Student Testimonials</h2>
          <p className="text-sm text-muted-foreground">Upload videos and manage student stories for the "Our Students" page</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Student
        </Button>
      </div>

      {showForm && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Add New Student</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Emma"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Age</label>
                <Input
                  type="number"
                  value={newAge}
                  onChange={(e) => setNewAge(e.target.value)}
                  min="5"
                  max="20"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Achievement</label>
              <Input
                value={newAchievement}
                onChange={(e) => setNewAchievement(e.target.value)}
                placeholder="e.g., Trinity Grade 1 — Distinction"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Quote</label>
              <Textarea
                value={newQuote}
                onChange={(e) => setNewQuote(e.target.value)}
                placeholder="e.g., I can now play my favourite song!"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Icon Emoji</label>
              <Input
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                placeholder="🎹"
                maxLength="2"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={addStudent} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add
              </Button>
              <Button
                onClick={() => setShowForm(false)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {students.map((student) => (
          <Card key={student.id} className="bg-card border-border overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    {student.icon} {student.name}, {student.age}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{student.achievement}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => moveStudent(student.id, "up")}
                    disabled={students.indexOf(student) === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveStudent(student.id, "down")}
                    disabled={students.indexOf(student) === students.length - 1}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteStudent(student.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm italic text-muted-foreground">"{student.quote}"</p>

              {/* Video Upload */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">Video</label>
                {student.video_url ? (
                  <div className="space-y-2">
                    <p className="text-xs text-green-500 flex items-center gap-1">
                      ✓ Video uploaded
                    </p>
                    <video
                      src={student.video_url}
                      className="w-full h-24 bg-black rounded object-cover"
                      controls
                    />
                  </div>
                ) : (
                  <label className="border border-dashed border-border rounded p-3 cursor-pointer hover:bg-secondary transition-colors flex flex-col items-center justify-center min-h-24">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleVideoUpload(student.id, e.target.files[0]);
                        }
                      }}
                      className="hidden"
                      disabled={uploadingId === student.id}
                    />
                    {uploadingId === student.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground mt-1">
                          Uploading... {Math.round(uploadProgress[student.id] || 0)}%
                        </span>
                        <div className="w-full mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${uploadProgress[student.id] || 0}%` }}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground mt-1">Click to upload</span>
                      </>
                    )}
                  </label>
                )}
              </div>

              {/* Video Pan Controls */}
              {student.video_url && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-2 block">Video Position</label>
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <button
                      onClick={() => updatePan(student.id, student.pan_x - 10, student.pan_y)}
                      className="p-1 rounded hover:bg-secondary transition-colors"
                      title="Pan left"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => updatePan(student.id, student.pan_x, student.pan_y + 10)}
                      className="p-1 rounded hover:bg-secondary transition-colors"
                      title="Pan down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => updatePan(student.id, 0, 0)}
                      className="px-2 py-1 text-xs rounded border border-border hover:bg-secondary transition-colors"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => updatePan(student.id, student.pan_x, student.pan_y - 10)}
                      className="p-1 rounded hover:bg-secondary transition-colors"
                      title="Pan up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => updatePan(student.id, student.pan_x + 10, student.pan_y)}
                      className="p-1 rounded hover:bg-secondary transition-colors"
                      title="Pan right"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">X: {student.pan_x}px, Y: {student.pan_y}px</p>
                </div>
              )}

              {/* Thumbnail Upload */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">Thumbnail</label>
                {student.thumbnail_url ? (
                  <div className="space-y-2">
                    <p className="text-xs text-green-500 flex items-center gap-1">
                      ✓ Thumbnail uploaded
                    </p>
                    <img
                      src={student.thumbnail_url}
                      alt={student.name}
                      className="w-full h-20 bg-muted rounded object-cover"
                    />
                  </div>
                ) : (
                  <label className="border border-dashed border-border rounded p-3 cursor-pointer hover:bg-secondary transition-colors flex flex-col items-center justify-center min-h-20">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleThumbnailUpload(student.id, e.target.files[0]);
                        }
                      }}
                      className="hidden"
                      disabled={uploadingId === student.id}
                    />
                    {uploadingId === student.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground mt-1">
                          Uploading... {Math.round(uploadProgress[student.id] || 0)}%
                        </span>
                        <div className="w-full mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${uploadProgress[student.id] || 0}%` }}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground mt-1">Click to upload</span>
                      </>
                    )}
                  </label>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {students.length === 0 && !showForm && (
        <Card className="bg-card border-border">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No students added yet. Click "Add Student" to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ManageStudentVideos;
