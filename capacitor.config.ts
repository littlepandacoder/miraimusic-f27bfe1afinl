import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.musicable.app",
  appName: "Musicable",
  webDir: "dist",
  server: {
    // androidScheme makes cookies / localStorage work correctly on Android
    androidScheme: "https",
    // Allow Supabase and ElevenLabs connections from the native webview
    cleartext: false,
  },
  ios: {
    // Enables WKWebView scrolling bounce suppression for a native feel
    contentInset: "automatic",
    scrollEnabled: true,
    backgroundColor: "#0a0a0f",
  },
  android: {
    backgroundColor: "#0a0a0f",
    // Required for Web Audio API / MIDI on Android
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0a0a0f",
      showSpinner: false,
      androidSpinnerStyle: "small",
      iosSpinnerStyle: "small",
      spinnerColor: "#FF2D78",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#0a0a0f",
    },
    Keyboard: {
      resize: "body",
      style: "dark",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
