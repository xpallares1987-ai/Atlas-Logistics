// @ts-nocheck
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Standard Error Boundary to catch UI and logic crashes,
 * especially useful for AI-driven or math-heavy components.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      const isAIError =
        this.state.error?.message?.toLowerCase().includes("gemini") ||
        this.state.error?.message?.toLowerCase().includes("ai");

      return (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-2xl my-4 text-center">
          <div className="p-3 bg-red-100 rounded-full mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2">
            {isAIError
              ? "AI Analysis Interrupted"
              : this.props.fallbackTitle || "Component Error"}
          </h2>
          <p className="text-[10px] text-slate-500 font-medium mb-6 max-w-xs mx-auto leading-relaxed">
            {isAIError
              ? "The AI engine encountered an issue while processing these rates. This is usually due to API limits or network instability."
              : this.state.error?.message ||
                "An unexpected error occurred in this section."}
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold text-[10px] shadow-md shadow-indigo-100 uppercase tracking-widest"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Restart Section
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

