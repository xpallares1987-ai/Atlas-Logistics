import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { useFirebase } from "@atlas/ui";
import { upsertUser, getUserRole } from "@dataconnect/generated";

interface AuthContextType {
  user: User | null;
  role: string | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { auth, dataConnect } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !dataConnect) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          // Check if user exists in PostgreSQL via Data Connect
          const response = await getUserRole(dataConnect, {
            uid: firebaseUser.uid,
          });
          if (response.data && response.data.users.length > 0) {
            setRole(response.data.users[0].role);
          } else {
            // New user, insert into Data Connect with GUEST role
            const defaultRole = "GUEST";
            await upsertUser(dataConnect, {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "unknown@example.com",
              role: defaultRole,
            });
            setRole(defaultRole);
          }
        } catch (error) {
          console.error("Error syncing user with Data Connect:", error);
          setRole("GUEST"); // Fallback
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, dataConnect]);

  const logout = async () => {
    if (auth) {
      await signOut(auth);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
