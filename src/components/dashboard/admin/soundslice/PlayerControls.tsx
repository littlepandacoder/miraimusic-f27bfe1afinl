import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PlayerControlsProps {
  iframe: HTMLIFrameElement | null;
}

interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isConnected: boolean;
}

export const PlayerControls = ({ iframe }: PlayerControlsProps) => {
  const [state, setState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isConnected: false,
  });
  const [seekTime, setSeekTime] = useState("");
  const messageQueueRef = useRef<Array<{ command: string; timestamp: number }>>([]);
  const pendingQueriesRef = useRef<Set<string>>(new Set());
  const connectionTimeoutRef = useRef<NodeJS.Timeout>();

  // Send command to player
  const sendCommand = (command: string, args?: any) => {
    if (!iframe?.contentWindow) return;

    const message = { command, ...args };
    iframe.contentWindow.postMessage(message, "https://www.soundslice.com");
    messageQueueRef.current.push({ command, timestamp: Date.now() });

    messageQueueRef.current = messageQueueRef.current.filter(
      m => Date.now() - m.timestamp < 5000
    );
  };

  // Query current player state
  const queryPlayerState = () => {
    if (!iframe?.contentWindow) return;
    sendCommand("player.getIsPlaying");
    sendCommand("player.getCurrentTimeInSeconds");
    sendCommand("player.getDurationInSeconds");
  };

  // Set up message listener for Soundslice API
  useEffect(() => {
    if (!iframe) {
      console.log("[PlayerControls] No iframe yet");
      return;
    }

    console.log("[PlayerControls] Setting up message listener");

    const handleMessage = (event: MessageEvent) => {
      // Validate origin
      if (event.origin !== "https://www.soundslice.com") {
        console.log("[PlayerControls] Wrong origin:", event.origin);
        return;
      }

      if (event.source !== iframe.contentWindow) {
        console.log("[PlayerControls] Wrong source");
        return;
      }

      const data = event.data;
      console.log("[PlayerControls] Received message:", data);

      // Establish connection on any valid response
      if (!state.isConnected && data.method) {
        console.log("[PlayerControls] API Connected!");
        setState(prev => ({ ...prev, isConnected: true }));
        if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
      }

      // Handle playback state changes
      if (data.method === "player.isPlaying") {
        setState(prev => ({ ...prev, isPlaying: data.value }));
      }

      if (data.method === "player.currentTimeInSeconds") {
        setState(prev => ({ ...prev, currentTime: data.value }));
        pendingQueriesRef.current.delete("player.currentTimeInSeconds");
      }

      if (data.method === "player.durationInSeconds") {
        setState(prev => ({ ...prev, duration: data.value }));
        pendingQueriesRef.current.delete("player.durationInSeconds");
      }
    };

    window.addEventListener("message", handleMessage);

    // Wait a bit for iframe to fully initialize before querying
    const initialDelay = setTimeout(() => {
      console.log("[PlayerControls] Initial connection attempt");
      queryPlayerState();
    }, 500);

    // Set timeout to retry if no connection
    connectionTimeoutRef.current = setTimeout(() => {
      if (!state.isConnected) {
        console.log("[PlayerControls] Retrying connection...");
        queryPlayerState();
      }
    }, 2000);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearTimeout(initialDelay);
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    };
  }, [iframe, state.isConnected]);

  // Poll for playback position
  useEffect(() => {
    if (!iframe?.contentWindow || !state.isConnected) return;

    const interval = setInterval(() => {
      if (!pendingQueriesRef.current.has("player.currentTimeInSeconds")) {
        pendingQueriesRef.current.add("player.currentTimeInSeconds");
        sendCommand("player.getCurrentTimeInSeconds");
      }
    }, 500);

    return () => clearInterval(interval);
  }, [iframe, state.isConnected]);

  const handlePlay = () => {
    sendCommand("player.play");
    setTimeout(queryPlayerState, 100);
  };

  const handlePause = () => {
    sendCommand("player.pause");
    setTimeout(queryPlayerState, 100);
  };

  const handleSeek = () => {
    const timeSeconds = parseFloat(seekTime);
    if (isNaN(timeSeconds)) {
      toast({ title: "Invalid time value", variant: "destructive" });
      return;
    }
    sendCommand("player.seekToSecond", { second: timeSeconds });
    setSeekTime("");
    setTimeout(queryPlayerState, 100);
  };

  const handleReset = () => {
    sendCommand("player.seekToSecond", { second: 0 });
    handlePause();
    setTimeout(queryPlayerState, 100);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Player Controls</span>
          <div className="flex items-center gap-2">
            {state.isConnected ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
                  Connected
                </Badge>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                <Badge variant="outline">Connecting...</Badge>
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Playback Info */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
            <p className="text-xs text-muted-foreground mb-1">Current Time</p>
            <p className="text-lg font-bold font-mono">{formatTime(state.currentTime)}</p>
          </div>
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
            <p className="text-xs text-muted-foreground mb-1">Duration</p>
            <p className="text-lg font-bold font-mono">{formatTime(state.duration)}</p>
          </div>
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <p className="text-lg font-bold">
              {state.isPlaying ? "▶️ Playing" : "⏸ Paused"}
            </p>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex gap-2">
          <Button
            onClick={handlePlay}
            disabled={!state.isConnected}
            className="flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Play
          </Button>
          <Button
            onClick={handlePause}
            disabled={!state.isConnected}
            variant="outline"
            className="border-border flex items-center gap-2"
          >
            <Pause className="w-4 h-4" />
            Pause
          </Button>
          <Button
            onClick={handleReset}
            disabled={!state.isConnected}
            variant="outline"
            className="border-border flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        </div>

        {/* Seek Control */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Seek to Time (seconds)</label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="e.g., 5.5"
              value={seekTime}
              onChange={(e) => setSeekTime(e.target.value)}
              disabled={!state.isConnected}
              className="bg-background border-border"
            />
            <Button
              onClick={handleSeek}
              disabled={!state.isConnected || !seekTime}
              variant="outline"
              className="border-border"
            >
              Seek
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded h-2 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-200"
              style={{
                width: state.duration > 0 ? `${(state.currentTime / state.duration) * 100}%` : "0%",
              }}
            />
          </div>
        </div>

        {!state.isConnected && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-300">
            Establishing connection with Soundslice player... Please wait.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
