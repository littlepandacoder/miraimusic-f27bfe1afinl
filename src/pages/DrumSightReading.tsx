import { forwardRef } from "react";

const DrumSightReading = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div ref={ref}>
      <iframe
        src="/drum-sight-reading.html"
        title="Drum Sight Reading — Musicable"
        className="w-full h-screen border-0"
        style={{ minHeight: "100vh" }}
        allow="autoplay; microphone"
      />
    </div>
  );
});

DrumSightReading.displayName = "DrumSightReading";

export default DrumSightReading;
