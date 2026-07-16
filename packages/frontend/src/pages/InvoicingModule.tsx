// @ts-nocheck
import { useState, useEffect } from 'react';
import { Receipt, Download, FileSignature, Landmark, ArrowUpRight, ArrowDownRight, DollarSign, Plus, X, Search, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: 'AR' | 'AP' | 'CN' | 'DN';
  party: string;
  amount: number;
  currency: string;
  status: 'Draft' | 'Issued' | 'Pending' | 'Paid' | 'Overdue' | 'Cancelled';
  dueDate: string;
  shipmentId?: string;
  partyId: string;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export default function InvoicingModule() {
  const [activeTab, setActiveTab] = useState<'All' | 'AR' | 'AP' | 'Settlements'>('All');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [newInvoice, setNewInvoice] = useState({
    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
    type: 'AR',
    partyId: '', // Ideally from a dropdown of companies
    currency: 'USD',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    subtotal: 0,
    taxAmount: 0,
    totalAmount: 0,
    lines: [
      { description: 'Ocean Freight', quantity: 1, unitPrice: 0, amount: 0, taxRate: 0 }
    ]
  });

  useEffect(() => {
    fetchInvoices();
    fetchSettlements();
  }, []);

  const fetchSettlements = async () => {
    try {
      const res = await fetch(`${API_URL}/agent-settlements`);
      const data = await res.json();
      setSettlements(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/invoices`);
      const data = await res.json();
      setInvoices(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const res = await fetch(`${API_URL}/invoices/${invoiceId}/pdf`);
      if (!res.ok) throw new Error('Failed to generate PDF');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Error downloading PDF. Please try again.');
    }
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const updatedLines = [...newInvoice.lines];
    updatedLines[index] = { ...updatedLines[index], [field]: value };
    
    // Auto calculate amount
    if (field === 'quantity' || field === 'unitPrice') {
      updatedLines[index].amount = Number(updatedLines[index].quantity) * Number(updatedLines[index].unitPrice);
    }

    // Auto calculate totals
    const subtotal = updatedLines.reduce((acc, l) => acc + (l.amount || 0), 0);
    const taxAmount = updatedLines.reduce((acc, l) => acc + ((l.amount || 0) * (l.taxRate || 0) / 100), 0);
    const totalAmount = subtotal + taxAmount;

    setNewInvoice({ ...newInvoice, lines: updatedLines, subtotal, taxAmount, totalAmount });
  };

  const addLine = () => {
    setNewInvoice({
      ...newInvoice,
      lines: [...newInvoice.lines, { description: '', quantity: 1, unitPrice: 0, amount: 0, taxRate: 0 }]
    });
  };

  const submitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Create a dummy partyId if empty for demo purposes
      const payload = {
        ...newInvoice,
        partyId: newInvoice.partyId || '00000000-0000-0000-0000-000000000000'
      };

      await fetch(`${API_URL}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setIsModalOpen(false);
      fetchInvoices();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredInvoices = invoices.filter(i => activeTab === 'All' || i.type === activeTab);
  const totalAR = invoices.filter(i => i.type === 'AR').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalAP = invoices.filter(i => i.type === 'AP').reduce((acc, curr) => acc + Number(curr.amount), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Overdue': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Draft': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 relative">
      <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Landmark className="w-6 h-6 text-indigo-600" />
            Invoicing & Settlement
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage Accounts Receivable, Accounts Payable, and shipment profitability.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Create Invoice
        </button>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <ArrowDownRight className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded uppercase tracking-wider">A/R</span>
              </div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Accounts Receivable</p>
              <h3 className="text-3xl font-black text-slate-800">${totalAR.toLocaleString()}</h3>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 text-rose-600" />
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded uppercase tracking-wider">A/P</span>
              </div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Accounts Payable</p>
              <h3 className="text-3xl font-black text-slate-800">${totalAP.toLocaleString()}</h3>
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-2xl shadow-md text-white">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-white/10 text-white rounded uppercase tracking-wider">NET</span>
              </div>
              <p className="text-sm font-medium text-indigo-200 uppercase tracking-widest mb-1">Net Balance</p>
              <h3 className="text-3xl font-black text-white">${(totalAR - totalAP).toLocaleString()}</h3>
            </div>
          </div>

          {/* Invoice List */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex gap-2 bg-slate-50/50">
              {(['All', 'AR', 'AP', 'Settlements'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab 
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' 
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {tab === 'All' ? 'All Invoices' : tab === 'AR' ? 'Accounts Receivable' : tab === 'AP' ? 'Accounts Payable' : 'Agent Settlements'}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              {activeTab === 'Settlements' ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                      <th className="px-6 py-4 font-medium">Statement No.</th>
                      <th className="px-6 py-4 font-medium">Agent</th>
                      <th className="px-6 py-4 font-medium">Period</th>
                      <th className="px-6 py-4 font-medium">Net Balance</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Loading settlements...</td></tr>
                    ) : settlements.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center">
                            <Landmark className="w-12 h-12 text-slate-300 mb-3" />
                            <p className="text-lg font-medium">No settlements found</p>
                          </div>
                        </td>
                      </tr>
                    ) : settlements.map((set) => (
                      <tr key={set.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-800">{set.statementNumber}</td>
                        <td className="px-6 py-4 text-slate-600">{set.agentName || 'Unknown'}</td>
                        <td className="px-6 py-4 text-slate-500">{new Date(set.periodStart).toLocaleDateString()} - {new Date(set.periodEnd).toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-medium text-slate-800">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: set.currency || 'USD' }).format(set.netBalance)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(set.status)}`}>
                            {set.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                      <th className="px-6 py-4 font-medium">Invoice No.</th>
                      <th className="px-6 py-4 font-medium">Type</th>
                      <th className="px-6 py-4 font-medium">Party</th>
                      <th className="px-6 py-4 font-medium">Amount</th>
                      <th className="px-6 py-4 font-medium">Due Date</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Loading invoices...</td></tr>
                    ) : filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center">
                            <Receipt className="w-12 h-12 text-slate-300 mb-3" />
                            <p className="text-lg font-medium">No invoices found</p>
                            <p className="text-sm text-slate-400">Create an invoice to get started.</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4 font-medium text-slate-800">{inv.invoiceNumber}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                            inv.type === 'AR' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {inv.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{inv.party || 'Unknown Company'}</td>
                        <td className="px-6 py-4 font-medium text-slate-800">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: inv.currency }).format(inv.amount)}
                        </td>
                        <td className="px-6 py-4 text-slate-500">{new Date(inv.dueDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(inv.status)}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => downloadPdf(inv.id, inv.invoiceNumber)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CREATE INVOICE MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <FileSignature className="w-5 h-5 text-indigo-600" />
                  Issue New Invoice
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Number</label>
                    <input type="text" value={newInvoice.invoiceNumber} onChange={e => setNewInvoice({...newInvoice, invoiceNumber: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                    <select value={newInvoice.type} onChange={e => setNewInvoice({...newInvoice, type: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                      <option value="AR">Account Receivable (AR)</option>
                      <option value="AP">Account Payable (AP)</option>
                      <option value="CN">Credit Note (CN)</option>
                      <option value="DN">Debit Note (DN)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                    <select value={newInvoice.currency} onChange={e => setNewInvoice({...newInvoice, currency: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                    <input type="date" value={newInvoice.dueDate} onChange={e => setNewInvoice({...newInvoice, dueDate: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 grid grid-cols-12 gap-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                    <div className="col-span-5">Description</div>
                    <div className="col-span-2">Qty</div>
                    <div className="col-span-2">Price</div>
                    <div className="col-span-3 text-right">Amount</div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {newInvoice.lines.map((line, idx) => (
                      <div key={idx} className="p-2 grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5">
                          <input type="text" value={line.description} onChange={e => handleLineChange(idx, 'description', e.target.value)} placeholder="e.g. Ocean Freight" className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                        <div className="col-span-2">
                          <input type="number" value={line.quantity} onChange={e => handleLineChange(idx, 'quantity', e.target.value)} className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                        <div className="col-span-2">
                          <input type="number" value={line.unitPrice} onChange={e => handleLineChange(idx, 'unitPrice', e.target.value)} className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                        <div className="col-span-3 text-right font-medium text-slate-700">
                          ${line.amount.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 border-t border-slate-100 bg-slate-50">
                    <button onClick={addLine} type="button" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add Line
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="w-64 space-y-2 text-sm">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal:</span>
                      <span className="font-medium">${newInvoice.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Taxes:</span>
                      <span className="font-medium">${newInvoice.taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-bold text-lg pt-2 border-t border-slate-200">
                      <span>Total:</span>
                      <span>${newInvoice.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={submitInvoice} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm rounded-lg transition-colors">
                  Save Invoice
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
