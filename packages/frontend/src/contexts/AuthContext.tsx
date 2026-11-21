/**
 * @file AuthContext.tsx
 * @description Sovereign authentication context managing user sessions, JWT/cookie state, and MFA challenges.
 * @module @atlas/frontend/contexts/AuthContext
 * @see {@link docs/adr/0031-sovereign-native-identity-and-authentication-engine.md}
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { resolveApiUrl } from "../hooks/useApiQuery";

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId?: string | null;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  verifyMfa: (mfaTicket: string, code: string) => Promise<boolean>;
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
      // 1. Check active session via credentials: "include" cookie or fallback bearer token
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
                companyId: parsed.companyId,
              });
              setToken(storedToken);
            }
          }
        } catch {
          // Ignore parse errors
        }
      }

      try {
        const headers: Record<string, string> = {};
        if (storedToken) {
          headers["Authorization"] = `Bearer ${storedToken}`;
        }

        const res = await fetch(resolveApiUrl("/api/auth/me"), {
          headers,
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setUser(data.user);
            if (storedToken) setToken(storedToken);
          } else {
            localStorage.removeItem("atlas_token");
            setUser(null);
            setToken(null);
          }
        } else if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("atlas_token");
          setToken(null);
          setUser(null);
        }
      } catch (error) {
        console.error("Auth session check failed", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("atlas_token", newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    try {
      await fetch(resolveApiUrl("/api/auth/logout"), {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignore network errors on logout
    }

    localStorage.removeItem("atlas_token");
    setToken(null);
    setUser(null);

    const base = import.meta.env.BASE_URL || "/";
    const loginPath = base.endsWith("/") ? `${base}login` : `${base}/login`;
    window.location.href = loginPath;
  };

  const verifyMfa = async (
    mfaTicket: string,
    code: string,
  ): Promise<boolean> => {
    const res = await fetch(resolveApiUrl("/api/auth/totp/validate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ mfaTicket, code }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Código de verificación inválido");
    }

    login(data.token, data.user);
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        verifyMfa,
        isAuthenticated: !!user || !!token,
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
