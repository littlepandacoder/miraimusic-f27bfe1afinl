import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

// The Piano Room entry now shows the sheet music library (same list and viewer as the Music Sheet page).
export default function PianoRoomPage() {
  const { user, loading, hasRole } = useAuth();

  if (loading || !user) {
    return null;
  }

  const role = hasRole("admin") ? "admin" : hasRole("teacher") ? "teacher" : "student";

  return (
    <DashboardLayout title="Piano Room" role={role}>
      <div className="flex-1 flex flex-col p-4 md:p-6">
        <iframe
          src="/sheet-music-practice/library.html"
          title="Sheet music library"
          className="w-full flex-1 rounded-lg border-0 bg-background"
          style={{ minHeight: "calc(100vh - 160px)" }}
        />
      </div>
    </DashboardLayout>
  );
}
