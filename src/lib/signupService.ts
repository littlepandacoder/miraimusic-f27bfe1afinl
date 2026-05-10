// src/signupService.ts
import { db } from "./firebase";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc,
  serverTimestamp // Added this
} from "firebase/firestore";

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

/**
 * Save email to Firestore
 */
export const saveEmail = async (email: string): Promise<string> => {
  try {
    // 1. Check for existing email (Requires 'read' permission in Rules)
    const q = query(collection(db, "signups"), where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id;
    }

    // 2. Add new doc (Requires 'create' permission in Rules)
    const docRef = await addDoc(collection(db, "signups"), {
      email,
      createdAt: serverTimestamp(), // Use server time
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error("Error saving email:", error);
    throw error;
  }
};

/**
 * Update signup with questionnaire data
 */
export const updateSignupData = async (
  docId: string,
  data: Omit<SignupData, "id" | "createdAt">
): Promise<void> => {
  try {
    const docRef = doc(db, "signups", docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(), // Use server time
    });
  } catch (error) {
    console.error("Error updating signup:", error);
    throw error;
  }
};