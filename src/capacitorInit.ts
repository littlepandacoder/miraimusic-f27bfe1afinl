import { Capacitor } from "@capacitor/core";

export async function initCapacitor(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  // Lazy-import so web bundle never loads native modules
  const [{ SplashScreen }, { StatusBar, Style }, { Keyboard }] =
    await Promise.all([
      import("@capacitor/splash-screen"),
      import("@capacitor/status-bar"),
      import("@capacitor/keyboard"),
    ]);

  // Hide the splash screen after React has rendered
  await SplashScreen.hide({ fadeOutDuration: 300 });

  // Dark status bar to match the app theme
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#0a0a0f" });
  } catch {
    // StatusBar.setBackgroundColor is Android-only — ignore on iOS
  }

  // Prevent the keyboard from pushing content up (we handle it via CSS)
  Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => {});
}
