import { useState } from 'react';
import { ShieldAlert, Search, FileCheck, CheckCircle2, AlertTriangle, AlertCircle, Calculator, Bot, Activity } from 'lucide-react';

interface CustomsDeclaration {
  id: string;
  blNumber: string;
  type: 'Import' | 'Export';
  status: 'Green Channel' | 'Orange Channel' | 'Red Channel' | 'Pending';
  duties: number;
  description: string;
}

const MOCK_DECLARATIONS: CustomsDeclaration[] = [
  { id: 'DEC-23001', blNumber: 'HBL-99238', type: 'Import', status: 'Green Channel', duties: 14500, description: 'Electronic Components' },
  { id: 'DEC-23002', blNumber: 'HBL-99239', type: 'Export', status: 'Pending', duties: 0, description: 'Automotive Parts' },
  { id: 'DEC-23003', blNumber: 'HBL-99240', type: 'Import', status: 'Red Channel', duties: 42000, description: 'Textiles & Apparel' },
  { id: 'DEC-23004', blNumber: 'HBL-99241', type: 'Export', status: 'Orange Channel', duties: 0, description: 'Agricultural Machinery' },
];

export default function CustomsClearanceModule() {
  const [hsCode, setHsCode] = useState('');
  const [calculatedDuty, setCalculatedDuty] = useState<number | null>(null);
  
  // AI Micro-analysis State
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, { riskScore: number, channelPrediction: string, flag: string }>>({});

  const handleAiAnalysis = (id: string) => {
    setAnalyzingId(id);
    // Simulate AI API Call
    setTimeout(() => {
      const risks = [
        { riskScore: 12, channelPrediction: 'Green', flag: 'Low risk. Historical compliance is 98%.' },
        { riskScore: 78, channelPrediction: 'Red', flag: 'High risk. HS Code mismatch probability.' },
        { riskScore: 45, channelPrediction: 'Orange', flag: 'Medium risk. New consignee detected.' },
        { riskScore: 5, channelPrediction: 'Green', flag: 'Low risk. Fast-track eligible.' }
      ];
      const randomRisk = risks[Math.floor(Math.random() * risks.length)];
      
      setAiAnalysis(prev => ({
        ...prev,
        [id]: randomRisk
      }));
      setAnalyzingId(null);
    }, 1500);
  };

  const handleCalculate = () => {
    if (hsCode) {
      // Simulate random duty calculation based on HS code
      setCalculatedDuty(Math.floor(Math.random() * 15) + 2); // 2% to 17%
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Green Channel': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Orange Channel': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Red Channel': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Pending': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Green Channel': return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'Orange Channel': return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'Red Channel': return <AlertCircle className="w-4 h-4 text-rose-600" />;
      case 'Pending': return <FileCheck className="w-4 h-4 text-slate-500" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900">
      <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-indigo-600" />
            Customs Clearance
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage declarations, HS codes, and customs channel status.</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8 flex flex-col xl:flex-row gap-8">
        
        {/* Declarations List */}
        <div className="flex-[2] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="font-bold text-slate-800 text-lg">Recent Declarations (DUA)</h2>
            <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
              + New Declaration
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <th className="p-4 font-bold">Declaration ID</th>
                  <th className="p-4 font-bold">B/L Ref</th>
                  <th className="p-4 font-bold">Type</th>
                  <th className="p-4 font-bold">Description</th>
                  <th className="p-4 font-bold text-right">Est. Duties</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold text-center">AI Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {MOCK_DECLARATIONS.map(dec => (
                  <tr key={dec.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-mono font-medium text-indigo-600">{dec.id}</td>
                    <td className="p-4 text-sm text-slate-600">{dec.blNumber}</td>
                    <td className="p-4 text-sm font-medium text-slate-700">{dec.type}</td>
                    <td className="p-4 text-sm text-slate-600">{dec.description}</td>
                    <td className="p-4 text-sm font-mono text-slate-700 text-right">${dec.duties.toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(dec.status)}`}>
                        {getStatusIcon(dec.status)}
                        {dec.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {aiAnalysis[dec.id] ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                            aiAnalysis[dec.id].riskScore > 60 ? 'bg-rose-100 text-rose-700' :
                            aiAnalysis[dec.id].riskScore > 30 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {aiAnalysis[dec.id].riskScore}% Risk
                          </span>
                          <span className="text-[10px] text-slate-500 max-w-[120px] truncate" title={aiAnalysis[dec.id].flag}>
                            {aiAnalysis[dec.id].flag}
                          </span>
                        </div>
                      ) : analyzingId === dec.id ? (
                        <div className="flex items-center justify-center gap-2 text-indigo-600 text-xs font-medium">
                          <Activity className="w-4 h-4 animate-pulse" />
                          Analyzing...
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleAiAnalysis(dec.id)}
                          className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors group flex items-center justify-center gap-2 mx-auto w-full max-w-[120px]"
                        >
                          <Bot className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold">AI Scan</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* HS Code Calculator */}
        <div className="flex-1 min-w-[350px]">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-0">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-500" />
                HS Code Duty Calculator
              </h2>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Harmonized System (HS) Code</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                  <input 
                    type="text" 
                    value={hsCode} 
                    onChange={(e) => setHsCode(e.target.value)} 
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono" 
                    placeholder="e.g. 8517.12.00" 
                  />
                </div>
                <button 
                  onClick={handleCalculate}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
                >
                  Lookup
                </button>
              </div>

              {calculatedDuty !== null && (
                <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Estimated Duty Rate</p>
                  <div className="text-3xl font-black text-indigo-700 mb-2">{calculatedDuty}%</div>
                  <p className="text-xs text-indigo-600/80">
                    This is an estimated general tariff. Preferential rates may apply depending on the Certificate of Origin.
                  </p>
                </div>
              )}

              <div className="mt-6 border-t border-slate-100 pt-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Inspection Channels</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">Green Channel</p>
                      <p className="text-xs text-slate-500">Cleared without physical inspection or document check.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">Orange Channel</p>
                      <p className="text-xs text-slate-500">Documentary check required before release.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">Red Channel</p>
                      <p className="text-xs text-slate-500">Physical inspection of goods and documentation required.</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
