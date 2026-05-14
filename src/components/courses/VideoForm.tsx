import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface VideoFormProps {
  courseId: string;
  videoId?: string;
  initialData?: {
    title: string;
    description: string;
    video_url: string;
    duration: number;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

const VideoForm = ({
  courseId,
  videoId,
  initialData,
  onSuccess,
  onCancel,
}: VideoFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    video_url: initialData?.video_url || "",
    duration: initialData?.duration || 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (videoId) {
        // Update existing video
        const { error } = await supabase
          .from("course_videos")
          .update(formData)
          .eq("id", videoId);

        if (error) throw error;
      } else {
        // Create new video
        const { error } = await supabase.from("course_videos").insert({
          course_id: courseId,
          ...formData,
          order: Date.now(),
        });

        if (error) throw error;
      }

      onSuccess();
    } catch (err) {
      console.error("Error saving video:", err);
      toast({ title: "Failed to save video", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="fixed inset-0 z-50 m-4 max-w-2xl mx-auto my-auto bg-card border-border/30 p-6 overflow-y-auto">
      <h2 className="text-2xl font-bold text-foreground mb-6">
        {videoId ? "Edit Video" : "Add Video"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Title
          </label>
          <Input
            required
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            placeholder="e.g., Lesson 1: Piano Basics"
            className="bg-background/50 border-border/30"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Description
          </label>
          <Textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Describe what students will learn"
            className="bg-background/50 border-border/30 min-h-24"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Video URL
          </label>
          <Input
            required
            type="url"
            value={formData.video_url}
            onChange={(e) =>
              setFormData({ ...formData, video_url: e.target.value })
            }
            placeholder="YouTube, Vimeo, or direct video URL"
            className="bg-background/50 border-border/30"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Supports: YouTube, Vimeo, or direct MP4/HLS links
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Duration (minutes)
          </label>
          <Input
            required
            type="number"
            min="1"
            value={formData.duration}
            onChange={(e) =>
              setFormData({ ...formData, duration: parseInt(e.target.value) })
            }
            placeholder="e.g., 15"
            className="bg-background/50 border-border/30"
          />
        </div>

        <div className="flex gap-3 justify-end pt-4">
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
            {videoId ? "Update Video" : "Add Video"}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default VideoForm;
