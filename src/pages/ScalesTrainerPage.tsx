import { useEffect } from "react";
import { Music } from "lucide-react";

export default function ScalesTrainerPage() {
  useEffect(() => {
    window.open("/scales-trainer.html", "_blank", "width=1400,height=900,left=100,top=100");
    // Optionally redirect back
    // window.history.back();
  }, []);

  return (
    <div className="w-full h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Music className="w-8 h-8 text-primary animate-pulse" />
        </div>
        <p className="text-muted-foreground mb-2">Opening Scales & Arpeggios Trainer...</p>
        <p className="text-xs text-muted-foreground">If the window didn't open, please check your pop-up blocker.</p>
      </div>
    </div>
  );
}
