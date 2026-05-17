import { useState, useCallback, useRef } from "react";
import { useConversation } from "@elevenlabs/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from "lucide-react";

const AGENT_ID = "agent_7401krc6fjd4e1hvvce2m7mn0ss0";

const AITutor = () => {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const micStreamRef = useRef<MediaStream | null>(null);

  const stopMic = () => {
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
  };

  const patchWsSend = () => {
    const orig = WebSocket.prototype.send;
    (WebSocket.prototype as any).send = function (this: WebSocket, data: unknown) {
      if (this.readyState >= WebSocket.CLOSING) return;
      return orig.call(this, data);
    };
    setTimeout(() => { WebSocket.prototype.send = orig; }, 500);
  };

  const conversation = useConversation({
    onConnect: () => {
      setIsConnecting(false);
      toast({ title: "Connected!", description: "You can now speak with your AI music tutor." });
    },
    onDisconnect: () => {
      stopMic();
      toast({ title: "Disconnected", description: "Your session with the AI tutor has ended." });
    },
    onError: (error) => {
      console.error("Tutor error:", error);
      stopMic();
      setIsConnecting(false);
      toast({
        title: "Connection Error",
        description: "Could not connect to AI tutor. Please try again.",
        variant: "destructive",
      });
    },
  });

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      await conversation.startSession({ agentId: AGENT_ID });
    } catch (error) {
      stopMic();
      setIsConnecting(false);
      toast({
        title: "Failed to start",
        description: error instanceof Error ? error.message : "Could not start session.",
        variant: "destructive",
      });
    }
  }, [conversation, toast]);

  const stopConversation = useCallback(async () => {
    patchWsSend();
    stopMic();
    await conversation.endSession();
  }, [conversation]);

  const toggleMute = useCallback(async () => {
    await conversation.setVolume({ volume: isMuted ? 1 : 0 });
    setIsMuted(!isMuted);
  }, [conversation, isMuted]);

  const isConnected = conversation.status === "connected";

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-primary" />
          Ask Tutor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center space-y-4">
          <div
            className={`w-32 h-32 rounded-full mx-auto flex items-center justify-center transition-all ${
              isConnected
                ? conversation.isSpeaking
                  ? "bg-primary animate-pulse"
                  : "bg-primary/70"
                : "bg-secondary"
            }`}
          >
            {isConnected ? (
              conversation.isSpeaking ? (
                <Volume2 className="w-12 h-12 text-primary-foreground" />
              ) : (
                <Mic className="w-12 h-12 text-primary-foreground" />
              )
            ) : (
              <MicOff className="w-12 h-12 text-muted-foreground" />
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {isConnected
              ? conversation.isSpeaking
                ? "AI Tutor is speaking..."
                : "Listening... Ask your question!"
              : "Click Start to begin your session"}
          </p>

          <div className="flex justify-center gap-4">
            {!isConnected ? (
              <Button onClick={startConversation} disabled={isConnecting} className="btn-primary px-8">
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    Start Session
                  </>
                )}
              </Button>
            ) : (
              <>
                <Button onClick={toggleMute} variant="outline" size="icon">
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <Button onClick={stopConversation} variant="destructive">
                  <MicOff className="w-4 h-4 mr-2" />
                  End Session
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="bg-secondary/30 rounded-lg p-4">
          <p className="text-sm font-medium mb-2">Tips for your session:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Ask about music theory concepts</li>
            <li>• Get help with practice techniques</li>
            <li>• Learn about your instrument</li>
            <li>• Understand rhythm and timing</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default AITutor;
