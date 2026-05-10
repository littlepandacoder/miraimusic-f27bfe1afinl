// src/lib/firestore.ts
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc 
} from "firebase/firestore";

// This pulls from your .env file
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// --- YOUR FUNCTIONS ---

export const saveEmail = async (email: string) => {
  const q = query(collection(db, "signups"), where("email", "==", email));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) return querySnapshot.docs[0].id;

  const docRef = await addDoc(collection(db, "signups"), {
    email,
    createdAt: new Date(),
  });
  return docRef.id;
};

export const updateSignupData = async (docId: string, data: any) => {
  const docRef = doc(db, "signups", docId);
  await updateDoc(docRef, { ...data, updatedAt: new Date() });
};

export const saveSubscriptionInfo = async (docId: string, subId: string, plan: string) => {
  const docRef = doc(db, "signups", docId);
  await updateDoc(docRef, {
    subscriptionId: subId,
    planType: plan,
    status: "active"
  });
};