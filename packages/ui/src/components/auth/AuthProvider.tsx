import { ReactNode, useState, createContext, useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  photoURL?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: string;
  tenantId: string;
  setTenantId: (id: string) => void;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantId] = useState("tenant-1");
  const queryClient = useQueryClient();

  const { data: user, isLoading: loading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return null;
      const data = await res.json();
      return data.user as User;
    },
    retry: false,
  });

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    queryClient.setQueryData(["auth", "me"], null);
  };

  const value = {
    user: user || null,
    loading,
    role: user?.role || "GUEST",
    tenantId,
    setTenantId,
    signOut,
    logout: signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
