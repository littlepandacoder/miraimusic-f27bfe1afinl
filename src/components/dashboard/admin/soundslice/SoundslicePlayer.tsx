import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";

interface SoundslicePlayerProps {
  sliceId: string;
  onPlayerReady?: (iframe: HTMLIFrameElement) => void;
  onError?: (error: string) => void;
}

export const SoundslicePlayer = ({ sliceId, onPlayerReady, onError }: SoundslicePlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      console.log("[Soundslice] Iframe loaded");
      setIsLoading(false);
      // Wait a moment for Soundslice to initialize internally
      setTimeout(() => {
        if (onPlayerReady) {
          onPlayerReady(iframe);
        }
      }, 500);
    };

    const handleError = () => {
      const error = "Failed to load Soundslice player";
      console.error("[Soundslice] Iframe error:", error);
      setLoadError(error);
      setIsLoading(false);
      if (onError) {
        onError(error);
      }
    };

    iframe.addEventListener("load", handleLoad);
    iframe.addEventListener("error", handleError);

    // Set a timeout in case the iframe doesn't emit load/error events
    // After 4 seconds, consider it loaded anyway and proceed
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.log("[Soundslice] Timeout reached, marking as loaded");
        setIsLoading(false);
        if (onPlayerReady) {
          onPlayerReady(iframe);
        }
      }
    }, 4000);

    return () => {
      iframe.removeEventListener("load", handleLoad);
      iframe.removeEventListener("error", handleError);
      clearTimeout(timeout);
    };
  }, [onPlayerReady, onError, isLoading]);

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🎼 Soundslice Lesson Player
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden" ref={containerRef}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 z-10">
              <div className="text-center space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">Loading Soundslice player...</p>
              </div>
            </div>
          )}

          {loadError && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-50 dark:bg-red-900/20 z-10">
              <div className="text-center space-y-2 p-4">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                <p className="text-sm font-medium text-red-900 dark:text-red-400">{loadError}</p>
                <p className="text-xs text-red-700 dark:text-red-300">
                  Check your internet connection and try refreshing the page.
                </p>
              </div>
            </div>
          )}

          <iframe
            ref={iframeRef}
            id="ssembed"
            src={`https://www.soundslice.com/slices/${sliceId}/embed/?api=1`}
            width="100%"
            height="600"
            frameBorder="0"
            allowFullScreen
            className="w-full"
            style={{ minHeight: "600px" }}
          />
        </div>
      </CardContent>
    </Card>
  );
};
