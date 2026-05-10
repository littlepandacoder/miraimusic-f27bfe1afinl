import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

// Strip surrounding quotes Vite can include when .env values are quoted
const sq = (s?: string) => s?.trim().replace(/^['"]|['"]$/g, "") ?? "";

const apiKey = sq(import.meta.env.VITE_FIREBASE_API_KEY);

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

if (apiKey) {
  try {
    const config = {
      apiKey,
      authDomain:        sq(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
      databaseURL:       sq(import.meta.env.VITE_FIREBASE_DATABASE_URL),
      projectId:         sq(import.meta.env.VITE_FIREBASE_PROJECT_ID),
      storageBucket:     sq(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
      messagingSenderId: sq(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
      appId:             sq(import.meta.env.VITE_FIREBASE_APP_ID),
      measurementId:     sq(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID),
    };
    app = getApps().length ? getApp() : initializeApp(config);
    db = getFirestore(app);
  } catch (e) {
    console.warn("[firebase] Initialization failed — Firestore logging will be skipped.", e instanceof Error ? e.message : e);
  }
} else {
  console.warn("[firebase] VITE_FIREBASE_API_KEY is not set. Restart the dev server after editing .env.local.");
}

export { db };
export default app;
