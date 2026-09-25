import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { StudentLibrary } from "@/components/StudentLibrary";
import { ResourceLibrary } from "@/components/dashboard/admin/ResourceLibrary";

const LibraryPage = () => {
  const { user, loading, hasRole } = useAuth();

  if (loading || !user) {
    return null;
  }

  const isAdmin = hasRole("admin");
  const isTeacher = hasRole("teacher");
  const isStudent = hasRole("student");

  // Admin sees resource library for editing music sync
  if (isAdmin) {
    return (
      <DashboardLayout title="Resource Library" role="admin">
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <ResourceLibrary />
        </div>
      </DashboardLayout>
    );
  }

  // Teachers see resource library for editing music sync
  if (isTeacher) {
    return (
      <DashboardLayout title="Resource Library" role="teacher">
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <ResourceLibrary />
        </div>
      </DashboardLayout>
    );
  }

  // Students see library
  if (isStudent) {
    return (
      <DashboardLayout title="Resource Library" role="student">
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <StudentLibrary />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Resource Library" role="student">
      <div className="text-center">Access denied</div>
    </DashboardLayout>
  );
};

export default LibraryPage;
