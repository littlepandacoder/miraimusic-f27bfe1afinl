import { useEffect } from "react";
import { BookOpen } from "lucide-react";

export default function PianoTheoryPage() {
  useEffect(() => {
    window.location.href = "/piano-theory.html";
  }, []);

  return (
    <div className="w-full h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-8 h-8 text-primary animate-pulse" />
        </div>
        <p className="text-muted-foreground">Loading Piano Theory...</p>
      </div>
    </div>
  );
}
