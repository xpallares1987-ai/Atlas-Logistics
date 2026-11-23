/**
 * @file TokenAuth.tsx
 * @description Modal for managing Magic Access Tokens and Zero-Trust supplier sessions (ADR 0035).
 * Allows users to inspect active token scope or switch to another single-PO magic link.
 * @module @atlas/frontend/components/Portal/Vendor/Modal/TokenAuth
 * @see {@link docs/adr/0035-b2b-customer-and-vendor-portal-architecture.md}
 */

import React, { useState } from "react";
import { X, Key, ShieldCheck, Check, AlertCircle } from "lucide-react";

interface TokenAuthProps {
  isOpen: boolean;
  currentToken: string | null;
  onClose: () => void;
  onApplyToken: (token: string) => void;
  onClearToken: () => void;
}

export const TokenAuth: React.FC<TokenAuthProps> = ({
  isOpen,
  currentToken,
  onClose,
  onApplyToken,
  onClearToken,
}) => {
  const [inputToken, setInputToken] = useState(currentToken || "");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputToken.trim();
    if (!trimmed) {
      setError("Please provide a valid token or clear the current token");
      return;
    }
    setError(null);
    onApplyToken(trimmed);
    onClose();
  };

  const handleClear = () => {
    setInputToken("");
    onClearToken();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-slate-100">
              Zero-Trust Magic Access Token
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleApply} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-lg flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-start gap-3 p-3 bg-indigo-950/40 border border-indigo-800/40 rounded-lg text-indigo-300 text-xs">
            <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <p>
              Magic Access Tokens (<code>atk_vendor_*</code>) provide sovereign
              single-click access to a specific PO without requiring a password
              or user account.
            </p>
          </div>

          <div>
            <label
              htmlFor="vendorMagicToken"
              className="block text-xs font-semibold text-slate-200 mb-1"
            >
              Access Token
            </label>
            <textarea
              id="vendorMagicToken"
              rows={3}
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              placeholder="Paste atk_vendor_... token or standard JWT"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none break-all"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            {currentToken ? (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-950/50 transition-colors"
              >
                Clear Token
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Apply Token
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
