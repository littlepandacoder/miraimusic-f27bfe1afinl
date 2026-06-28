import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { StudentLibrary } from "@/components/StudentLibrary";
import { ResourceUploadManager } from "@/components/ResourceUploadManager";

const LibraryPage = () => {
  const { user, loading, hasRole } = useAuth();

  if (loading || !user) {
    return null;
  }

  const isAdmin = hasRole("admin");
  const isTeacher = hasRole("teacher");
  const isStudent = hasRole("student");

  // Admin and Teachers see upload manager
  if (isAdmin || isTeacher) {
    return (
      <DashboardLayout
        title="Resource Library"
        role={isAdmin ? "admin" : "teacher"}
      >
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <ResourceUploadManager />
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
