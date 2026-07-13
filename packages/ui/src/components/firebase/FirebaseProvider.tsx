import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  initializeApp,
  getApps,
  getApp,
  FirebaseApp,
  FirebaseOptions,
} from "firebase/app";
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  EmailAuthProvider,
  OAuthProvider,
  signInAnonymously,
} from "firebase/auth";
// @ts-ignore
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
// @ts-ignore
import { getDataConnect, DataConnect } from "firebase/data-connect";

export interface FirebaseContextType {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  storage: FirebaseStorage | null;
  dataConnect: DataConnect | null;
  googleProvider: GoogleAuthProvider | null;
  emailProvider: EmailAuthProvider | null;
  microsoftProvider: OAuthProvider | null;
}

const FirebaseContext = createContext<FirebaseContextType>({
  app: null,
  auth: null,
  db: null,
  storage: null,
  dataConnect: null,
  googleProvider: null,
  emailProvider: null,
  microsoftProvider: null,
});

export const useFirebase = () => useContext(FirebaseContext);

export interface FirebaseProviderProps {
  config: FirebaseOptions;
  databaseId?: string;
  children: ReactNode;
}

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  config,
  databaseId,
  children,
}) => {
  const [firebaseInstance, setFirebaseInstance] = useState<FirebaseContextType>(
    {
      app: null,
      auth: null,
      db: null,
      storage: null,
      dataConnect: null,
      googleProvider: null,
      emailProvider: null,
      microsoftProvider: null,
    },
  );

  useEffect(() => {
    if (!config || !config.projectId) return;

    try {
      const app = !getApps().length ? initializeApp(config) : getApp();
      const auth = getAuth(app);

      // Retained as fallback per user request
      signInAnonymously(auth).catch((error) =>
        console.error("Anonymous auth failed:", error),
      );

      const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
      const storage = getStorage(app);
      const dataConnect = getDataConnect(app, {
        location: "europe-west1",
        connector: "default",
        service: "gen-lang-client-0393063451-service",
      });

      const googleProvider = new GoogleAuthProvider();
      const emailProvider = new EmailAuthProvider();

      const microsoftProvider = new OAuthProvider("microsoft.com");
      // Optional: Add custom tenant ID for Identity Platform multi-tenancy if configured
      // microsoftProvider.setCustomParameters({ tenant: 'YOUR_TENANT_ID' });

      setFirebaseInstance({
        app,
        auth,
        db,
        storage,
        dataConnect,
        googleProvider,
        emailProvider,
        microsoftProvider,
      });
    } catch (error) {
      console.error("Failed to initialize Firebase", error);
    }
  }, [config, databaseId]);

  return (
    <FirebaseContext.Provider value={firebaseInstance}>
      {children}
    </FirebaseContext.Provider>
  );
};
