import { useState, useEffect } from 'react';
import { Receipt, Download, FileSignature, Landmark, ArrowUpRight, ArrowDownRight, DollarSign } from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: 'AR' | 'AP';
  party: string;
  amount: number;
  currency: string;
  status: 'Paid' | 'Pending' | 'Overdue';
  dueDate: string;
  shipmentId: string;
}

// @ts-ignore
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export default function InvoicingModule() {
  const [activeTab, setActiveTab] = useState<'All' | 'AR' | 'AP'>('All');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/invoices`);
      const data = await res.json();
      setInvoices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(i => activeTab === 'All' || i.type === activeTab);

  const totalAR = invoices.filter(i => i.type === 'AR').reduce((acc, curr) => acc + curr.amount, 0);
  const totalAP = invoices.filter(i => i.type === 'AP').reduce((acc, curr) => acc + curr.amount, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Overdue': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900">
      <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Landmark className="w-6 h-6 text-indigo-600" />
            Invoicing & Settlement
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage Accounts Receivable, Accounts Payable, and shipment profitability.</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm flex items-center gap-2">
          <FileSignature className="w-4 h-4" /> Create Invoice
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
                <span className="text-xs font-bold px-2 py-1 bg-white/10 text-white/80 rounded uppercase tracking-wider">Net</span>
              </div>
              <p className="text-sm font-bold text-indigo-100 uppercase tracking-widest mb-1">Net Balance</p>
              <h3 className="text-3xl font-black text-white">${(totalAR - totalAP).toLocaleString()}</h3>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex gap-2 bg-slate-50/50">
              {['All', 'AR', 'AP'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${activeTab === tab ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200'}`}
                >
                  {tab === 'All' ? 'General Ledger' : tab === 'AR' ? 'Receivables (Invoices)' : 'Payables (Bills)'}
                </button>
              ))}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                    <th className="p-4 font-bold">Invoice ID</th>
                    <th className="p-4 font-bold">Ref (Booking)</th>
                    <th className="p-4 font-bold">Type</th>
                    <th className="p-4 font-bold">Party</th>
                    <th className="p-4 font-bold">Due Date</th>
                    <th className="p-4 font-bold text-right">Amount</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-800 flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-slate-400" /> {inv.invoiceNumber}
                      </td>
                      <td className="p-4 text-sm text-indigo-600 font-medium hover:underline cursor-pointer">Booking Link</td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${inv.type === 'AR' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {inv.type}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-medium text-slate-700">{inv.party}</td>
                      <td className="p-4 text-sm text-slate-600 font-mono">{inv.dueDate}</td>
                      <td className="p-4 text-sm font-mono font-bold text-slate-800 text-right">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: inv.currency }).format(inv.amount)}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(inv.status)}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Download PDF">
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        No invoices found for this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
