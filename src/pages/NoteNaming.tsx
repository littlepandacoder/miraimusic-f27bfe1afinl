import { forwardRef } from "react";

const NoteNaming = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div ref={ref}>
      <iframe
        src="/note_naming.html"
        title="Note Naming — Musicable"
        className="w-full h-screen border-0"
        style={{ minHeight: "100vh" }}
        allow="autoplay; microphone"
      />
    </div>
  );
});

NoteNaming.displayName = "NoteNaming";

export default NoteNaming;