import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface NoteFormProps {
  courseId: string;
  noteId?: string;
  initialData?: {
    title: string;
    content: string;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

const NoteForm = ({
  courseId,
  noteId,
  initialData,
  onSuccess,
  onCancel,
}: NoteFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    content: initialData?.content || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (noteId) {
        // Update existing note
        const { error } = await supabase
          .from("course_notes")
          .update(formData)
          .eq("id", noteId);

        if (error) throw error;
      } else {
        // Create new note
        const { error } = await supabase.from("course_notes").insert({
          course_id: courseId,
          ...formData,
          order: Date.now(),
        });

        if (error) throw error;
      }

      onSuccess();
    } catch (err) {
      console.error("Error saving note:", err);
      alert("Failed to save note");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="fixed inset-0 z-50 m-4 max-w-2xl mx-auto my-auto bg-card border-border/30 p-6 overflow-y-auto">
      <h2 className="text-2xl font-bold text-foreground mb-6">
        {noteId ? "Edit Note" : "Add Note"}
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
            placeholder="e.g., Music Theory Basics"
            className="bg-background/50 border-border/30"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Content (Markdown supported)
          </label>
          <Textarea
            required
            value={formData.content}
            onChange={(e) =>
              setFormData({ ...formData, content: e.target.value })
            }
            placeholder="Write your notes here. Markdown formatting is supported."
            className="bg-background/50 border-border/30 min-h-64 font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-2">
            💡 Tip: Use **bold**, *italic*, # headers, - lists, etc. for
            formatting
          </p>
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
            {noteId ? "Update Note" : "Add Note"}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default NoteForm;
