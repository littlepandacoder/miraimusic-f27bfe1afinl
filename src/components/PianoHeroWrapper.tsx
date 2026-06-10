import { useRef, useEffect, useState } from "react";
import { useGameAudioInput } from "@/hooks/useGameAudioInput";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";

/**
 * React wrapper for Piano Hero game with audio input support
 * Embeds the game in an iframe and bridges audio input
 */
export function PianoHeroWrapper() {
  const gameFrameRef = useRef<HTMLIFrameElement>(null);
  const [showAudioControls, setShowAudioControls] = useState(false);

  const {
    isListening,
    hasPermission,
    error,
    currentNote,
    startAudioInput,
    stopAudioInput,
  } = useGameAudioInput({
    gameWindowRef: gameFrameRef,
  });

  // Message listener to handle two-way communication with game
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from our game frame
      if (event.source !== gameFrameRef.current?.contentWindow) return;

      switch (event.data.type) {
        case "GAME_READY":
          // Game has loaded and is ready
          console.log("Piano Hero game ready for audio input");
          setShowAudioControls(true);
          break;
        case "REQUEST_AUDIO_INPUT":
          // Game is requesting audio input
          startAudioInput();
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [startAudioInput]);

  return (
    <div className="w-full h-full relative">
      {/* Piano Hero Game */}
      <iframe
        ref={gameFrameRef}
        src="/piano_hero.html"
        className="w-full h-full border-0"
        title="Piano Hero"
        allow="microphone"
      />

      {/* Audio Input Controls Overlay */}
      {showAudioControls && (
        <div className="fixed top-20 right-4 z-40 space-y-2">
          {/* Mic Status */}
          {!isListening && (
            <Button
              onClick={startAudioInput}
              size="sm"
              className="gap-2"
              variant="outline"
            >
              <Mic className="w-4 h-4" />
              Enable Mic
            </Button>
          )}

          {isListening && (
            <Button
              onClick={stopAudioInput}
              size="sm"
              className="gap-2 bg-red-500/20 hover:bg-red-500/30"
              variant="outline"
            >
              <MicOff className="w-4 h-4 text-red-500" />
              Disable Mic
            </Button>
          )}

          {/* Current Note Display */}
          {currentNote && isListening && (
            <div className="bg-primary/10 text-primary rounded px-3 py-2 text-sm font-semibold backdrop-blur">
              {currentNote.noteName}
              {currentNote.cents !== 0 && (
                <span className="text-xs block text-muted-foreground">
                  {Math.abs(currentNote.cents)}¢{" "}
                  {currentNote.cents > 0 ? "sharp" : "flat"}
                </span>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/20 text-red-500 rounded px-3 py-2 text-xs">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
