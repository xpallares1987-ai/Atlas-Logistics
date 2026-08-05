import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ship, Plane, Truck, ArrowRight, CheckCircle2, Calculator, Package, MapPin, X } from 'lucide-react';

interface QuoteWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBook: (quote: any) => void;
}

export function QuoteWizardModal({ isOpen, onClose, onBook }: QuoteWizardModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    type: 'Ocean',
    cargo: '20ft Container',
    weight: ''
  });
  const [isQuoting, setIsQuoting] = useState(false);
  const [generatedQuote, setGeneratedQuote] = useState<any>(null);

  const handleNext = () => {
    if (step === 2) {
      // Simulate generating quote
      setIsQuoting(true);
      setTimeout(() => {
        setGeneratedQuote({
          price: Math.floor(Math.random() * (4500 - 1500) + 1500),
          currency: 'USD',
          eta: '14-18 Days',
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
        });
        setIsQuoting(false);
        setStep(3);
      }, 1500);
    } else {
      setStep(step + 1);
    }
  };

  const handleBook = () => {
    onBook({ ...formData, ...generatedQuote });
    // Reset state after booking
    setStep(1);
    setFormData({ origin: '', destination: '', type: 'Ocean', cargo: '20ft Container', weight: '' });
    setGeneratedQuote(null);
  };

  const closeModal = () => {
    setStep(1);
    setFormData({ origin: '', destination: '', type: 'Ocean', cargo: '20ft Container', weight: '' });
    setGeneratedQuote(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          onClick={closeModal}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-indigo-950 p-6 text-white flex justify-between items-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20" />
            <div className="relative z-10 flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                <Calculator className="w-6 h-6 text-indigo-300" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Instant Freight Quote</h2>
                <p className="text-indigo-200 text-sm">Step {step} of 3</p>
              </div>
            </div>
            <button onClick={closeModal} className="relative z-10 text-white/50 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="h-1 bg-slate-100 w-full">
            <motion.div 
              className="h-full bg-indigo-500"
              initial={{ width: '33%' }}
              animate={{ width: `${(step / 3) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Content */}
          <div className="p-8 flex-1 overflow-y-auto bg-slate-50">
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-indigo-500" /> Route Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-600">Origin Port</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Shanghai, CN"
                      value={formData.origin}
                      onChange={e => setFormData({...formData, origin: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-600">Destination Port</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Los Angeles, US"
                      value={formData.destination}
                      onChange={e => setFormData({...formData, destination: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    />
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-indigo-500" /> Transport Mode
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {['Ocean', 'Air', 'Rail'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setFormData({...formData, type: mode})}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        formData.type === mode 
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' 
                        : 'border-slate-200 hover:border-indigo-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {mode === 'Ocean' && <Ship className="w-6 h-6" />}
                      {mode === 'Air' && <Plane className="w-6 h-6" />}
                      {mode === 'Rail' && <Truck className="w-6 h-6" />}
                      <span className="font-medium">{mode}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-500" /> Cargo Details
                </h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-600">Cargo Type / Size</label>
                    <select 
                      value={formData.cargo}
                      onChange={e => setFormData({...formData, cargo: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-white"
                    >
                      <option>20ft Container</option>
                      <option>40ft Container</option>
                      <option>LCL (Less than Container Load)</option>
                      <option>Air Freight (Pallets)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-600">Total Weight (kg) - Optional</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 5000"
                      value={formData.weight}
                      onChange={e => setFormData({...formData, weight: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    />
                  </div>
                </div>

                {isQuoting && (
                  <div className="mt-8 flex flex-col items-center justify-center p-8 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 mb-4" />
                    <p className="text-indigo-800 font-medium">Calculating optimal routes and rates...</p>
                  </div>
                )}
              </motion.div>
            )}

            {step === 3 && generatedQuote && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800">Quote Ready!</h3>
                  <p className="text-slate-500">Based on real-time market rates for your route.</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                      <p className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Total Cost</p>
                      <p className="text-4xl font-black text-indigo-600">
                        ${generatedQuote.price.toLocaleString()} <span className="text-lg text-slate-400 font-medium">{generatedQuote.currency}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Est. Transit Time</p>
                      <p className="text-xl font-bold text-slate-800">{generatedQuote.eta}</p>
                    </div>
                  </div>
                  <div className="p-6 grid grid-cols-2 gap-y-4 text-sm">
                    <div><span className="text-slate-500">Route:</span> <span className="font-semibold text-slate-800">{formData.origin} &rarr; {formData.destination}</span></div>
                    <div><span className="text-slate-500">Mode:</span> <span className="font-semibold text-slate-800">{formData.type}</span></div>
                    <div><span className="text-slate-500">Cargo:</span> <span className="font-semibold text-slate-800">{formData.cargo}</span></div>
                    <div><span className="text-slate-500">Valid Until:</span> <span className="font-semibold text-slate-800">{generatedQuote.validUntil}</span></div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-white border-t border-slate-100 flex justify-between items-center">
            {step > 1 && step < 3 && !isQuoting ? (
              <button 
                onClick={() => setStep(step - 1)}
                className="px-6 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Back
              </button>
            ) : <div />}

            {!isQuoting && (
              <button 
                onClick={step === 3 ? handleBook : handleNext}
                disabled={step === 1 && (!formData.origin || !formData.destination)}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {step === 1 && "Next Step"}
                {step === 2 && "Generate Quote"}
                {step === 3 && "Book Now"}
                {step !== 3 && <ArrowRight className="w-5 h-5" />}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
