import { useState, useEffect } from "react";
import { Bell, BellOff, Check, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Public VAPID key (safe to expose in frontend)
const VAPID_PUBLIC_KEY =
  "BHh7cd6iymHpEPQABAaJzto6OIjg-33Pm7nJPW1MgSuATYbH7fgPOMNQI_gU1lUBYq1GkoXqS2P-6gUYVDVfHWA";

const DISMISSED_KEY = "notif-banner-dismissed";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export const NotificationSetup = () => {
  const { user } = useAuth();
  const [state, setState] = useState<"idle" | "requesting" | "granted" | "denied" | "unsupported">("idle");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      return; // Browser doesn't support notifications
    }
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const current = Notification.permission;
    if (current === "granted") {
      // Already granted — just make sure we have a subscription saved
      ensureSubscribed();
      return;
    }
    if (current === "denied") return;

    // Show the banner after a short delay
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, [user]);

  const ensureSubscribed = async () => {
    if (!user) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        // Permission granted but no subscription (e.g. reinstalled PWA on this device
        // or new device) — re-subscribe silently without prompting the user again.
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      if (sub) await saveSub(sub, user.id);
    } catch (_) {}
  };

  const saveSub = async (sub: PushSubscription, userId: string) => {
    try {
      await fetch("/api/subscribe-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), userId }),
      });
    } catch (_) {}
  };

  const requestPermission = async () => {
    if (!user) return;
    setState("requesting");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      await saveSub(sub, user.id);
      setState("granted");
      setTimeout(() => dismiss(), 2500);
    } catch (err) {
      setState("unsupported");
    }
  };

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-[360px] z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div
        className="rounded-2xl border border-border bg-[#13131a] overflow-hidden"
        style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,45,120,0.1)" }}
      >
        <div className="h-0.5 w-full bg-gradient-to-r from-primary via-pink-400 to-primary" />

        <div className="p-5">
          {state === "granted" ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="font-semibold text-sm text-white">Reminders enabled!</p>
                <p className="text-xs text-white/50 mt-0.5">You'll get a daily practice nudge</p>
              </div>
            </div>
          ) : state === "denied" ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                <BellOff className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-white">Notifications blocked</p>
                <p className="text-xs text-white/50 mt-0.5">Enable them in your browser settings</p>
              </div>
              <button onClick={dismiss} className="text-white/30 hover:text-white/60">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-white">Daily practice reminders</p>
                <p className="text-xs text-white/50 mt-1 leading-relaxed">
                  Get a push notification every day so you never miss a session — just like Duolingo.
                </p>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={requestPermission}
                    disabled={state === "requesting"}
                    className="flex-1 py-2 rounded-xl bg-primary text-white text-xs font-semibold active:scale-95 transition-transform disabled:opacity-60"
                  >
                    {state === "requesting" ? "Enabling…" : "Enable reminders"}
                  </button>
                  <button
                    onClick={dismiss}
                    className="px-3 py-2 rounded-xl bg-white/5 text-white/50 text-xs font-medium hover:bg-white/10 active:scale-95 transition-all"
                  >
                    Not now
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
