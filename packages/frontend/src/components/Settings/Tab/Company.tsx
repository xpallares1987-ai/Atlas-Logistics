/**
 * @file Company.tsx
 * @description Tenant organization details, tax ID / VAT, and billing address configuration tab.
 * @module @atlas/frontend/components/Settings/Tab/Company
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React, { useState } from "react";
import { Button, Input } from "@atlas/ui";
import { useAppStore } from "../../../store/useAppStore";

export const Company: React.FC = () => {
  const { addNotification } = useAppStore();
  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, taxId, billingAddress }),
      });
      const data = await res.json();
      if (data.success) {
        addNotification({
          id: Date.now().toString(),
          title: "Company Updated",
          message: data.message,
          type: "success",
          timestamp: new Date().toISOString(),
          read: false,
        });
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert("Failed to update company: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
          Company Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Company Name
            </label>
            <Input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Tax ID / VAT
            </label>
            <Input
              required
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
            />
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
          Billing Address
        </label>
        <Input
          type="text"
          value={billingAddress}
          onChange={(e) => setBillingAddress(e.target.value)}
        />
      </div>
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
        <Button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-lg shadow-sm"
        >
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
};
