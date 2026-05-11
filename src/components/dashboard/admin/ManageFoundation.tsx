import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  Plus,
  Edit,
  Trash2,
  Music,
  Trophy,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Lesson {
  id: string;
  title: string;
  duration: number;
  status: "draft" | "published" | "available";
}

interface Module {
  id: string;
  title: string;
  level: "beginner" | "intermediate" | "advanced";
  status: "locked" | "available" | "in-progress" | "completed";
  xpReward: number;
  lessons: Lesson[];
  icon: React.ElementType;
}


const SortableModuleCard = ({
  id,
  children,
}: {
  id: string;
  children: (props: { dragHandleProps: React.HTMLAttributes<HTMLDivElement>; isDragging: boolean }) => React.ReactNode;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ dragHandleProps: { ...attributes, ...listeners }, isDragging })}
    </div>
  );
};

interface SortableLessonProps {
  lesson: Lesson;
  index: number;
  moduleId: string;
  onTogglePublish: (moduleId: string, lesson: Lesson) => void;
  onEdit: () => void;
  onPreview: () => void;
  onDelete: () => void;
}

const SortableLesson = ({ lesson, index, moduleId, onTogglePublish, onEdit, onPreview, onDelete }: SortableLessonProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lesson.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-transparent transition-all",
        isDragging && "opacity-50 border-primary shadow-lg bg-muted/60 z-50"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground touch-none"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold text-muted-foreground w-5 text-center">
          {index + 1}
        </span>
        <div>
          <p className="font-medium">{lesson.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground">{lesson.duration} min</p>
            <Badge className={cn("text-xs px-1.5 py-0",
              lesson.status === "published"
                ? "bg-green-500/20 text-green-400 border-green-500/40"
                : "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
            )}>
              {lesson.status === "published" ? "Published" : "Draft"}
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant={lesson.status === "published" ? "outline" : "default"} onClick={() => onTogglePublish(moduleId, lesson)}>
          {lesson.status === "published" ? "Unpublish" : "Publish"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onEdit}>
          <Edit className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={onPreview}>
          Preview
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost" className="text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Lesson?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete "{lesson.title}". This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

const ManageFoundation = () => {
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false);
  const [selectedModuleForLesson, setSelectedModuleForLesson] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    moduleTitle: "",
    moduleXP: "100",
    moduleLevel: "beginner" as "beginner" | "intermediate" | "advanced",
    lessonTitle: "",
    lessonDuration: "20",
  });
  const { toast } = useToast();

  useEffect(() => {
    const loadFromDb = async () => {
      const { data: mods, error } = await (supabase as any)
        .from("foundation_modules")
        .select("id, title, level, xp_reward, sort_order")
        .order("sort_order");

      if (error) {
        console.error("Error loading foundation modules:", error.message);
        return;
      }

      if (!mods || mods.length === 0) {
        setModules([]);
        return;
      }

      const moduleIds = mods.map((m: any) => m.id);
      const { data: lessonsData } = await (supabase as any)
        .from("foundation_lessons")
        .select("id, module_id, title, duration_minutes, sort_order, status")
        .in("module_id", moduleIds)
        .order("sort_order");

      const lessonsByModule: Record<string, Lesson[]> = {};
      (lessonsData || []).forEach((l: any) => {
        if (!lessonsByModule[l.module_id]) lessonsByModule[l.module_id] = [];
        lessonsByModule[l.module_id].push({
          id: l.id,
          title: l.title,
          duration: l.duration_minutes || 20,
          status: l.status || "draft",
        });
      });

      setModules(mods.map((m: any) => ({
        id: m.id,
        title: m.title,
        level: m.level || "beginner",
        status: "available",
        xpReward: m.xp_reward || 0,
        icon: Music,
        lessons: lessonsByModule[m.id] || [],
      })));
    };

    loadFromDb();
  }, []);
  const handleAddModule = async () => {
    if (!formData.moduleTitle.trim()) return;

    try {
      const { data, error } = await (supabase as any).from("foundation_modules").insert({
        title: formData.moduleTitle,
        level: formData.moduleLevel,
        xp_reward: parseInt(formData.moduleXP) || 100,
        sort_order: modules.length,
      }).select().single();

      if (error) {
        toast({ title: "Error saving module", description: error.message, variant: "destructive" });
        return;
      }

      const newModule: Module = {
        id: data.id,
        title: data.title,
        level: data.level,
        status: "available",
        xpReward: data.xp_reward,
        icon: Music,
        lessons: [],
      };
      setModules(prev => [...prev, newModule]);
      toast({ title: "Module created" });
    } catch (err) {
      console.error(err);
      toast({ title: "Error creating module", variant: "destructive" });
    }

    resetModuleForm();
    setIsModuleDialogOpen(false);
  };

  const handleUpdateModule = () => {
    if (!editingModule || !formData.moduleTitle.trim()) return;

    setModules(modules.map(m => 
      m.id === editingModule.id 
        ? { ...m, title: formData.moduleTitle, level: formData.moduleLevel, xpReward: parseInt(formData.moduleXP) || 100 }
        : m
    ));

    (async () => {
      try {
        if (editingModule?.id) {
          const { error } = await (supabase as any).from("foundation_modules").update({
            title: formData.moduleTitle,
            level: formData.moduleLevel,
            xp_reward: parseInt(formData.moduleXP) || 100,
          }).eq("id", editingModule.id);
          if (error) console.debug("Update module failed:", error.message || error);
        }
      } catch (err) {
        console.error(err);
      }
    })();

    resetModuleForm();
    setEditingModule(null);
    setIsModuleDialogOpen(false);
  };

  const handleDeleteModule = (id: string) => {
    setModules(modules.filter(m => m.id !== id));
    (async () => {
      try {
        const { error } = await (supabase as any).from("foundation_modules").delete().eq("id", id);
        if (error) console.debug("Delete module failed:", error.message || error);
      } catch (err) {
        console.error(err);
      }
    })();
  };

  // Lesson CRUD (local state only)
  const handleAddLesson = () => {
    if (!formData.lessonTitle.trim() || !selectedModuleForLesson) return;

    const newLesson: Lesson = {
      id: crypto.randomUUID(),
      title: formData.lessonTitle,
      duration: parseInt(formData.lessonDuration) || 20,
      status: "available",
    };

    setModules(modules.map(m => 
      m.id === selectedModuleForLesson 
        ? { ...m, lessons: [...m.lessons, newLesson] }
        : m
    ));

    // Save a preview session locally so editors/previewer can pick up defaults
    try {
      const previewKey = `lesson_preview:${newLesson.id}`;
      const preview = {
        id: newLesson.id,
        title: newLesson.title,
        duration: newLesson.duration,
        moduleId: selectedModuleForLesson,
        notes: "",
        videos: [],
        status: "draft",
      };
      localStorage.setItem(previewKey, JSON.stringify(preview));
    } catch (e) {
      // ignore storage errors
    }

    (async () => {
      try {
        const currentCount = modules.find(m => m.id === selectedModuleForLesson)?.lessons.length || 0;
        const lessonPayload = {
          id: newLesson.id,
          module_id: selectedModuleForLesson,
          title: newLesson.title,
          duration_minutes: newLesson.duration,
          sort_order: currentCount,
        };
        // Create in both tables with the same ID so LessonEditor and LessonViewer can find it
        await Promise.all([
          (supabase as any).from("foundation_lessons").insert(lessonPayload),
          (supabase as any).from("module_lessons").insert({
            ...lessonPayload,
            status: "draft",
          }),
        ]);
      } catch (err) {
        console.error(err);
      }
    })();

    resetLessonForm();
    setIsLessonDialogOpen(false);
    // Open preview of the newly added lesson
    navigate(`/dashboard/foundation/lesson-viewer/${selectedModuleForLesson}/${newLesson.id}?preview=1`);
  };

  const handleUpdateLesson = () => {
    if (!editingLesson || !selectedModuleForLesson || !formData.lessonTitle.trim()) return;

    setModules(modules.map(m => 
      m.id === selectedModuleForLesson 
        ? { 
            ...m, 
            lessons: m.lessons.map(l => 
              l.id === editingLesson.id 
                ? { ...l, title: formData.lessonTitle, duration: parseInt(formData.lessonDuration) || 20 }
                : l
            )
          }
        : m
    ));

    // Update in both tables so title stays in sync
    (async () => {
      try {
        if (editingLesson?.id) {
          const payload = {
            title: formData.lessonTitle,
            duration_minutes: parseInt(formData.lessonDuration) || 20,
          };
          const [r1, r2] = await Promise.all([
            (supabase as any).from("foundation_lessons").update(payload).eq("id", editingLesson.id),
            (supabase as any).from("module_lessons").update(payload).eq("id", editingLesson.id),
          ]);
          if (r1.error) console.debug("Update foundation_lessons failed:", r1.error.message);
          if (r2.error) console.debug("Update module_lessons failed:", r2.error.message);
        }
      } catch (err) {
        console.error(err);
      }
    })();

    resetLessonForm();
    setEditingLesson(null);
    setIsLessonDialogOpen(false);
    // Update preview session so editor defaults reflect the latest edits
    try {
      const previewKey = `lesson_preview:${editingLesson?.id}`;
      const preview = {
        id: editingLesson?.id,
        title: formData.lessonTitle,
        duration: parseInt(formData.lessonDuration) || 20,
        moduleId: selectedModuleForLesson,
        notes: "",
        videos: [],
        status: "draft",
      };
      if (editingLesson?.id) localStorage.setItem(previewKey, JSON.stringify(preview));
    } catch (e) {
      // ignore
    }
    // Open preview after updating
    navigate(`/dashboard/foundation/lesson-viewer/${selectedModuleForLesson}/${editingLesson.id}?preview=1`);
  };

  const handleDeleteLesson = (moduleId: string, lessonId: string) => {
    setModules(modules.map(m => 
      m.id === moduleId 
        ? { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) }
        : m
    ));
    (async () => {
      try {
        await Promise.all([
          (supabase as any).from("foundation_lessons").delete().eq("id", lessonId),
          (supabase as any).from("module_lessons").delete().eq("id", lessonId),
        ]);
      } catch (err) {
        console.error(err);
      }
    })();
  };

  const resetModuleForm = () => {
    setFormData({
      ...formData,
      moduleTitle: "",
      moduleXP: "100",
      moduleLevel: "beginner",
    });
  };

  const resetLessonForm = () => {
    setFormData({
      ...formData,
      lessonTitle: "",
      lessonDuration: "20",
    });
  };

  const openEditModule = (module: Module) => {
    setEditingModule(module);
    setFormData({
      ...formData,
      moduleTitle: module.title,
      moduleXP: module.xpReward.toString(),
      moduleLevel: module.level,
    });
    setIsModuleDialogOpen(true);
  };

  const openEditLesson = (module: Module, lesson: Lesson) => {
    navigate(`/dashboard/foundation/lesson-editor/${module.id}/${lesson.id}`);
  };

  const handleTogglePublish = async (moduleId: string, lesson: Lesson) => {
    const newStatus = lesson.status === "published" ? "draft" : "published";
    setModules(prev => prev.map(m =>
      m.id === moduleId
        ? { ...m, lessons: m.lessons.map(l => l.id === lesson.id ? { ...l, status: newStatus } : l) }
        : m
    ));
    try {
      await Promise.all([
        (supabase as any).from("foundation_lessons").update({ status: newStatus }).eq("id", lesson.id),
        (supabase as any).from("module_lessons").update({ status: newStatus }).eq("id", lesson.id),
      ]);
      toast({ title: newStatus === "published" ? "Lesson published" : "Lesson unpublished" });
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleModuleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setModules(prev => {
      const oldIndex = prev.findIndex(m => m.id === active.id);
      const newIndex = prev.findIndex(m => m.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      reordered.forEach((mod, idx) => {
        (supabase as any).from("foundation_modules").update({ sort_order: idx }).eq("id", mod.id).then(({ error }: any) => {
          if (error) console.error("Failed to update module sort_order:", error.message);
        });
      });
      return reordered;
    });
  };

  const handleLessonDragEnd = async (event: DragEndEvent, moduleId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setModules(prev => prev.map(m => {
      if (m.id !== moduleId) return m;
      const oldIndex = m.lessons.findIndex(l => l.id === active.id);
      const newIndex = m.lessons.findIndex(l => l.id === over.id);
      const reordered = arrayMove(m.lessons, oldIndex, newIndex);
      // Persist new sort_order to DB
      reordered.forEach((lesson, idx) => {
        Promise.all([
          (supabase as any).from("foundation_lessons").update({ sort_order: idx }).eq("id", lesson.id),
          (supabase as any).from("module_lessons").update({ sort_order: idx }).eq("id", lesson.id),
        ]).catch(console.error);
      });
      return { ...m, lessons: reordered };
    }));
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "beginner":
        return "bg-green-500/20 text-green-400 border-green-500/50";
      case "intermediate":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "advanced":
        return "bg-red-500/20 text-red-400 border-red-500/50";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Manage Foundation Modules</h2>
        <Dialog open={isModuleDialogOpen} onOpenChange={setIsModuleDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="gap-2"
              onClick={() => {
                setEditingModule(null);
                resetModuleForm();
              }}
            >
              <Plus className="w-4 h-4" />
              Add Module
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingModule ? "Edit Module" : "Add New Module"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold">Module Title</label>
                <Input
                  value={formData.moduleTitle}
                  onChange={(e) => setFormData({ ...formData, moduleTitle: e.target.value })}
                  placeholder="Enter module title"
                  className="text-lg h-10 mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Level</label>
                <select
                  value={formData.moduleLevel}
                  onChange={(e) => setFormData({ ...formData, moduleLevel: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-md text-lg mt-1 bg-background"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold">XP Reward</label>
                <Input
                  type="number"
                  value={formData.moduleXP}
                  onChange={(e) => setFormData({ ...formData, moduleXP: e.target.value })}
                  placeholder="Enter XP reward"
                  className="text-lg h-10 mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModuleDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={editingModule ? handleUpdateModule : handleAddModule}>
                {editingModule ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Modules List */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleModuleDragEnd}>
        <SortableContext items={modules.map(m => m.id)} strategy={verticalListSortingStrategy}>
      <div className="space-y-4">
        {modules.map((module, moduleIndex) => (
          <SortableModuleCard key={module.id} id={module.id}>
            {({ dragHandleProps, isDragging }) => (
            <Card className={cn("bg-card border-border transition-all", isDragging && "opacity-50 shadow-2xl")}>
            <CardHeader
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setExpandedModuleId(expandedModuleId === module.id ? null : module.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  {/* Module drag handle */}
                  <div
                    {...dragHandleProps}
                    onClick={(e) => e.stopPropagation()}
                    className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground touch-none shrink-0"
                    title="Drag to reorder module"
                  >
                    <GripVertical className="w-5 h-5" />
                  </div>
                  <button className="p-0 hover:bg-muted rounded">
                    {expandedModuleId === module.id ? (
                      <ChevronUp className="w-6 h-6" />
                    ) : (
                      <ChevronDown className="w-6 h-6" />
                    )}
                  </button>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                      {moduleIndex + 1}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Module {moduleIndex + 1}</p>
                    <CardTitle className="text-2xl">{module.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={cn("text-xs", getLevelColor(module.level))}>
                        {module.level}
                      </Badge>
                      <Badge variant="outline" className="text-xs gap-1">
                        <Trophy className="w-3 h-3 text-yellow-400" />
                        {module.xpReward} XP
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {module.lessons.length} lessons
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditModule(module)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Module?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will delete "{module.title}" and all its lessons. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteModule(module.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>

            {/* Expanded Lessons */}
            {expandedModuleId === module.id && (
              <CardContent className="border-t">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Lessons</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // Open lesson editor for creating a new lesson
                      navigate(`/dashboard/foundation/lesson-editor/${module.id}/new`);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Lesson
                  </Button>
                </div>

                {module.lessons.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    No lessons yet. Add your first lesson!
                  </p>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => handleLessonDragEnd(e, module.id)}
                  >
                    <SortableContext
                      items={module.lessons.map(l => l.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {module.lessons.map((lesson, index) => (
                          <SortableLesson
                            key={lesson.id}
                            lesson={lesson}
                            index={index}
                            moduleId={module.id}
                            onTogglePublish={handleTogglePublish}
                            onEdit={() => openEditLesson(module, lesson)}
                            onPreview={() => navigate(`/dashboard/foundation/lesson-viewer/${module.id}/${lesson.id}?preview=1`)}
                            onDelete={() => handleDeleteLesson(module.id, lesson.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </CardContent>
            )}
            </Card>
            )}
          </SortableModuleCard>
        ))}
      </div>
        </SortableContext>
      </DndContext>

      {/* Lesson Dialog */}
      <Dialog open={isLessonDialogOpen} onOpenChange={setIsLessonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLesson ? "Edit Lesson" : "Add New Lesson"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold">Lesson Title</label>
              <Input
                value={formData.lessonTitle}
                onChange={(e) => setFormData({ ...formData, lessonTitle: e.target.value })}
                placeholder="Enter lesson title"
                className="text-lg h-10 mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Duration (minutes)</label>
              <Input
                type="number"
                value={formData.lessonDuration}
                onChange={(e) => setFormData({ ...formData, lessonDuration: e.target.value })}
                placeholder="Enter duration"
                className="text-lg h-10 mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLessonDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={editingLesson ? handleUpdateLesson : handleAddLesson}>
              {editingLesson ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageFoundation;
