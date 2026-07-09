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
  mockLoginAsAdmin: (email: string, displayName: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  logout: async () => {},
  mockLoginAsAdmin: () => {},
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
    // Check local storage for mock session
    const mockSessionStr = localStorage.getItem("mock_admin_session");
    if (mockSessionStr) {
      try {
        const mockSession = JSON.parse(mockSessionStr);
        setUser(mockSession.user);
        setRole(mockSession.role);
        setLoading(false);
        return; // Skip real auth
      } catch (e) {
        // invalid session
      }
    }

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

  const mockLoginAsAdmin = (email: string, displayName: string) => {
    const mockUser = {
      uid: "dev-mock-admin-uid-123",
      email: email,
      displayName: displayName,
      photoURL: "",
      emailVerified: true,
    } as any;
    setUser(mockUser);
    setRole("ADMIN");
    localStorage.setItem(
      "mock_admin_session",
      JSON.stringify({ user: mockUser, role: "ADMIN" }),
    );
    document.cookie = "auth_session=true; path=/; max-age=86400";
  };

  const logout = async () => {
    if (auth) {
      await signOut(auth);
    }
    // clear mock
    localStorage.removeItem("mock_admin_session");
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, role, loading, logout, mockLoginAsAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
};
