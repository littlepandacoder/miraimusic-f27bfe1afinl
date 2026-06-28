import { useState, useCallback, useRef } from "react";
import { useConversation } from "@elevenlabs/react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from "lucide-react";

const AGENT_ID = "agent_7401krc6fjd4e1hvvce2m7mn0ss0";

const AITutor = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const micStreamRef = useRef<MediaStream | null>(null);

  const stopMic = () => {
    micStreamRef.current?.getTracks().forEach((tr) => tr.stop());
    micStreamRef.current = null;
  };

  const patchWsSend = () => {
    const orig = WebSocket.prototype.send;
    (WebSocket.prototype as any).send = function (this: WebSocket, data: unknown) {
      if (this.readyState >= WebSocket.CLOSING) {
        console.warn("[AITutor] WebSocket already closing, ignoring send");
        return;
      }
      try {
        return orig.call(this, data);
      } catch (e) {
        console.error("[AITutor] WebSocket send error:", e);
      }
    };
    setTimeout(() => { WebSocket.prototype.send = orig; }, 1000);
  };

  const conversation = useConversation({
    onConnect: () => {
      setIsConnecting(false);
      console.log("[AITutor] Connected to agent");
      toast({ title: t("aiTutor.connected"), description: t("aiTutor.connectedDesc") });
    },
    onDisconnect: () => {
      console.log("[AITutor] Disconnected from agent");
      stopMic();
      toast({ title: t("aiTutor.disconnected"), description: t("aiTutor.disconnectedDesc") });
    },
    onError: (error) => {
      console.error("[AITutor] Conversation error:", error);
      stopMic();
      setIsConnecting(false);
      toast({
        title: t("aiTutor.connectionError"),
        description: t("aiTutor.connectionErrorDesc"),
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
        title: t("aiTutor.failedToStart"),
        description: error instanceof Error ? error.message : t("aiTutor.failedToStartDesc"),
        variant: "destructive",
      });
    }
  }, [conversation, toast, t]);

  const stopConversation = useCallback(async () => {
    try {
      patchWsSend();
      stopMic();
      await conversation.endSession();
    } catch (error) {
      console.error("[AITutor] Error stopping conversation:", error);
      stopMic();
    }
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
          {t("aiTutor.title")}
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
                ? t("aiTutor.speaking")
                : t("aiTutor.listening")
              : t("aiTutor.clickToStart")}
          </p>

          <div className="flex justify-center gap-4">
            {!isConnected ? (
              <Button onClick={startConversation} disabled={isConnecting} className="btn-primary px-8">
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("aiTutor.connecting")}
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    {t("aiTutor.startSession")}
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
                  {t("aiTutor.endSession")}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="bg-secondary/30 rounded-lg p-4">
          <p className="text-sm font-medium mb-2">{t("aiTutor.tipsTitle")}</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• {t("aiTutor.tip1")}</li>
            <li>• {t("aiTutor.tip2")}</li>
            <li>• {t("aiTutor.tip3")}</li>
            <li>• {t("aiTutor.tip4")}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default AITutor;
