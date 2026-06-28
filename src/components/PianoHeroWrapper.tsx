import { useRef, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useGameAudioInput } from "@/hooks/useGameAudioInput";
import { useMetronome } from "@/hooks/useMetronome";
import { Button } from "@/components/ui/button";
import { FeaturePaywallModal } from "./FeaturePaywallModal";
import { Mic, MicOff, Music2 } from "lucide-react";

/**
 * React wrapper for Piano Hero game with audio input support
 * Embeds the game in an iframe and bridges audio input
 */
export function PianoHeroWrapper() {
  const gameFrameRef = useRef<HTMLIFrameElement>(null);
  const [showAudioControls, setShowAudioControls] = useState(false);
  const { user } = useAuth();
  const subscription = useSubscriptionStatus();
  const [showPaywall, setShowPaywall] = useState(false);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [metronomeBPM, setMetronomeBPM] = useState(120);
  const [gameMode, setGameMode] = useState<"wait" | "normal">("wait");

  // Initialize metronome with Web Audio API
  useMetronome({
    enabled: metronomeEnabled,
    bpm: metronomeBPM,
    isNormalMode: gameMode === "normal",
  });

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

  // Send metronome settings to game
  const sendMetronomeUpdate = (enabled: boolean, bpm: number) => {
    if (gameFrameRef.current?.contentWindow) {
      gameFrameRef.current.contentWindow.postMessage(
        {
          type: "SET_METRONOME",
          enabled,
          bpm,
        },
        "*"
      );
    }
  };

  // Handle metronome toggle
  const handleMetronomeToggle = () => {
    const newState = !metronomeEnabled;
    setMetronomeEnabled(newState);
    sendMetronomeUpdate(newState, metronomeBPM);
  };

  // Handle BPM change
  const handleBPMChange = (newBPM: number) => {
    setMetronomeBPM(newBPM);
    if (metronomeEnabled) {
      sendMetronomeUpdate(true, newBPM);
    }
  };

  // Check subscription and show paywall if needed
  useEffect(() => {
    if (!subscription.loading && !subscription.hasActiveSubscription) {
      setShowPaywall(true);
    }
  }, [subscription.loading, subscription.hasActiveSubscription]);

  // Message listener to handle two-way communication with game
  useEffect(() => {
    if (!subscription.hasActiveSubscription) return;

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
        case "GAME_MODE":
          // Game mode changed (wait or normal)
          console.log("Game mode:", event.data.mode);
          setGameMode(event.data.mode);
          break;
        case "SONG_START":
          // Song started in normal mode - enable metronome if it was on
          if (event.data.mode === "normal" && metronomeEnabled) {
            console.log("Song started, metronome synced");
          }
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [startAudioInput, subscription.hasActiveSubscription]);

  if (!subscription.hasActiveSubscription && !subscription.loading) {
    return (
      <>
        <div className="w-full h-full bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Mic className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Piano Hero Locked</h2>
            <p className="text-muted-foreground mb-6">Subscribe to unlock this feature</p>
            <Button
              onClick={() => setShowPaywall(true)}
              className="bg-primary hover:bg-primary/90"
            >
              Upgrade to Piano Hero
            </Button>
          </div>
        </div>
        <FeaturePaywallModal
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
          featureName="Piano Hero"
          isTrialPlan={subscription.isTrialPlan}
          userId={user?.id}
          email={user?.email}
          onUpgradeSuccess={() => {
            // Refresh subscription status
            window.location.reload();
          }}
        />
      </>
    );
  }

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

      {/* Audio Input & Metronome Controls Overlay */}
      {subscription.hasActiveSubscription && (
        <div className="fixed top-20 right-4 z-40 space-y-2">
          {/* Mic Status - Only show when audio controls are ready */}
          {showAudioControls && (
            <>
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
            </>
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

          {/* Metronome Controls */}
          <div className="bg-card border border-border rounded-lg p-3 space-y-2 backdrop-blur w-48">
            <div className="flex items-center gap-2">
              <Music2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Metronome</span>
            </div>

            {/* Metronome Toggle */}
            <Button
              onClick={handleMetronomeToggle}
              size="sm"
              className="w-full"
              variant={metronomeEnabled ? "default" : "outline"}
            >
              {metronomeEnabled ? "Metronome: ON" : "Metronome: OFF"}
            </Button>

            {/* BPM Slider */}
            <div className="space-y-1">
              <label className="text-xs font-medium">
                BPM: <span className="text-primary">{metronomeBPM}</span>
              </label>
              <input
                type="range"
                min="40"
                max="200"
                value={metronomeBPM}
                onChange={(e) => handleBPMChange(Number(e.target.value))}
                className="w-full"
                disabled={!metronomeEnabled}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>40</span>
                <span>200</span>
              </div>
            </div>

            {/* Quick BPM Buttons */}
            <div className="grid grid-cols-3 gap-1">
              {[60, 120, 180].map((bpm) => (
                <Button
                  key={bpm}
                  size="sm"
                  variant={metronomeBPM === bpm ? "default" : "outline"}
                  onClick={() => handleBPMChange(bpm)}
                  disabled={!metronomeEnabled}
                  className="text-xs"
                >
                  {bpm}
                </Button>
              ))}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/20 text-red-500 rounded px-3 py-2 text-xs">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Paywall Modal */}
      <FeaturePaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        featureName="Piano Hero"
        isTrialPlan={subscription.isTrialPlan}
        userId={user?.id}
        email={user?.email}
        onUpgradeSuccess={() => {
          setShowPaywall(false);
          window.location.reload();
        }}
      />
    </div>
  );
}
