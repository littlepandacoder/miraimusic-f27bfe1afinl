import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, ArrowLeft, Lock, AlertCircle } from "lucide-react";
import CourseCard from "@/components/courses/CourseCard";
import CourseDetail from "@/components/courses/CourseDetail";
import CourseEditor from "@/components/courses/CourseEditor";
import PayPalSubscriptionGate from "@/components/courses/PayPalSubscriptionGate";
import { supabase } from "@/lib/supabase";

type ViewMode = "list" | "detail" | "edit" | "create";

interface Course {
  id: string;
  title: string;
  description: string;
  instructor_id: string;
  instructor_name: string;
  thumbnail: string;
  price: number;
  level: "beginner" | "intermediate" | "advanced";
  created_at: string;
  updated_at: string;
  video_count: number;
  note_count: number;
}

const Courses = () => {
  const { user, loading, hasRole } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [hasValidSubscription, setHasValidSubscription] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  // Check PayPal subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setSubscriptionLoading(false);
        return;
      }

      try {
        // Check if user has active PayPal subscription
        const { data, error } = await supabase
          .from("user_subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "active")
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Error checking subscription:", error);
        }

        setHasValidSubscription(!!data);
      } catch (err) {
        console.error("Subscription check error:", err);
        setHasValidSubscription(false);
      } finally {
        setSubscriptionLoading(false);
      }
    };

    checkSubscription();
  }, [user]);

  // Fetch courses
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Course[];
    },
    enabled: !!user,
  });

  // Fetch user's enrolled courses
  const { data: enrolledCourseIds = [] } = useQuery({
    queryKey: ["enrolled-courses", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("course_enrollments")
        .select("course_id")
        .eq("user_id", user.id);

      if (error) throw error;
      return data.map((e) => e.course_id);
    },
    enabled: !!user && hasValidSubscription,
  });

  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  // Show PayPal subscription gate if not subscribed
  if (!hasValidSubscription && !hasRole("admin") && !hasRole("teacher")) {
    return <PayPalSubscriptionGate />;
  }

  // Handle view mode switching
  if (viewMode === "detail" && selectedCourse) {
    return (
      <CourseDetail
        course={selectedCourse}
        isEnrolled={enrolledCourseIds.includes(selectedCourse.id)}
        onBack={() => setViewMode("list")}
        canEdit={user.id === selectedCourse.instructor_id || hasRole("admin")}
        onEdit={() => setViewMode("edit")}
      />
    );
  }

  if (viewMode === "edit" && selectedCourse) {
    return (
      <CourseEditor
        course={selectedCourse}
        onSave={() => setViewMode("detail")}
        onCancel={() => setViewMode("detail")}
      />
    );
  }

  if (viewMode === "create") {
    return (
      <CourseEditor
        onSave={() => setViewMode("list")}
        onCancel={() => setViewMode("list")}
      />
    );
  }

  // Main courses list view
  const isInstructor = hasRole("teacher") || hasRole("admin");

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-2xl font-black text-foreground">
              Musicable
            </Link>
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft size={20} />
                Home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-20">
        {/* Header Section */}
        <section className="border-b border-border/30 bg-gradient-to-b from-pink/5 to-transparent py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-foreground mb-2">
                  Piano <span className="text-pink">Courses</span>
                </h1>
                <p className="text-muted-foreground text-lg">
                  Master piano with structured courses and expert guidance
                </p>
              </div>
              {isInstructor && (
                <Button
                  onClick={() => setViewMode("create")}
                  className="gap-2 bg-pink hover:bg-pink/90"
                >
                  <Plus size={20} />
                  Create Course
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Courses Grid */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            {coursesLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : courses.length === 0 ? (
              <Card className="p-12 text-center bg-background/50 border-pink/20">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">
                  No Courses Available
                </h3>
                <p className="text-muted-foreground mb-6">
                  Check back soon for new courses!
                </p>
                {isInstructor && (
                  <Button
                    onClick={() => setViewMode("create")}
                    className="gap-2 bg-pink hover:bg-pink/90"
                  >
                    <Plus size={20} />
                    Create the First Course
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    isEnrolled={enrolledCourseIds.includes(course.id)}
                    onClick={() => {
                      setSelectedCourse(course);
                      setViewMode("detail");
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Courses;
