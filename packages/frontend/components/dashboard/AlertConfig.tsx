'use client'

import React, { useState } from 'react';
import { Bell, Mail, Clock, AlertTriangle, TrendingUp, Smartphone, Plus, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { motion } from 'motion/react';

const ResponsiveContainer = dynamic<any>(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const LineChart = dynamic<any>(() => import('recharts').then(mod => mod.LineChart), { ssr: false });
const Line = dynamic<any>(() => import('recharts').then(mod => mod.Line), { ssr: false });
const XAxis = dynamic<any>(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic<any>(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic<any>(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic<any>(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });

const data = [
  { name: 'Jan', variance: 1.2 },
  { name: 'Feb', variance: 0.8 },
  { name: 'Mar', variance: 2.1 },
  { name: 'Apr', variance: 1.5 },
  { name: 'May', variance: 2.8 },
  { name: 'Jun', variance: 1.9 },
];

export const AlertConfig = () => {
  const [threshold, setThreshold] = useState(3); // days
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyDashboard, setNotifyDashboard] = useState(true);
  const [notifyPush, setNotifyPush] = useState(false);
  const [eventTypes, setEventTypes] = useState({
    etaChange: true,
    customsHold: true,
    arrival: false,
    docsPending: false
  });
  const [emails, setEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState(false);

  const toggleEventType = (key: keyof typeof eventTypes) => {
    setEventTypes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const addEmail = () => {
    const isValid = /\S+@\S+\.\S+/.test(newEmail);
    if (newEmail && isValid && !emails.includes(newEmail)) {
      setEmails([...emails, newEmail]);
      setNewEmail('');
      setEmailError(false);
    } else {
      setEmailError(true);
    }
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails(emails.filter(e => e !== emailToRemove));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#16161A] border border-gray-800 rounded-xl p-6 space-y-6"
    >
      <div className="flex items-center space-x-3">
        <Bell className="w-5 h-5 text-red-500" />
        <h3 className="text-lg font-bold text-white">Alertas Éticas Críticas</h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-400 flex items-center">
            <Clock className="w-4 h-4 mr-2" /> Umbral crítico (días)
          </label>
          <select 
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-24 bg-[#111114] border border-gray-800 rounded px-2 py-1 text-right text-sm"
          >
            <option value="3">3 días</option>
            <option value="5">5 días</option>
            <option value="10">10 días</option>
          </select>
        </div>

        <div className="space-y-4 pt-2 border-t border-gray-800/50">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-400 flex items-center">
              <Mail className="w-4 h-4 mr-2" /> Habilitar Notific. Email
            </span>
            <input 
              type="checkbox" 
              checked={notifyEmail} 
              onChange={() => setNotifyEmail(!notifyEmail)}
              className="w-4 h-4 text-blue-600 rounded bg-[#111114] border-gray-800"
            />
          </label>
          
          {notifyEmail && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input 
                  type="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    if (emailError) setEmailError(false);
                  }}
                  placeholder="ejemplo@forwarder.es"
                  className={`flex-1 bg-[#111114] border ${emailError ? 'border-red-500' : 'border-gray-800'} rounded px-3 py-1.5 text-sm outline-none`}
                />
                <button onClick={addEmail} className="bg-gray-800 p-1.5 rounded hover:bg-gray-700">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {emailError && <p className="text-[10px] text-red-500 mt-1">Formato de correo inválido.</p>}
              <div className="flex flex-wrap gap-2">
                {emails.map(email => (
                  <span key={email} className="bg-blue-900/30 text-blue-300 text-xs px-2 py-1 rounded flex items-center">
                    {email}
                    <button onClick={() => removeEmail(email)} className="ml-1.5 text-blue-400 hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-400 flex items-center">
              <Smartphone className="w-4 h-4 mr-2" /> Notificaciones Push
            </span>
            <input 
              type="checkbox" 
              checked={notifyPush} 
              onChange={() => setNotifyPush(!notifyPush)}
              className="w-4 h-4 text-blue-600 rounded bg-[#111114] border-gray-800"
            />
          </label>

          {notifyPush && (
            <div className="pl-6 space-y-2 border-l border-gray-800 ml-2">
              <p className="text-xs text-gray-500 font-semibold uppercase">Eventos a notificar:</p>
              {[
                { key: 'etaChange', label: 'Cambios de ETA' },
                { key: 'customsHold', label: 'Retenciones Aduaneras' },
                { key: 'arrival', label: 'Arribo a Puerto' },
                { key: 'docsPending', label: 'Docs. Pendientes' }
              ].map(event => (
                <label key={event.key} className="flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={eventTypes[event.key as keyof typeof eventTypes]} 
                    onChange={() => toggleEventType(event.key as keyof typeof eventTypes)}
                    className="w-3.5 h-3.5 text-blue-600 rounded bg-[#111114] border-gray-700"
                  />
                  <span className="text-xs text-gray-300 ml-2">{event.label}</span>
                </label>
              ))}
            </div>
          )}

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-400 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" /> Notificar en Dashboard
            </span>
            <input 
              type="checkbox" 
              checked={notifyDashboard} 
              onChange={() => setNotifyDashboard(!notifyDashboard)}
              className="w-4 h-4 text-blue-600 rounded bg-[#111114] border-gray-800"
            />
          </label>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-800 space-y-4">
        <div className="text-sm font-semibold text-gray-300 flex items-center">
          <TrendingUp className="w-4 h-4 mr-2 text-blue-400" />
          Tendencia de Variación ETA
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} />
              <YAxis stroke="#9ca3af" fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: '#111114', borderColor: '#374151', color: '#e5e7eb' }} />
              <Line type="monotone" dataKey="variance" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <motion.button 
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-semibold"
      >
        Guardar Configuración
      </motion.button>
    </motion.div>
  );
};
