import { db } from "./firebase";
import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp, getDoc } from "firebase/firestore";

export interface SignupData {
  id?: string;
  email: string;
  goals: string[];
  skillLevel: string;
  topics: string[];
  genres: string[];
  createdAt?: any;
  updatedAt?: any;
}

export const saveEmail = async (email: string): Promise<string> => {
  if (!db) return "no-firebase";
  try {
    const q = query(collection(db, "signups"), where("email", "==", email));
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].id;
    const ref = await addDoc(collection(db, "signups"), { email, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return ref.id;
  } catch (error) {
    console.error("Error saving email:", error);
    throw error;
  }
};

export const updateSignupData = async (docId: string, data: Omit<SignupData, "id" | "createdAt">): Promise<void> => {
  if (!db || docId === "no-firebase") return;
  try {
    const ref = doc(db, "signups", docId);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  } catch (error) {
    console.error("Error updating signup:", error);
    throw error;
  }
};

export const hasCompletedOnboarding = async (docId: string): Promise<boolean> => {
  if (!db || docId === "no-firebase") return false;
  try {
    const ref = doc(db, "signups", docId);
    const docSnap = await getDoc(ref);
    if (!docSnap.exists()) {
      console.log(`[onboarding check] Doc ${docId} does not exist`);
      return false;
    }
    const data = docSnap.data();
    console.log(`[onboarding check] Doc data:`, data);
    // Check if all required onboarding fields are present and not empty
    const hasGoals = data?.goals?.length > 0;
    const hasSkillLevel = !!data?.skillLevel;
    const hasTopics = data?.topics?.length > 0;
    const hasGenres = data?.genres?.length > 0;
    const isComplete = hasGoals && hasSkillLevel && hasTopics && hasGenres;
    console.log(`[onboarding check] Complete: ${isComplete} (goals: ${hasGoals}, level: ${hasSkillLevel}, topics: ${hasTopics}, genres: ${hasGenres})`);
    return isComplete;
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return false;
  }
};
