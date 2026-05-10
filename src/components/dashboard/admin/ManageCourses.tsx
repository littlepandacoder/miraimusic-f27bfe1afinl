import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical, Upload, Video, Loader2, HelpCircle, ChevronDown, ChevronRight, Check, X } from "lucide-react";

interface CourseModule {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  sort_order: number;
  is_published: boolean;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  sort_order: number;
}

const EMPTY_NEW_QUESTION = {
  question: "",
  options: ["", "", "", ""],
  correct_index: 0,
};

const ManageCourses = () => {
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // New module form
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Quiz state per module
  const [quizMap, setQuizMap] = useState<Record<string, QuizQuestion[]>>({});
  const [quizLoadedFor, setQuizLoadedFor] = useState<Set<string>>(new Set());
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
  const [addingQuestionFor, setAddingQuestionFor] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState(EMPTY_NEW_QUESTION);
  const [savingQuestion, setSavingQuestion] = useState(false);

  const fetchModules = async () => {
    const { data, error } = await supabase
      .from("course_modules")
      .select("*")
      .order("sort_order");
    if (error) {
      toast({ title: "Error loading courses", description: error.message, variant: "destructive" });
    } else {
      setModules((data as CourseModule[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchModules(); }, []);

  const fetchQuizForModule = async (moduleId: string) => {
    if (quizLoadedFor.has(moduleId)) return;
    const { data } = await (supabase as any)
      .from("module_quizzes")
      .select("id, question, options, correct_index, sort_order")
      .eq("module_id", moduleId)
      .order("sort_order");
    setQuizMap(prev => ({ ...prev, [moduleId]: (data as QuizQuestion[]) || [] }));
    setQuizLoadedFor(prev => new Set([...prev, moduleId]));
  };

  const toggleQuizSection = async (moduleId: string) => {
    if (expandedQuiz === moduleId) {
      setExpandedQuiz(null);
      return;
    }
    setExpandedQuiz(moduleId);
    await fetchQuizForModule(moduleId);
  };

  const addModule = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("course_modules").insert({
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      sort_order: modules.length,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Module added" });
      setNewTitle("");
      setNewDescription("");
      setShowForm(false);
      fetchModules();
    }
    setSaving(false);
  };

  const togglePublished = async (mod: CourseModule) => {
    const { error } = await supabase
      .from("course_modules")
      .update({ is_published: !mod.is_published })
      .eq("id", mod.id);
    if (!error) {
      setModules(prev => prev.map(m => m.id === mod.id ? { ...m, is_published: !m.is_published } : m));
    }
  };

  const deleteModule = async (id: string) => {
    if (!confirm("Delete this module and all student progress?")) return;
    const { error } = await supabase.from("course_modules").delete().eq("id", id);
    if (!error) {
      setModules(prev => prev.filter(m => m.id !== id));
      toast({ title: "Module deleted" });
    }
  };

  const handleVideoUpload = async (moduleId: string, file: File) => {
    setUploadingId(moduleId);
    const ext = file.name.split(".").pop();
    const path = `${moduleId}/video.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("course-videos")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploadingId(null);
      return;
    }

    const { data: urlData } = supabase.storage.from("course-videos").getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("course_modules")
      .update({ video_url: urlData.publicUrl })
      .eq("id", moduleId);

    if (!updateError) {
      setModules(prev => prev.map(m => m.id === moduleId ? { ...m, video_url: urlData.publicUrl } : m));
      toast({ title: "Video uploaded!" });
    }
    setUploadingId(null);
  };

  const saveQuizQuestion = async (moduleId: string) => {
    if (!newQuestion.question.trim()) return;
    const hasEmptyOption = newQuestion.options.some(o => !o.trim());
    if (hasEmptyOption) {
      toast({ title: "Fill in all 4 answer options", variant: "destructive" });
      return;
    }
    setSavingQuestion(true);
    const currentQuestions = quizMap[moduleId] || [];
    const { data, error } = await (supabase as any).from("module_quizzes").insert({
      module_id: moduleId,
      question: newQuestion.question.trim(),
      options: newQuestion.options.map(o => o.trim()),
      correct_index: newQuestion.correct_index,
      sort_order: currentQuestions.length,
    }).select().single();

    if (error) {
      toast({ title: "Error saving question", description: error.message, variant: "destructive" });
    } else {
      setQuizMap(prev => ({ ...prev, [moduleId]: [...(prev[moduleId] || []), data as QuizQuestion] }));
      setNewQuestion(EMPTY_NEW_QUESTION);
      setAddingQuestionFor(null);
      toast({ title: "Question added" });
    }
    setSavingQuestion(false);
  };

  const deleteQuizQuestion = async (moduleId: string, questionId: string) => {
    await (supabase as any).from("module_quizzes").delete().eq("id", questionId);
    setQuizMap(prev => ({ ...prev, [moduleId]: (prev[moduleId] || []).filter(q => q.id !== questionId) }));
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Course Modules</h2>
          <p className="text-sm text-muted-foreground">Upload videos and manage your course content</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" /> Add Module
        </Button>
      </div>

      {showForm && (
        <Card className="bg-card border-border">
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Introduction to Piano" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="What this module covers..." />
            </div>
            <div className="flex gap-2">
              <Button onClick={addModule} disabled={saving || !newTitle.trim()}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Module
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {modules.length === 0 && !showForm ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No course modules yet. Click "Add Module" to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {modules.map((mod, idx) => (
            <Card key={mod.id} className="bg-card border-border">
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground pt-1">
                    <GripVertical className="w-4 h-4" />
                    <span className="text-xs font-mono w-6 text-center">{idx + 1}</span>
                  </div>

                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">{mod.title}</h3>
                        {mod.description && <p className="text-sm text-muted-foreground">{mod.description}</p>}
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <Switch checked={mod.is_published} onCheckedChange={() => togglePublished(mod)} />
                          <Label className="text-xs">{mod.is_published ? "Published" : "Draft"}</Label>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteModule(mod.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Video upload area */}
                    {mod.video_url ? (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
                        <Video className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="text-sm truncate flex-1">Video uploaded</span>
                        <label className="cursor-pointer">
                          <Button variant="outline" size="sm" asChild>
                            <span>Replace</span>
                          </Button>
                          <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={e => e.target.files?.[0] && handleVideoUpload(mod.id, e.target.files[0])}
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-3 p-6 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
                        {uploadingId === mod.id ? (
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Click to upload video</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={e => e.target.files?.[0] && handleVideoUpload(mod.id, e.target.files[0])}
                        />
                      </label>
                    )}

                    {/* Quiz section toggle */}
                    <button
                      onClick={() => toggleQuizSection(mod.id)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                    >
                      {expandedQuiz === mod.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <HelpCircle className="w-4 h-4" />
                      <span>Quiz</span>
                      {quizLoadedFor.has(mod.id) && (
                        <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                          {(quizMap[mod.id] || []).length} question{(quizMap[mod.id] || []).length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </button>

                    {/* Quiz editor */}
                    {expandedQuiz === mod.id && (
                      <div className="pl-4 border-l border-border space-y-3">
                        {(quizMap[mod.id] || []).map((q, qi) => (
                          <div key={q.id} className="p-3 rounded-lg bg-secondary space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium flex-1">
                                <span className="text-primary mr-1">{qi + 1}.</span>{q.question}
                              </p>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 flex-shrink-0"
                                onClick={() => deleteQuizQuestion(mod.id, q.id)}
                              >
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {q.options.map((opt, oi) => (
                                <div
                                  key={oi}
                                  className={`text-xs px-2 py-1 rounded flex items-center gap-1.5 ${oi === q.correct_index ? "bg-green-500/20 text-green-400" : "bg-background/50"}`}
                                >
                                  {oi === q.correct_index && <Check className="w-3 h-3 flex-shrink-0" />}
                                  {opt}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                        {addingQuestionFor === mod.id ? (
                          <div className="p-3 rounded-lg border border-border space-y-3">
                            <Input
                              placeholder="Question text"
                              value={newQuestion.question}
                              onChange={e => setNewQuestion(q => ({ ...q, question: e.target.value }))}
                              className="bg-secondary border-border"
                            />
                            <div className="space-y-2">
                              {newQuestion.options.map((opt, oi) => (
                                <div key={oi} className="flex items-center gap-2">
                                  <button
                                    onClick={() => setNewQuestion(q => ({ ...q, correct_index: oi }))}
                                    className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${newQuestion.correct_index === oi ? "border-green-500 bg-green-500/20" : "border-border"}`}
                                    title="Mark as correct"
                                  >
                                    {newQuestion.correct_index === oi && <Check className="w-3 h-3 text-green-400" />}
                                  </button>
                                  <Input
                                    placeholder={`Option ${oi + 1}${newQuestion.correct_index === oi ? " (correct)" : ""}`}
                                    value={opt}
                                    onChange={e => {
                                      const opts = [...newQuestion.options];
                                      opts[oi] = e.target.value;
                                      setNewQuestion(q => ({ ...q, options: opts }));
                                    }}
                                    className="bg-secondary border-border text-sm"
                                  />
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground">Click the circle next to the correct answer.</p>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => saveQuizQuestion(mod.id)} disabled={savingQuestion}>
                                {savingQuestion ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                Save Question
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => { setAddingQuestionFor(null); setNewQuestion(EMPTY_NEW_QUESTION); }}>
                                <X className="w-3 h-3 mr-1" /> Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => { setAddingQuestionFor(mod.id); setNewQuestion(EMPTY_NEW_QUESTION); }}
                          >
                            <Plus className="w-3 h-3" /> Add Question
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageCourses;
