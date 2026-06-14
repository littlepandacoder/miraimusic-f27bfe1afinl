import { useState, useEffect } from "react";
import { X, Share, Plus } from "lucide-react";

const DISMISSED_KEY = "pwa-install-dismissed";

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export const IOSInstallBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (!dismissed && isIOS() && isSafari() && !isStandalone()) {
      // Small delay so it doesn't flash on page load
      const t = setTimeout(() => setVisible(true), 2500);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div
        className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
        style={{ boxShadow: "0 -4px 40px rgba(255,45,120,0.15)" }}
      >
        {/* Pink accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-primary via-pink-400 to-primary" />

        <div className="flex items-start gap-4 px-5 py-4">
          <img
            src="/logo.png"
            alt="Musicable"
            className="w-14 h-14 rounded-xl border border-border shrink-0"
          />

          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground">Add Musicable to Home Screen</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Install the app for a full-screen experience — no App Store needed.
            </p>

            {/* Step-by-step */}
            <div className="flex flex-col gap-2 mt-3">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <Share className="w-3 h-3 text-primary" />
                </div>
                <p className="text-xs text-foreground/80">
                  Tap the <span className="font-semibold text-foreground">Share</span> button at the bottom of Safari
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <Plus className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="text-xs text-foreground/80">
                  Tap <span className="font-semibold text-foreground">"Add to Home Screen"</span> then tap Add
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={dismiss}
            className="shrink-0 mt-0.5 w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Animated arrow pointing down toward the Safari share button */}
        <div className="flex justify-center pb-3">
          <div className="flex flex-col items-center gap-0.5 animate-bounce">
            <div className="w-0.5 h-4 bg-primary/60 rounded-full" />
            <div
              className="w-0 h-0"
              style={{
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                borderTop: "7px solid rgba(255,45,120,0.6)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
