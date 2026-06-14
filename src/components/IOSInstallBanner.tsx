import { useState, useEffect, useRef } from "react";
import { X, Share, Plus } from "lucide-react";

const DISMISSED_KEY = "pwa-install-dismissed-v3";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function isIOSDevice() {
  // Standard iPhones / iPods
  if (/iPhone|iPod/.test(navigator.userAgent)) return true;
  // iPads with old UA
  if (/iPad/.test(navigator.userAgent)) return true;
  // iPadOS 13+ reports as Mac but has multi-touch
  if (
    typeof navigator.platform === "string" &&
    navigator.platform === "MacIntel" &&
    navigator.maxTouchPoints > 1
  ) return true;
  return false;
}

function isAndroidDevice() {
  return /android/i.test(navigator.userAgent);
}

function isMobile() {
  return isIOSDevice() || isAndroidDevice() ||
    ("ontouchstart" in window && window.innerWidth < 1024);
}

export const IOSInstallBanner = () => {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);
  const deferredPrompt = useRef<any>(null);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (!isMobile()) return;

    const ios = isIOSDevice();
    const android = !ios && isAndroidDevice();

    if (android) {
      const handler = (e: any) => {
        e.preventDefault();
        deferredPrompt.current = e;
        setPlatform("android");
        setVisible(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      // Fallback: show manual instructions if Chrome doesn't fire the prompt
      const t = setTimeout(() => {
        setPlatform("android");
        setVisible(true);
      }, 1500);
      return () => {
        window.removeEventListener("beforeinstallprompt", handler);
        clearTimeout(t);
      };
    }

    // iOS (or any other touch device)
    setPlatform("ios");
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  };

  const handleAndroidInstall = async () => {
    if (deferredPrompt.current) {
      deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      if (outcome === "accepted") dismiss();
      deferredPrompt.current = null;
    }
  };

  if (!visible || !platform) return null;

  return (
    <>
      {/* Full-screen tap-to-dismiss backdrop */}
      <div
        className="fixed inset-0 z-[9998]"
        onClick={dismiss}
      />

      <div
        className="fixed bottom-0 left-0 right-0 z-[9999] px-3"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))" }}
      >
        <div
          className="rounded-2xl border border-white/10 bg-[#13131a] overflow-hidden"
          style={{ boxShadow: "0 -4px 40px rgba(255,45,120,0.25), 0 8px 32px rgba(0,0,0,0.7)" }}
        >
          {/* Accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-primary via-pink-400 to-primary" />

          <div className="flex items-start gap-4 px-5 pt-4 pb-3">
            <img
              src="/logo.png"
              alt="Musicable"
              className="w-14 h-14 rounded-2xl border border-white/10 shrink-0 object-cover"
            />
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="font-bold text-[15px] text-white">Install Musicable</p>
              <p className="text-[12px] text-white/50 mt-0.5">
                Add to your home screen — no App Store needed
              </p>
            </div>
            <button
              onClick={dismiss}
              className="shrink-0 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/50 active:scale-95 transition-all"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {platform === "ios" && (
            <div className="px-5 pb-5 flex flex-col gap-3">
              <Step
                icon={<Share className="w-3.5 h-3.5 text-primary" />}
                text={<>Tap the <strong className="text-white">Share</strong> button at the bottom of Safari</>}
              />
              <Step
                icon={<Plus className="w-3.5 h-3.5 text-primary" />}
                text={<>Tap <strong className="text-white">"Add to Home Screen"</strong> then tap <strong className="text-white">Add</strong></>}
              />
              <div className="flex justify-center pt-1">
                <div className="flex flex-col items-center gap-1 animate-bounce opacity-70">
                  <div className="w-px h-5 bg-primary rounded-full" />
                  <div
                    className="w-0 h-0"
                    style={{
                      borderLeft: "5px solid transparent",
                      borderRight: "5px solid transparent",
                      borderTop: "6px solid #FF2D78",
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {platform === "android" && (
            <div className="px-5 pb-5">
              {deferredPrompt.current ? (
                <button
                  onClick={handleAndroidInstall}
                  className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm active:scale-95 transition-transform"
                >
                  Add to Home Screen
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <Step
                    icon={<Share className="w-3.5 h-3.5 text-primary" />}
                    text={<>Tap the <strong className="text-white">⋮ menu</strong> in Chrome (top right)</>}
                  />
                  <Step
                    icon={<Plus className="w-3.5 h-3.5 text-primary" />}
                    text={<>Tap <strong className="text-white">"Add to Home Screen"</strong></>}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const Step = ({ icon, text }: { icon: React.ReactNode; text: React.ReactNode }) => (
  <div className="flex items-center gap-3">
    <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <p className="text-[12px] text-white/70 leading-snug">{text}</p>
  </div>
);
