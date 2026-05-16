import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

/**
 * Sanitise env-var values.
 * Strips surrounding quotes AND the "VARNAME=" prefix if the full .env line
 * was accidentally pasted into Vercel's env-var value field.
 */
const sq = (s?: string, varName?: string): string => {
  if (!s) return "";
  let v = s.trim();
  if (varName && v.startsWith(varName + "=")) v = v.slice(varName.length + 1);
  return v.replace(/^['"]|['"]$/g, "");
};

const apiKey = sq(import.meta.env.VITE_FIREBASE_API_KEY, "VITE_FIREBASE_API_KEY");

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

if (apiKey) {
  try {
    const config = {
      apiKey,
      authDomain:        sq(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,        "VITE_FIREBASE_AUTH_DOMAIN"),
      databaseURL:       sq(import.meta.env.VITE_FIREBASE_DATABASE_URL,       "VITE_FIREBASE_DATABASE_URL"),
      projectId:         sq(import.meta.env.VITE_FIREBASE_PROJECT_ID,         "VITE_FIREBASE_PROJECT_ID"),
      storageBucket:     sq(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,     "VITE_FIREBASE_STORAGE_BUCKET"),
      messagingSenderId: sq(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,"VITE_FIREBASE_MESSAGING_SENDER_ID"),
      appId:             sq(import.meta.env.VITE_FIREBASE_APP_ID,             "VITE_FIREBASE_APP_ID"),
      measurementId:     sq(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,     "VITE_FIREBASE_MEASUREMENT_ID"),
    };
    app = getApps().length ? getApp() : initializeApp(config);
    db = getFirestore(app);
  } catch (e) {
    console.warn("[firebase] Initialization failed — Firestore logging will be skipped.", e instanceof Error ? e.message : e);
  }
}

export { db };
export default app;
