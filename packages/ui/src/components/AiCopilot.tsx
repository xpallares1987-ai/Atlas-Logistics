import { useState, useRef, useEffect } from "react";
import {
  Bot,
  User,
  FileText,
  Send,
  Loader2,
  UploadCloud,
  CheckCircle,
  Zap,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  attachment?: {
    name: string;
    type: "pdf" | "image";
    url: string;
  };
  jsonResult?: any;
}

export function AiCopilot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-1",
      role: "assistant",
      content:
        "¡Hola! Soy Atlas Copilot, tu asistente impulsado por Gemini. Sube una factura, Bill of Lading, o pregúntame sobre cualquier métrica operativa de tu logística.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Mock Gemini API Response Time
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Basado en mi análisis de los datos operativos y la ruta consultada, la probabilidad de congestión en el puerto de trasbordo es alta (78%). Recomiendo redirigir el contenedor a un puerto alternativo.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const simulateOCR = async (file: File) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: `Por favor, extrae los datos estructurados de este documento: ${file.name}`,
      timestamp: new Date().toISOString(),
      attachment: {
        name: file.name,
        type: file.type.includes("pdf") ? "pdf" : "image",
        url: URL.createObjectURL(file),
      },
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        // Usar VITE_API_URL o fallback a localhost
        const apiUrl = (import.meta as any).env?.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';
        
        const res = await fetch(`${apiUrl}/api/ai/parse-invoice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentBase64: base64Data, mimeType: file.type })
        });
        
        if (!res.ok) {
          throw new Error("Error en la conexión con la API de IA");
        }
        
        const responseData = await res.json();
        
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `¡Documento procesado con éxito usando Gemini 1.5 Flash Vision! He extraído los siguientes datos estructurados. ¿Deseas inyectar esta factura automáticamente en el módulo de Cuentas a Pagar (AP)?`,
          timestamp: new Date().toISOString(),
          jsonResult: responseData.data || responseData,
        };
        setMessages((prev) => [...prev, botMessage]);
        setIsTyping(false);
      };
      
      reader.onerror = () => {
        throw new Error("Failed to read file");
      };
    } catch (err: any) {
      console.error(err);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Lo siento, ocurrió un error procesando el documento: ${err.message}`,
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsTyping(false);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) simulateOCR(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) simulateOCR(file);
  };

  return (
    <div
      className={`ai-copilot-container ${isDragging ? "border-blue-500 bg-blue-500/5" : "border-gray-800"}`}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: "600px",
        backgroundColor: "#111114",
        borderRadius: "1rem",
        border: "1px solid var(--border, #1f2937)",
        overflow: "hidden",
        transition: "all 0.2s ease",
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem 1.5rem",
          borderBottom: "1px solid var(--border, #1f2937)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#16161A",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              padding: "0.5rem",
              background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
              borderRadius: "0.5rem",
            }}
          >
            <Zap size={20} color="white" />
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "1.1rem",
                fontWeight: 600,
                color: "white",
              }}
            >
              Atlas Copilot
            </h3>
            <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
              Powered by Google Gemini
            </span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              gap: "1rem",
              flexDirection: msg.role === "user" ? "row-reverse" : "row",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                backgroundColor: msg.role === "user" ? "#1f2937" : "#3b82f6",
                color: "white",
              }}
            >
              {msg.role === "user" ? <User size={18} /> : <Bot size={18} />}
            </div>

            <div
              style={{
                maxWidth: "75%",
                backgroundColor: msg.role === "user" ? "#1f2937" : "#1e1b4b",
                border:
                  msg.role === "assistant"
                    ? "1px solid #312e81"
                    : "1px solid transparent",
                padding: "1rem",
                borderRadius: "1rem",
                borderTopRightRadius: msg.role === "user" ? 0 : "1rem",
                borderTopLeftRadius: msg.role === "assistant" ? 0 : "1rem",
                color: "#e5e7eb",
                fontSize: "0.9rem",
                lineHeight: "1.5",
              }}
            >
              {msg.attachment && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem",
                    backgroundColor: "rgba(0,0,0,0.2)",
                    borderRadius: "0.5rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <FileText size={16} color="#3b82f6" />
                  <span
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      fontFamily: "monospace",
                    }}
                  >
                    {msg.attachment.name}
                  </span>
                </div>
              )}

              <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>

              {msg.jsonResult && (
                <div
                  style={{
                    marginTop: "1rem",
                    backgroundColor: "#0f172a",
                    padding: "1rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #334155",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.5rem",
                      color: "#10b981",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircle size={14} />{" "}
                    <span>Extracción Estructurada (JSON)</span>
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      fontSize: "0.75rem",
                      color: "#cbd5e1",
                      overflowX: "auto",
                      fontFamily: "monospace",
                    }}
                  >
                    {JSON.stringify(msg.jsonResult, null, 2)}
                  </pre>
                  <button
                    style={{
                      marginTop: "1rem",
                      width: "100%",
                      padding: "0.5rem",
                      backgroundColor: "#3b82f6",
                      color: "white",
                      border: "none",
                      borderRadius: "0.25rem",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Sincronizar con TMS
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div style={{ display: "flex", gap: "1rem", flexDirection: "row" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#3b82f6",
                color: "white",
              }}
            >
              <Bot size={18} />
            </div>
            <div
              style={{
                backgroundColor: "#1e1b4b",
                border: "1px solid #312e81",
                padding: "1rem",
                borderRadius: "1rem",
                borderTopLeftRadius: 0,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "#818cf8",
              }}
            >
              <Loader2 size={16} className="animate-spin" />
              <span style={{ fontSize: "0.8rem" }}>Analizando contexto...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        style={{
          padding: "1rem",
          borderTop: "1px solid var(--border, #1f2937)",
          backgroundColor: "#16161A",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            backgroundColor: "#0f172a",
            border: "1px solid #334155",
            borderRadius: "0.75rem",
            padding: "0.5rem",
          }}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: "0.5rem",
              backgroundColor: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "0.5rem",
            }}
            title="Adjuntar Documento (PDF/Img)"
          >
            <UploadCloud size={20} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileSelect}
            style={{ display: "none" }}
            accept="application/pdf,image/png,image/jpeg"
          />

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Escribe tu consulta o arrastra un documento aquí..."
            style={{
              flex: 1,
              backgroundColor: "transparent",
              border: "none",
              color: "#f8fafc",
              fontSize: "0.9rem",
              outline: "none",
            }}
          />

          <button
            onClick={handleSend}
            disabled={!input.trim()}
            style={{
              padding: "0.5rem",
              backgroundColor: input.trim() ? "#3b82f6" : "#1e293b",
              border: "none",
              color: input.trim() ? "white" : "#64748b",
              cursor: input.trim() ? "pointer" : "display: flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "0.5rem",
              transition: "background-color 0.2s",
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
