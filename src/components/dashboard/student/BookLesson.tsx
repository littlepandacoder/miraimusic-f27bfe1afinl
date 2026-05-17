import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import SlotCalendarView, { TimeSlot } from "../shared/SlotCalendarView";

const BookLesson = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSlots = async () => {
      const { data } = await supabase
        .from("available_slots")
        .select("*")
        .eq("is_active", true);

      if (data) {
        const slotsWithNames = await Promise.all(
          data.map(async (slot) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", slot.teacher_id)
              .single();
            return { ...slot, teacher_name: profile?.full_name || "Teacher" };
          })
        );
        setSlots(slotsWithNames);
      }
      setLoading(false);
    };
    fetchSlots();
  }, []);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const handleBook = async () => {
    if (!user || !selectedSlot || !selectedDate) return;
    setBooking(true);

    const { error } = await supabase.from("lessons").insert({
      student_id: user.id,
      teacher_id: selectedSlot.teacher_id,
      scheduled_date: format(selectedDate, "yyyy-MM-dd"),
      scheduled_time: selectedSlot.start_time,
      duration_minutes: 45,
    });

    if (error) {
      toast({
        title: t("bookLesson.errorTitle"),
        description: t("bookLesson.errorDesc"),
        variant: "destructive",
      });
    } else {
      toast({
        title: t("bookLesson.bookedTitle"),
        description: t("bookLesson.bookedDesc", {
          date: format(selectedDate, "EEEE, MMMM d"),
          time: selectedSlot.start_time.slice(0, 5),
        }),
      });
      setSelectedSlot(null);
      setSelectedDate(undefined);
    }
    setBooking(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{t("bookLesson.title")}</h2>

      <SlotCalendarView
        slots={slots}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        selectedSlot={selectedSlot}
        onSlotSelect={handleSlotSelect}
        isLoading={loading}
        showTeacherName={true}
        disablePastDates={true}
      />

      {selectedSlot && selectedDate && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">{t("bookLesson.bookingSummary")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">{t("bookLesson.date")}</p>
                <p className="font-medium">{format(selectedDate, "EEEE, MMMM d, yyyy")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("bookLesson.time")}</p>
                <p className="font-medium">
                  {selectedSlot.start_time.slice(0, 5)} - {selectedSlot.end_time.slice(0, 5)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("bookLesson.teacher")}</p>
                <p className="font-medium">{selectedSlot.teacher_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("bookLesson.duration")}</p>
                <p className="font-medium">{t("bookLesson.durationValue")}</p>
              </div>
            </div>
            <Button
              onClick={handleBook}
              disabled={booking}
              className="w-full btn-primary"
            >
              {booking ? t("bookLesson.booking") : t("bookLesson.confirmBooking")}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BookLesson;
