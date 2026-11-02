import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, AlertCircle, CheckCircle2, RotateCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PlayerControlsProps {
  iframe: HTMLIFrameElement | null;
}

interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

interface ConnectionState {
  iframeLoaded: boolean;
  playerReady: boolean;
  apiConnected: boolean;
  lastMessage: string;
  lastError: string | null;
  connectionTimeout: boolean;
}

export const PlayerControls = ({ iframe }: PlayerControlsProps) => {
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
  });

  const [connection, setConnection] = useState<ConnectionState>({
    iframeLoaded: false,
    playerReady: false,
    apiConnected: false,
    lastMessage: "",
    lastError: null,
    connectionTimeout: false,
  });

  const [seekTime, setSeekTime] = useState("");
  const timeoutRef = useRef<NodeJS.Timeout>();
  const pollIntervalRef = useRef<NodeJS.Timeout>();

  // Send command to Soundslice API
  const sendCommand = (command: string, params?: Record<string, any>) => {
    if (!iframe?.contentWindow) {
      setConnection(prev => ({
        ...prev,
        lastError: "Iframe not available",
      }));
      return;
    }

    const message = { command, ...params };
    console.log("[Soundslice API] Sending:", message);
    iframe.contentWindow.postMessage(message, "https://www.soundslice.com");
  };

  // Initialize connection and message listener
  useEffect(() => {
    if (!iframe) {
      console.log("[Soundslice] No iframe reference");
      return;
    }

    console.log("[Soundslice] Setting up message listener");
    setConnection(prev => ({ ...prev, iframeLoaded: true }));

    const handleMessage = (event: MessageEvent) => {
      // Strict origin validation
      if (event.origin !== "https://www.soundslice.com") {
        console.log("[Soundslice] Wrong origin:", event.origin);
        return;
      }

      // Verify source is the iframe
      if (event.source !== iframe.contentWindow) {
        console.log("[Soundslice] Wrong source");
        return;
      }

      const data = event.data;
      console.log("[Soundslice API] Received:", data);

      // Handle ssPlayerReady event - this is the real connection signal
      if (data.name === "ssPlayerReady") {
        console.log("[Soundslice] ssPlayerReady event received!");
        setConnection(prev => ({
          ...prev,
          playerReady: true,
          lastMessage: "ssPlayerReady event",
        }));

        // Immediately test the connection with getCurrentTime
        setTimeout(() => {
          console.log("[Soundslice] Testing connection with getCurrentTime");
          sendCommand("getCurrentTime");
        }, 100);

        // Clear any timeout since we got a real response
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        return;
      }

      // Handle API responses
      if (data.name === "ssCurrentTime") {
        const currentTime = data.data || 0;
        console.log("[Soundslice] Current time:", currentTime);
        setPlayerState(prev => ({ ...prev, currentTime }));
        setConnection(prev => ({
          ...prev,
          apiConnected: true,
          lastMessage: `ssCurrentTime: ${currentTime.toFixed(2)}s`,
        }));
        return;
      }

      if (data.name === "ssIsPlaying") {
        console.log("[Soundslice] Is playing:", data.data);
        setPlayerState(prev => ({ ...prev, isPlaying: data.data }));
        return;
      }

      if (data.name === "ssDuration") {
        console.log("[Soundslice] Duration:", data.data);
        setPlayerState(prev => ({ ...prev, duration: data.data }));
        return;
      }

      // Track any valid message
      setConnection(prev => ({
        ...prev,
        lastMessage: JSON.stringify(data).substring(0, 100),
      }));
    };

    window.addEventListener("message", handleMessage);

    // Set timeout for connection attempt
    timeoutRef.current = setTimeout(() => {
      if (!connection.playerReady) {
        console.log("[Soundslice] Connection timeout - player not ready");
        setConnection(prev => ({
          ...prev,
          connectionTimeout: true,
          lastError: "Soundslice player did not respond within 5 seconds",
        }));
      }
    }, 5000);

    return () => {
      window.removeEventListener("message", handleMessage);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [iframe]);

  // Poll for playback position when player is ready
  useEffect(() => {
    if (!connection.playerReady || !iframe?.contentWindow) return;

    pollIntervalRef.current = setInterval(() => {
      sendCommand("getCurrentTime");
    }, 500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [connection.playerReady, iframe]);

  const handlePlay = () => {
    sendCommand("play");
  };

  const handlePause = () => {
    sendCommand("pause");
  };

  const handleSeek = () => {
    const seconds = parseFloat(seekTime);
    if (isNaN(seconds)) {
      toast({ title: "Invalid time", variant: "destructive" });
      return;
    }
    sendCommand("seekToSecond", { second: seconds });
    setSeekTime("");
  };

  const handleReset = () => {
    sendCommand("seekToSecond", { second: 0 });
    handlePause();
  };

  const handleRetry = () => {
    console.log("[Soundslice] Retry connection");
    setConnection(prev => ({
      ...prev,
      connectionTimeout: false,
      lastError: null,
      playerReady: false,
      apiConnected: false,
    }));
    sendCommand("getCurrentTime");
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
            {connection.apiConnected ? (
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
        {/* Connection Diagnostics */}
        <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-semibold text-muted-foreground">Connection Status</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              {connection.iframeLoaded ? (
                <CheckCircle2 className="w-3 h-3 text-green-500" />
              ) : (
                <AlertCircle className="w-3 h-3 text-yellow-500" />
              )}
              <span>Iframe: {connection.iframeLoaded ? "Loaded" : "Loading"}</span>
            </div>
            <div className="flex items-center gap-1">
              {connection.playerReady ? (
                <CheckCircle2 className="w-3 h-3 text-green-500" />
              ) : (
                <AlertCircle className="w-3 h-3 text-yellow-500" />
              )}
              <span>Player: {connection.playerReady ? "Ready" : "Waiting"}</span>
            </div>
            <div className="flex items-center gap-1">
              {connection.apiConnected ? (
                <CheckCircle2 className="w-3 h-3 text-green-500" />
              ) : (
                <AlertCircle className="w-3 h-3 text-yellow-500" />
              )}
              <span>API: {connection.apiConnected ? "Connected" : "Waiting"}</span>
            </div>
            <div className="flex items-center gap-1">
              {connection.connectionTimeout ? (
                <AlertCircle className="w-3 h-3 text-red-500" />
              ) : (
                <CheckCircle2 className="w-3 h-3 text-gray-400" />
              )}
              <span>Timeout: {connection.connectionTimeout ? "Yes" : "No"}</span>
            </div>
          </div>

          {connection.lastMessage && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs font-mono text-muted-foreground">
                Last msg: {connection.lastMessage}
              </p>
            </div>
          )}
        </div>

        {/* Playback Info */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
            <p className="text-xs text-muted-foreground mb-1">Current Time</p>
            <p className="text-lg font-bold font-mono">{formatTime(playerState.currentTime)}</p>
          </div>
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
            <p className="text-xs text-muted-foreground mb-1">Duration</p>
            <p className="text-lg font-bold font-mono">{formatTime(playerState.duration)}</p>
          </div>
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <p className="text-lg font-bold">
              {playerState.isPlaying ? "▶️ Playing" : "⏸ Paused"}
            </p>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex gap-2">
          <Button
            onClick={handlePlay}
            disabled={!connection.apiConnected}
            className="flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Play
          </Button>
          <Button
            onClick={handlePause}
            disabled={!connection.apiConnected}
            variant="outline"
            className="border-border flex items-center gap-2"
          >
            <Pause className="w-4 h-4" />
            Pause
          </Button>
          <Button
            onClick={handleReset}
            disabled={!connection.apiConnected}
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
              disabled={!connection.apiConnected}
              className="bg-background border-border"
            />
            <Button
              onClick={handleSeek}
              disabled={!connection.apiConnected || !seekTime}
              variant="outline"
              className="border-border"
            >
              Seek
            </Button>
          </div>
        </div>

        {/* Error/Timeout State */}
        {connection.connectionTimeout && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <p className="text-sm font-medium text-red-900 dark:text-red-400">
                {connection.lastError || "Connection timeout"}
              </p>
            </div>
            <Button
              onClick={handleRetry}
              size="sm"
              className="w-full flex items-center gap-2"
            >
              <RotateCw className="w-3 h-3" />
              Retry Connection
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
