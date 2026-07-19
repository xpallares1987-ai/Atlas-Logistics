import { useState, useEffect } from "react";
import {
  User,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useFirebase } from "../firebase/FirebaseProvider";

export const useAuth = () => {
  const { auth, db, googleProvider } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        document.cookie = "auth_session=true; path=/; max-age=86400"; // 1 day
      } else {
        document.cookie = "auth_session=; path=/; max-age=0";
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  const createOrUpdateUserProfile = async (user: User) => {
    if (!db) return;
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || "",
          photoURL: user.photoURL || "",
          createdAt: serverTimestamp(),
          role: "user", // default role
        });
      }
    } catch (error) {
      console.error("Error creating user profile:", error);
    }
  };

  const handleLocalFallback = (email: string) => {
    console.warn(
      "⚠️ Firebase Auth failed or is unconfigured. Falling back to local Mock User.",
    );
    const mockUser = {
      uid: "dev-mock-uid-123",
      email: email || "demo@logistics.com",
      displayName: "Local Developer",
      photoURL: "",
      emailVerified: true,
    } as User;
    setUser(mockUser);
    document.cookie = "auth_session=true; path=/; max-age=86400";
  };

  const signInWithGoogle = async () => {
    if (!auth || !googleProvider)
      throw new Error("Firebase Auth not initialized");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await createOrUpdateUserProfile(result.user);
    } catch (error) {
      console.error("Error signing in with Google:", error);
      handleLocalFallback("demo-google@logistics.com");
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    if (!auth) throw new Error("Firebase Auth not initialized");
    try {
      if (email.startsWith("demo")) {
        return handleLocalFallback(email);
      }
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error("Error signing in with Email:", error);
      handleLocalFallback(email);
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    if (!auth) throw new Error("Firebase Auth not initialized");
    try {
      if (email.startsWith("demo")) {
        return handleLocalFallback(email);
      }
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      await createOrUpdateUserProfile(result.user);

      // Optionally send email verification
      await sendEmailVerification(result.user);
    } catch (error) {
      console.error("Error signing up with Email:", error);
      handleLocalFallback(email);
    }
  };

  const resetPassword = async (email: string) => {
    if (!auth) throw new Error("Firebase Auth not initialized");
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Error sending password reset email:", error);
      throw error;
    }
  };

  const signOut = async () => {
    if (!auth) throw new Error("Firebase Auth not initialized");
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  return {
    user,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    signOut,
  };
};
