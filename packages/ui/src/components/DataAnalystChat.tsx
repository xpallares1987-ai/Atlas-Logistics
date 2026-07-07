import { useState } from "react";
import { Bot, Send, User, Database } from "lucide-react";

export function DataAnalystChat() {
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string; sql?: string }[]>([
    {
      role: "bot",
      text: "Hola, soy el Atlas Data Analyst. ¿Qué necesitas saber de tus datos logísticos hoy?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setIsLoading(true);

    try {
      const { getApp } = await import("firebase/app");
      const { getFunctions, httpsCallable } = await import("firebase/functions");
      const app = getApp();
      const functions = getFunctions(app);
      
      const chatWithData = httpsCallable(functions, "chatWithData");
      const result = await chatWithData({ question: userMsg });
      
      const data = result.data as any;
      if (data.success && data.data) {
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: data.data.friendlyResponse,
            sql: data.data.sqlQuery,
          },
        ]);
      }
    } catch (err) {
      console.error("Chat error:", err);
      // Fallback
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Lo siento, tuvimos un problema de red. Simulación de respuesta: Hemos despachado 4,500 toneladas este trimestre.",
          sql: "SELECT SUM(weight) FROM shipments WHERE date >= NOW() - INTERVAL '3 months'",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] w-full max-w-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl overflow-hidden shadow-2xl relative transform gpu will-change-transform">
      <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-900/40 flex items-center gap-3 relative z-10">
        <div className="p-2 bg-indigo-500/20 rounded-xl">
          <Database className="text-indigo-400 w-5 h-5" />
        </div>
        <div>
          <h3 className="text-white font-bold">Atlas Data Analyst</h3>
          <p className="text-xs text-slate-400">Gemini 2.5 Text-to-SQL Engine</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 relative z-10">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 max-w-[85%] ${m.role === "user" ? "ml-auto flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-slate-700 text-slate-300" : "bg-indigo-500 text-white shadow-[0_0_15px_-3px_rgba(99,102,241,0.5)]"}`}>
              {m.role === "user" ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`space-y-2 ${m.role === "user" ? "items-end" : "items-start"}`}>
              <div className={`p-3 rounded-2xl ${m.role === "user" ? "bg-indigo-600/90 text-white rounded-tr-sm" : "bg-slate-800/80 text-slate-200 rounded-tl-sm border border-slate-700/50"}`}>
                <p className="text-sm leading-relaxed">{m.text}</p>
              </div>
              {m.sql && m.sql !== "null" && (
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 w-full overflow-x-auto shadow-inner">
                  {m.sql}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-500/50 text-white animate-pulse">
              <Bot size={16} />
            </div>
            <div className="p-4 rounded-2xl bg-slate-800/80 rounded-tl-sm border border-slate-700/50 flex gap-1">
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-200" />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-900/80 border-t border-slate-700/50 relative z-10">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ej. ¿Cuál fue el puerto de origen más barato este mes?"
            className="w-full bg-slate-950/50 border border-slate-700 rounded-full py-3 pl-4 pr-12 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full disabled:opacity-50 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
