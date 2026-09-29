import "./unload-blocker";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { initCapacitor } from "./capacitorInit";
import { disableConsoleInProduction } from "./lib/disableConsole";
import { initMetaPixel } from "./initMetaPixel";

// Disable console in production
disableConsoleInProduction();

// Handle unhandled promise rejections from token refresh and network errors
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason;
  const errorMsg = (error?.message || error?.toString?.() || '').toLowerCase();

  // Silently ignore Supabase token refresh and network errors to prevent console spam
  if (
    errorMsg.includes('failed to fetch') ||
    errorMsg.includes('network') ||
    errorMsg.includes('token') ||
    errorMsg.includes('disconnected')
  ) {
    event.preventDefault();
    return;
  }
});

// Suppress non-critical console errors
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args: any[]) => {
  // Suppress AudioContext, Meta Pixel, tracking, network, and other non-critical errors
  const message = args[0]?.toString?.() || '';
  if (
    message.includes('AudioContext') ||
    message.includes('pixel') ||
    message.includes('fbq') ||
    message.includes('facebook') ||
    message.includes('Failed to load resource') ||
    message.includes('Failed to fetch') ||
    message.includes('net::ERR') ||
    message.includes('400') ||
    message.includes('token') ||
    message.includes('502')
  ) {
    return;
  }
  originalError.apply(console, args);
};

console.warn = (...args: any[]) => {
  // Suppress AudioContext, Meta Pixel warnings and informational messages
  const message = args[0]?.toString?.() || '';
  if (
    message.includes('AudioContext') ||
    message.includes('pixel') ||
    message.includes('fbq') ||
    message.includes('facebook') ||
    message.includes('React Router') ||
    message.includes('Fast Refresh') ||
    message.includes('future flag') ||
    message.includes('DevTools')
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

// Initialize Meta Pixel only in production to avoid dev/CI/Incognito console noise
try {
  initMetaPixel();
} catch (e) {
  // ignore
}

// Boot Capacitor native plugins (no-op in web browser)
initCapacitor().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
