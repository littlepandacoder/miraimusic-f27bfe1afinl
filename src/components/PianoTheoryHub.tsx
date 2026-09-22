interface PianoTheoryHubProps {
  userId: string;
}

export function PianoTheoryHub({ userId }: PianoTheoryHubProps) {
  return (
    <iframe
      src="/piano-theory.html"
      className="w-full h-full border-0"
      title="Piano Theory Game"
    />
  );
}
