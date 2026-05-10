import { db } from "./firebase";
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from "firebase/firestore";

export const saveEmail = async (email: string): Promise<string> => {
  if (!db) return "no-firebase";
  const q = query(collection(db, "signups"), where("email", "==", email));
  const snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].id;
  const ref = await addDoc(collection(db, "signups"), { email, createdAt: new Date() });
  return ref.id;
};

export const updateSignupData = async (docId: string, data: any): Promise<void> => {
  if (!db || docId === "no-firebase") return;
  const ref = doc(db, "signups", docId);
  await updateDoc(ref, { ...data, updatedAt: new Date() });
};

export const saveSubscriptionInfo = async (docId: string, subId: string, plan: string): Promise<void> => {
  if (!db || docId === "no-firebase") return;
  const ref = doc(db, "signups", docId);
  await updateDoc(ref, { subscriptionId: subId, planType: plan, status: "active" });
};
