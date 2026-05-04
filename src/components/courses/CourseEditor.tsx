import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CourseEditorProps {
  course?: {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    price: number;
    level: "beginner" | "intermediate" | "advanced";
  };
  onSave: () => void;
  onCancel: () => void;
}

const CourseEditor = ({ course, onSave, onCancel }: CourseEditorProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: course?.title || "",
    description: course?.description || "",
    thumbnail: course?.thumbnail || "",
    price: course?.price || 0,
    level: (course?.level || "beginner") as "beginner" | "intermediate" | "advanced",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      if (course?.id) {
        // Update existing course
        const { error } = await supabase
          .from("courses")
          .update(formData)
          .eq("id", course.id);

        if (error) throw error;
      } else {
        // Create new course
        const { error } = await supabase.from("courses").insert({
          ...formData,
          instructor_id: user.id,
          instructor_name: user.user_metadata?.full_name || "Instructor",
        });

        if (error) throw error;
      }

      onSave();
    } catch (err) {
      console.error("Error saving course:", err);
      alert("Failed to save course");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/30">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={20} />
            Back
          </Button>
        </div>
      </nav>

      <main className="pt-24 pb-20">
        <section className="py-12">
          <div className="container mx-auto px-4 max-w-2xl">
            <Card className="p-8 bg-card/50 border-border/30">
              <h1 className="text-3xl font-black text-foreground mb-8">
                {course ? "Edit Course" : "Create New Course"}
              </h1>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Course Title *
                  </label>
                  <Input
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="e.g., Complete Piano Masterclass"
                    className="bg-background/50 border-border/30"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Description *
                  </label>
                  <Textarea
                    required
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe your course and what students will learn"
                    className="bg-background/50 border-border/30 min-h-24"
                  />
                </div>

                {/* Thumbnail URL */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Thumbnail Image URL
                  </label>
                  <Input
                    type="url"
                    value={formData.thumbnail}
                    onChange={(e) =>
                      setFormData({ ...formData, thumbnail: e.target.value })
                    }
                    placeholder="https://example.com/image.jpg"
                    className="bg-background/50 border-border/30"
                  />
                  {formData.thumbnail && (
                    <img
                      src={formData.thumbnail}
                      alt="Preview"
                      className="mt-3 max-h-32 rounded-lg border border-border/30"
                      onError={() => console.log("Image failed to load")}
                    />
                  )}
                </div>

                {/* Level */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Difficulty Level *
                  </label>
                  <Select
                    value={formData.level}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, level: value })
                    }
                  >
                    <SelectTrigger className="bg-background/50 border-border/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Price (included with subscription)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price: parseFloat(e.target.value),
                        })
                      }
                      placeholder="0.00"
                      className="bg-background/50 border-border/30 pl-8"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    This course will be available to all subscribers
                  </p>
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 justify-end pt-6 border-t border-border/30">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-pink hover:bg-pink/90 gap-2"
                    disabled={loading}
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    {course ? "Update Course" : "Create Course"}
                  </Button>
                </div>
              </form>

              {/* Help Text */}
              <div className="mt-8 p-4 bg-background/30 rounded-lg border border-border/30">
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  💡 Next Steps
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>
                    • After creating the course, you can add videos and notes to
                    it
                  </li>
                  <li>• Videos can be from YouTube, Vimeo, or direct links</li>
                  <li>• Notes support Markdown formatting</li>
                  <li>• All courses are visible to subscribers</li>
                </ul>
              </div>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
};

export default CourseEditor;
