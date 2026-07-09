import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { useFirebase } from "@atlas/ui";
import { useAuth } from "../components/auth/AuthProvider";
import { Lock, Mail, ChevronRight, Anchor, KeyRound } from "lucide-react";

async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function Login() {
  const { auth, googleProvider } = useFirebase();
  const { user, loading: authLoading, mockLoginAsAdmin } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Authenticating...
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Hardcoded mock admin user logic
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail === "x.pallares1987@gmail.com") {
      try {
        const enteredHash = await hashPassword(password);
        const savedMockHash =
          localStorage.getItem("mock_admin_password_hash") || "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";

        if (enteredHash === savedMockHash) {
          if (password === "admin") {
            setRequirePasswordChange(true);
            setLoading(false);
            return;
          } else {
            // Already updated password correctly entered, skip password change UI
            mockLoginAsAdmin(email, "Xavi Pallares");
            return;
          }
        } else {
          setError("Invalid credentials");
          setLoading(false);
          return;
        }
      } catch (err) {
        setError("Error securing credentials");
        setLoading(false);
        return;
      }
    }

    if (!auth) {
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      const newHash = await hashPassword(newPassword);
      // Save the hash to local storage to persist the override securely
      localStorage.setItem("mock_admin_password_hash", newHash);

      // Simulate updating password and log the user in as Admin
      mockLoginAsAdmin(email, "Xavi Pallares");
    } catch (err) {
      setError("Failed to secure password.");
    }
  };

  const handleGoogleLogin = async () => {
    if (!auth || !googleProvider) return;
    setLoading(true);
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(err.message || "SSO Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl w-full max-w-md p-8 relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-3 rounded-xl mb-4 shadow-lg shadow-blue-500/30">
            {requirePasswordChange ? (
              <KeyRound className="text-white w-8 h-8" />
            ) : (
              <Anchor className="text-white w-8 h-8" />
            )}
          </div>
          <h2 className="text-2xl font-black text-white text-center">
            Atlas Logistics
          </h2>
          <p className="text-slate-400 text-sm mt-2 text-center">
            {requirePasswordChange
              ? "Security Policy Update"
              : "Enterprise Control Tower Portal"}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm mb-6 text-center">
            {error}
          </div>
        )}

        {!requirePasswordChange ? (
          <>
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-xs font-bold uppercase mb-2">
                  Corporate Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input
                    type="email"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    placeholder="operator@atlas.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-bold uppercase mb-2">
                  Access Token / Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input
                    type="password"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Authenticating..." : "Secure Login"}
                {!loading && <ChevronRight className="w-4 h-4" />}
              </button>
            </form>

            <div className="mt-6 flex items-center">
              <div className="flex-1 border-t border-slate-800"></div>
              <span className="px-4 text-xs text-slate-500 uppercase font-bold">
                Or
              </span>
              <div className="flex-1 border-t border-slate-800"></div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-3"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Workspace SSO
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-500 p-4 rounded-lg text-sm mb-4">
              <strong>Mandatory Action Required</strong>
              <br />
              Please change your initial password before continuing.
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  type="password"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
            >
              Update Password & Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
