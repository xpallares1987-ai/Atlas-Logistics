import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "../store/useAppStore";
import { Input, Button } from "@atlas/ui";
import { Globe, Lock, Mail, ArrowRight, Loader2, Anchor } from "lucide-react";

export default function LoginModule() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("demo@atlas.com"); // Pre-filled for demo
  const [password, setPassword] = useState("password123");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const { checkAuth } = useAppStore();

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/signup";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Authentication failed");
      }

      await checkAuth();
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-slate-950 flex z-50 overflow-hidden text-slate-200 font-sans">
      {/* Left Panel: Form */}
      <div className="w-full lg:w-5/12 xl:w-1/3 h-full flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 relative z-10 bg-slate-950/80 backdrop-blur-3xl shadow-2xl shadow-indigo-500/10">
        <div className="absolute top-12 left-8 sm:left-16 lg:left-24 xl:left-32 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Anchor className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Atlas Enterprise
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-sm mt-12"
        >
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">
            {isLogin ? "Welcome back" : "Join the network"}
          </h1>
          <p className="text-slate-400 font-medium mb-10">
            {isLogin
              ? "Enter your credentials to access your global logistics command center."
              : "Create an account to orchestrate your supply chain globally."}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Work Email
              </label>
              <Input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-900 border-slate-800 text-base py-6 focus:border-indigo-500"
                leftIcon={<Mail className="w-5 h-5 text-slate-500" />}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Password
                </label>
                {isLogin && (
                  <a
                    href="#"
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    Forgot?
                  </a>
                )}
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-900 border-slate-800 text-base py-6 focus:border-indigo-500"
                leftIcon={<Lock className="w-5 h-5 text-slate-500" />}
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 text-red-400 text-sm font-medium p-3 rounded-lg border border-red-500/20"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full py-6 mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg rounded-xl shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-indigo-500"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500 font-medium">
            {isLogin
              ? "Don't have an account?"
              : "Already part of the network?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </motion.div>
      </div>

      {/* Right Panel: Visualization */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center overflow-hidden bg-slate-900">
        {/* Abstract animated nodes representing global logistics */}
        <div className="absolute inset-0 z-0">
          <div
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/30 rounded-full blur-[120px] animate-pulse"
            style={{ animationDuration: "4s" }}
          />
          <div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/20 rounded-full blur-[120px] animate-pulse"
            style={{ animationDuration: "6s", animationDelay: "1s" }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative z-10 w-full max-w-3xl flex flex-col items-center"
        >
          {/* Wireframe Globe representation */}
          <div className="w-[500px] h-[500px] rounded-full border border-slate-700 relative flex items-center justify-center mb-12 shadow-2xl shadow-indigo-500/10">
            <div className="absolute inset-0 rounded-full border border-slate-700 rotate-45 transform scale-y-50"></div>
            <div className="absolute inset-0 rounded-full border border-slate-700 -rotate-45 transform scale-y-50"></div>
            <div className="absolute inset-4 rounded-full border border-indigo-500/30 bg-slate-950 flex items-center justify-center backdrop-blur-sm">
              <Globe className="w-32 h-32 text-indigo-400/50" strokeWidth={1} />
            </div>

            {/* Orbiting elements */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.8)] border-2 border-slate-900" />
            </motion.div>
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[-40px] rounded-full border border-dashed border-slate-800"
            >
              <div className="absolute top-1/2 -left-4 -translate-y-1/2 w-8 h-8 bg-indigo-500 rounded-lg shadow-[0_0_20px_rgba(99,102,241,0.8)] border-2 border-slate-900 rotate-45" />
            </motion.div>
          </div>

          <h2 className="text-3xl font-black text-white text-center tracking-tight leading-tight">
            The Operating System
            <br />
            for Global Trade
          </h2>
          <p className="text-slate-400 font-medium text-center mt-4 max-w-lg">
            Connect disparate systems, automate workflows, and gain real-time
            visibility across your entire supply chain network.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
