import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, FileText, X, RefreshCw } from "lucide-react";
import { format, isAfter, addHours } from "date-fns";
import SlotCalendarView, { TimeSlot } from "../shared/SlotCalendarView";

interface Lesson {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  teacher_id: string | null;
  teacher_name?: string;
  notes?: { notes: string }[];
}

const MyLessons = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleLesson, setRescheduleLesson] = useState<Lesson | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const { toast } = useToast();

  const fetchLessons = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("lessons")
      .select("*")
      .eq("student_id", user.id)
      .order("scheduled_date", { ascending: false });

    if (data) {
      const lessonsWithDetails = await Promise.all(
        data.map(async (lesson) => {
          const [teacherRes, notesRes] = await Promise.all([
            lesson.teacher_id
              ? supabase.from("profiles").select("full_name").eq("user_id", lesson.teacher_id).maybeSingle()
              : Promise.resolve({ data: null }),
            supabase.from("lesson_notes").select("notes").eq("lesson_id", lesson.id).eq("is_visible_to_student", true),
          ]);
          return {
            ...lesson,
            teacher_name: teacherRes.data?.full_name || "TBA",
            notes: notesRes.data || [],
          };
        })
      );
      setLessons(lessonsWithDetails);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLessons();
  }, [user]);

  const fetchAvailableSlotsForReschedule = async (lesson: Lesson) => {
    setSlotsLoading(true);
    setRescheduleLesson(lesson);

    let query = supabase.from("available_slots").select("*").eq("is_active", true);
    if (lesson.teacher_id) {
      query = query.eq("teacher_id", lesson.teacher_id);
    }
    const { data } = await query;

    if (data) {
      const slotsWithNames = await Promise.all(
        data.map(async (slot) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", slot.teacher_id)
            .maybeSingle();
          return { ...slot, teacher_name: profile?.full_name || "Teacher" };
        })
      );
      setAvailableSlots(slotsWithNames);
    }
    setSlotsLoading(false);
  };

  const handleCancel = async (lessonId: string) => {
    const { error } = await supabase
      .from("lessons")
      .update({ status: "cancelled" })
      .eq("id", lessonId);

    if (error) {
      toast({ title: t("myLessons.errorTitle"), description: t("myLessons.cancelFailed"), variant: "destructive" });
    } else {
      toast({ title: t("myLessons.cancelledTitle"), description: t("myLessons.cancelledDesc") });
      setLessons(lessons.map(l => l.id === lessonId ? { ...l, status: "cancelled" } : l));
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleLesson || !selectedDate || !selectedSlot) return;

    const newDate = format(selectedDate, "yyyy-MM-dd");
    const { error } = await supabase
      .from("lessons")
      .update({
        scheduled_date: newDate,
        scheduled_time: selectedSlot.start_time,
        teacher_id: selectedSlot.teacher_id,
      })
      .eq("id", rescheduleLesson.id);

    if (error) {
      toast({ title: t("myLessons.errorTitle"), description: t("myLessons.rescheduleFailed"), variant: "destructive" });
    } else {
      toast({
        title: t("myLessons.rescheduledTitle"),
        description: t("myLessons.rescheduledDesc", {
          date: format(selectedDate, "EEE, MMM d"),
          time: selectedSlot.start_time.slice(0, 5),
        }),
      });
      setRescheduleLesson(null);
      setSelectedDate(undefined);
      setSelectedSlot(null);
      fetchLessons();
    }
  };

  const canModifyLesson = (lesson: Lesson) => {
    if (lesson.status !== "scheduled") return false;
    const lessonDateTime = new Date(`${lesson.scheduled_date}T${lesson.scheduled_time}`);
    return isAfter(lessonDateTime, addHours(new Date(), 24));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-cyan-500/20 text-cyan-400 border-cyan-500/50";
      case "completed": return "bg-green-500/20 text-green-400 border-green-500/50";
      case "cancelled": return "bg-destructive/20 text-destructive border-destructive/50";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) return <p className="text-muted-foreground">{t("myLessons.loading")}</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{t("myLessons.title")}</h2>

      {lessons.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t("myLessons.noLessons")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {lessons.map((lesson) => (
            <Card key={lesson.id} className="bg-card border-border">
              <CardContent className="py-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4 lg:gap-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      <span className="font-medium">
                        {format(new Date(lesson.scheduled_date), "EEE, MMM d, yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                      <span>{lesson.scheduled_time.slice(0, 5)}</span>
                    </div>
                    <span className="text-muted-foreground">{t("myLessons.with", { name: lesson.teacher_name })}</span>
                    <Badge className={getStatusColor(lesson.status)}>{lesson.status}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {lesson.notes && lesson.notes.length > 0 && (
                      <Badge variant="outline">
                        <FileText className="w-3 h-3 mr-1" />
                        {lesson.notes.length} {t("myLessons.notes")}
                      </Badge>
                    )}

                    {canModifyLesson(lesson) && (
                      <>
                        <Dialog
                          open={rescheduleLesson?.id === lesson.id}
                          onOpenChange={(open) => {
                            if (!open) {
                              setRescheduleLesson(null);
                              setSelectedDate(undefined);
                              setSelectedSlot(null);
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fetchAvailableSlotsForReschedule(lesson)}
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              {t("myLessons.reschedule")}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-card border-border max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>{t("myLessons.rescheduleTitle")}</DialogTitle>
                            </DialogHeader>
                            <div className="mt-4">
                              <p className="text-sm text-muted-foreground mb-4">
                                {t("myLessons.current", {
                                  date: format(new Date(lesson.scheduled_date), "EEE, MMM d"),
                                  time: lesson.scheduled_time.slice(0, 5),
                                })}
                              </p>
                              <SlotCalendarView
                                slots={availableSlots}
                                selectedDate={selectedDate}
                                onDateSelect={setSelectedDate}
                                selectedSlot={selectedSlot}
                                onSlotSelect={setSelectedSlot}
                                isLoading={slotsLoading}
                                showTeacherName={!lesson.teacher_id}
                              />
                            </div>
                            <DialogFooter className="mt-4">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setRescheduleLesson(null);
                                  setSelectedDate(undefined);
                                  setSelectedSlot(null);
                                }}
                              >
                                {t("myLessons.cancel")}
                              </Button>
                              <Button
                                onClick={handleReschedule}
                                disabled={!selectedDate || !selectedSlot}
                                className="btn-primary"
                              >
                                {t("myLessons.confirmReschedule")}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                              <X className="w-4 h-4 mr-1" />
                              {t("myLessons.cancel")}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-card border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("myLessons.cancelTitle")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("myLessons.cancelDesc", {
                                  date: format(new Date(lesson.scheduled_date), "EEEE, MMMM d"),
                                  time: lesson.scheduled_time.slice(0, 5),
                                })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("myLessons.keepLesson")}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleCancel(lesson.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {t("myLessons.yesCancelLesson")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}

                    {lesson.status === "scheduled" && !canModifyLesson(lesson) && (
                      <Badge variant="outline" className="text-muted-foreground">
                        <Clock className="w-3 h-3 mr-1" />
                        {t("myLessons.lessThan24h")}
                      </Badge>
                    )}
                  </div>
                </div>

                {lesson.notes && lesson.notes.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {lesson.notes.map((note, i) => (
                      <div key={i} className="bg-secondary/50 rounded-lg p-3 text-sm">
                        {note.notes}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyLessons;
