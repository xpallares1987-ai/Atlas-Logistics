import React, { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("admin@atlas.com");
  const [password, setPassword] = useState("admin");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to login");
      }

      login(data.token, data.user);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* Dynamic Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-emerald-500/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none mix-blend-overlay" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-duration-500" />

          <div className="relative z-10 mb-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/30 border border-indigo-400/50">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight mb-2">
              Atlas ERP
            </h1>
            <p className="text-slate-400 font-medium">
              Enterprise Access Portal
            </p>
          </div>

          <form onSubmit={handleLogin} className="relative z-10 space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm p-3 rounded-xl text-center font-medium"
              >
                {error}
              </motion.div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                Work Email
              </label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/50 border border-white/5 focus:border-indigo-500/50 text-white placeholder-slate-600 rounded-xl py-3.5 pl-12 pr-4 outline-none transition-all shadow-inner focus:bg-slate-900/80"
                  placeholder="admin@atlas.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                Password
              </label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-white/5 focus:border-indigo-500/50 text-white placeholder-slate-600 rounded-xl py-3.5 pl-12 pr-4 outline-none transition-all shadow-inner focus:bg-slate-900/80"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/25 border border-white/10 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 group/btn"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Secure Login
                  <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="mt-6 pt-5 border-t border-white/10 relative z-10">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">
              Acceso Rápido Demo (1-Click)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setEmail("admin@atlas.com");
                  setPassword("admin");
                }}
                className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                  email === "admin@atlas.com"
                    ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                    : "bg-slate-950/40 border-white/5 text-slate-400 hover:border-white/20 hover:text-white"
                }`}
              >
                <span className="text-base">👑</span>
                <div>
                  <div className="font-bold">Admin</div>
                  <div className="text-[10px] text-slate-500">Acceso Total</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail("operator@atlas.com");
                  setPassword("password123");
                }}
                className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                  email === "operator@atlas.com"
                    ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                    : "bg-slate-950/40 border-white/5 text-slate-400 hover:border-white/20 hover:text-white"
                }`}
              >
                <span className="text-base">📦</span>
                <div>
                  <div className="font-bold">Operador</div>
                  <div className="text-[10px] text-slate-500">Tráfico & Almacén</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail("customs@atlas.com");
                  setPassword("password123");
                }}
                className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                  email === "customs@atlas.com"
                    ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                    : "bg-slate-950/40 border-white/5 text-slate-400 hover:border-white/20 hover:text-white"
                }`}
              >
                <span className="text-base">🛡️</span>
                <div>
                  <div className="font-bold">Aduanas</div>
                  <div className="text-[10px] text-slate-500">DUA & OEA</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail("treasury@atlas.com");
                  setPassword("password123");
                }}
                className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                  email === "treasury@atlas.com"
                    ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                    : "bg-slate-950/40 border-white/5 text-slate-400 hover:border-white/20 hover:text-white"
                }`}
              >
                <span className="text-base">💰</span>
                <div>
                  <div className="font-bold">Tesorería</div>
                  <div className="text-[10px] text-slate-500">CASS & Fletes</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail("customer@atlas.com");
                  setPassword("password123");
                }}
                className={`col-span-2 flex items-center justify-center gap-2 p-2 rounded-xl border text-center transition-all ${
                  email === "customer@atlas.com"
                    ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                    : "bg-slate-950/40 border-white/5 text-slate-400 hover:border-white/20 hover:text-white"
                }`}
              >
                <span className="text-base">🚢</span>
                <div>
                  <span className="font-bold">Cliente Shipper</span> — <span className="text-[10px] text-slate-500">Portal de Seguimiento & Cotizador</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
