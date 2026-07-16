import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Database, Shield, Zap } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIChainAssistantModule() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I am your AI Supply Chain Assistant. I can help you query logistics data, optimize warehouse routes, predict demurrage risks, and analyze profitability. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('http://localhost:3001/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content })
      });
      const data = await response.json();
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.reply || "Hubo un error al procesar tu solicitud.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error fetching AI response:', error);
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "Lo siento, el backend de IA no está disponible en este momento.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="w-full h-full flex bg-slate-950 text-slate-200">
      {/* Sidebar Info */}
      <div className="hidden lg:flex w-80 flex-col border-r border-slate-800 bg-slate-900/50 p-6 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
            <Sparkles className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">AI Chain Assistant</h2>
            <p className="text-xs text-blue-400 font-medium tracking-wide uppercase mt-1">Enterprise Copilot</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" /> Connected Sources
            </h3>
            <ul className="text-xs text-slate-400 space-y-2">
              <li className="flex justify-between"><span>Firebase Data Connect</span> <span className="text-emerald-400">Live</span></li>
              <li className="flex justify-between"><span>AlloyDB Omni</span> <span className="text-emerald-400">Synced</span></li>
              <li className="flex justify-between"><span>Camunda BPM</span> <span className="text-emerald-400">Connected</span></li>
            </ul>
          </div>
          
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" /> Capabilities
            </h3>
            <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
              <li>Natural Language Queries</li>
              <li>Route Optimization AI</li>
              <li>Predictive Demurrage</li>
              <li>Automated Task Delegation</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col relative bg-slate-950">
        <div className="absolute inset-0 bg-slate-950/20 pointer-events-none mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-600/10 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-purple-600/10 blur-[100px] rounded-full pointer-events-none"></div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 z-10 scrollbar-hide">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-4 max-w-[80%] ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border shadow-lg ${msg.type === 'user' ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-800 border-slate-700'}`}>
                  {msg.type === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-blue-400" />}
                </div>
                <div className={`p-4 rounded-2xl shadow-xl backdrop-blur-md text-sm leading-relaxed ${
                  msg.type === 'user' 
                    ? 'bg-indigo-600/90 text-white border border-indigo-500/50 rounded-tr-sm' 
                    : 'bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex gap-4 max-w-[80%]">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-slate-800 border border-slate-700 shadow-lg">
                  <Bot className="w-5 h-5 text-blue-400" />
                </div>
                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/50 rounded-tl-sm shadow-xl flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  <span className="text-sm text-slate-400">Processing complex query...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 bg-slate-900/50 border-t border-slate-800/80 backdrop-blur-xl z-10">
          <div className="max-w-4xl mx-auto flex items-center gap-4 bg-slate-800/50 p-2 rounded-2xl border border-slate-700/50 shadow-inner focus-within:ring-2 focus-within:ring-blue-500/50 transition-all duration-300">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about warehouse capacity, optimal shipping routes, or demurrage risk..."
              className="flex-1 bg-transparent border-none text-slate-200 text-sm px-4 focus:outline-none placeholder-slate-500"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="p-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <div className="text-center mt-3 flex items-center justify-center gap-2">
            <Shield className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Enterprise Grade AI • Secure Data Enclave</span>
          </div>
        </div>
      </div>
    </div>
  );
}
