import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem("atlas_token");
      if (storedToken) {
        try {
          const base64Url = storedToken.split(".")[1];
          if (base64Url) {
            const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split("")
                .map(
                  (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2),
                )
                .join(""),
            );
            const parsed = JSON.parse(jsonPayload);
            if (parsed?.id) {
              setUser({
                id: parsed.id,
                email: parsed.email,
                name: parsed.name || parsed.email,
                role: parsed.role || "ADMIN",
              });
              setToken(storedToken);
            }
          }
        } catch {
          // Ignore parse errors
        }

        try {
          const res = await fetch(
            `${import.meta.env.VITE_API_URL || ""}/api/auth/me`,
            {
              headers: {
                Authorization: `Bearer ${storedToken}`,
              },
            },
          );
          if (res.ok) {
            const data = await res.json();
            setToken(storedToken);
            setUser(data.user);
          } else if (res.status === 401 || res.status === 403) {
            localStorage.removeItem("atlas_token");
            setToken(null);
            setUser(null);
          }
        } catch (error) {
          console.error("Auth check failed", error);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("atlas_token", newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("atlas_token");
    setToken(null);
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
