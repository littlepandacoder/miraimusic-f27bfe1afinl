interface PianoTheoryHubProps {
  userId: string;
}

export function PianoTheoryHub({ userId }: PianoTheoryHubProps) {
  return (
    <iframe
      src="/piano-theory.html"
      title="Piano Theory — Musicable"
      className="w-full h-[calc(100vh-120px)] border-0"
      allow="autoplay; microphone"
    />
  );
}
