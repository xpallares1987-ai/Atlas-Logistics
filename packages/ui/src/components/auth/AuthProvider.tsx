import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { useFirebase } from "@/components";
import { upsertUser, getUserProfile } from "@/dataconnect-generated";

interface AuthContextType {
  user: User | null;
  role: string | null;
  tenantId: string | null;
  loading: boolean;
  logout: () => Promise<void>;
  mockLoginAsAdmin: (email: string, displayName: string, tenantId?: string) => void;
  setTenantId: (tenantId: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  tenantId: null,
  loading: true,
  logout: async () => {},
  mockLoginAsAdmin: () => {},
  setTenantId: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { auth, dataConnect } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [tenantId, setTenantIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setTenantId = (newTenantId: string) => {
    setTenantIdState(newTenantId);
    // Update mock session if exists
    const mockSessionStr = localStorage.getItem("mock_admin_session");
    if (mockSessionStr) {
      const mockSession = JSON.parse(mockSessionStr);
      mockSession.tenantId = newTenantId;
      localStorage.setItem("mock_admin_session", JSON.stringify(mockSession));
    }
  };

  useEffect(() => {
    // Check local storage for mock session
    const mockSessionStr = localStorage.getItem("mock_admin_session");
    if (mockSessionStr) {
      try {
        const mockSession = JSON.parse(mockSessionStr);
        setUser(mockSession.user);
        setRole(mockSession.role);
        setTenantIdState(mockSession.tenantId || "atlas-default-tenant");
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
          // Get Custom Claims from Firebase Auth token
          const tokenResult = await firebaseUser.getIdTokenResult(true);
          const customRole = tokenResult.claims.role as string | undefined;
          
          if (customRole) {
            setRole(customRole);
            // Default tenant since we haven't implemented multi-tenant claims yet
            setTenantIdState("atlas-default-tenant");
          } else {
            // New user or claims not propagated yet, check Data Connect or default to GUEST
            try {
              const response = await getUserProfile(dataConnect, {
                uid: firebaseUser.uid,
              });
              if (response.data && response.data.user) {
                setRole(response.data.user.role);
                setTenantIdState(response.data.user.tenantId);
              } else {
                // Completely new user without claims and without DB record
                const defaultRole = "GUEST";
                const defaultTenantId = "atlas-default-tenant";
                await upsertUser(dataConnect, {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || "unknown@example.com",
                  role: defaultRole,
                  tenantId: defaultTenantId,
                });
                setRole(defaultRole);
                setTenantIdState(defaultTenantId);
              }
            } catch (dbError) {
              console.warn("Could not sync with Data Connect, defaulting to GUEST", dbError);
              setRole("GUEST");
              setTenantIdState("atlas-default-tenant");
            }
          }
        } catch (error) {
          console.error("Error reading custom claims:", error);
          setRole("GUEST"); // Fallback
          setTenantIdState("atlas-default-tenant");
        }
      } else {
        setUser(null);
        setRole(null);
        setTenantIdState(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, dataConnect]);

  const mockLoginAsAdmin = (email: string, displayName: string, tenantId?: string) => {
    const mockUser = {
      uid: "dev-mock-admin-uid-123",
      email: email,
      displayName: displayName,
      photoURL: "",
      emailVerified: true,
    } as any;
    setUser(mockUser);
    setRole("ADMIN");
    const newTenant = tenantId || "atlas-default-tenant";
    setTenantIdState(newTenant);
    localStorage.setItem(
      "mock_admin_session",
      JSON.stringify({ user: mockUser, role: "ADMIN", tenantId: newTenant }),
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
    setTenantIdState(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, role, tenantId, loading, logout, mockLoginAsAdmin, setTenantId }}
    >
      {children}
    </AuthContext.Provider>
  );
};
