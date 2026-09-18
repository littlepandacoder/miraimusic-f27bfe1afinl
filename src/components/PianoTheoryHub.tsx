import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

interface PianoTheoryHubProps {
  userId: string;
}

export function PianoTheoryHub({ userId }: PianoTheoryHubProps) {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/piano-theory");
  }, [navigate]);

  return (
    <div className="w-full h-[calc(100vh-120px)] flex items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground mb-2">Loading Piano Theory...</p>
      </div>
    </div>
  );
}
