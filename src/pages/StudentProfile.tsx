import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StudentProfileContent from "@/components/StudentProfileContent";

const StudentProfile = () => {
  const { user, loading, hasRole } = useAuth();
  const navigate = useNavigate();
  const [isStudent, setIsStudent] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    } else if (!loading) {
      setIsStudent(hasRole("student"));
      setIsTeacher(hasRole("teacher"));
    }
  }, [user, loading, navigate, hasRole]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isStudent && !isTeacher) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Access denied</p>
          <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout title="Student Profile" role={isStudent ? "student" : "teacher"}>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden px-4 py-4 border-b border-border flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Profile Settings</h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6">
            <div className="hidden md:block mb-8">
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold">Profile Settings</h1>
              <p className="text-muted-foreground mt-2">
                Manage your account and subscription
              </p>
            </div>

            <StudentProfileContent userId={user.id} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentProfile;
