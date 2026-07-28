import { useEffect } from "react";

interface PianoTheoryHubProps {
  userId: string;
}

export function PianoTheoryHub({ userId }: PianoTheoryHubProps) {
  useEffect(() => {
    window.open("/piano-theory.html", "_blank");
    // Optionally redirect back or close current tab
    // window.history.back();
  }, []);

  return (
    <div className="w-full h-[calc(100vh-120px)] flex items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground mb-2">Opening Piano Theory...</p>
        <p className="text-xs text-muted-foreground">If the window didn't open, please check your pop-up blocker.</p>
      </div>
    </div>
  );
}
