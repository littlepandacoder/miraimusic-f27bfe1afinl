import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { PianoTheoryHub } from "@/components/PianoTheoryHub";

export default function PianoTheoryPage() {
  const { user, loading, hasRole } = useAuth();

  if (loading || !user) {
    return null;
  }

  return (
    <DashboardLayout
      title="Piano Theory"
      role={hasRole("student") ? "student" : hasRole("teacher") ? "teacher" : "admin"}
    >
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <PianoTheoryHub userId={user.id} />
      </div>
    </DashboardLayout>
  );
}
