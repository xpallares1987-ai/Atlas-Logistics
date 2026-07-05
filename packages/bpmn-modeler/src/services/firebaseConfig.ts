import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: "gen-lang-client-0393063451.firebaseapp.com",
  projectId: "gen-lang-client-0393063451",
  storageBucket: "gen-lang-client-0393063451.firebasestorage.app",
  messagingSenderId: "100198375762",
  appId: "1:100198375762:web:19b20e55484545bde29a8b",
  measurementId: "G-DC6HRLZVMT"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "database01");
