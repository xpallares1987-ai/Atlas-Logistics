'use client';

import React, { useState } from 'react';
import { Bell, Mail, Smartphone, Clock, ChevronDown } from 'lucide-react';

export default function AlertConfiguration() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [thresholdDays, setThresholdDays] = useState(3);

  return (
    <div className="bg-[#16161A] border border-gray-800 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-300 flex items-center">
          <Bell className="w-4 h-4 mr-2 text-yellow-500" />
          Configuración de Alertas & ETA
        </h4>
        <label className="flex items-center cursor-pointer">
          <div className="relative">
            <input 
              type="checkbox" 
              id="notifications-enabled-checkbox"
              name="notificationsEnabled"
              className="sr-only" 
              checked={notificationsEnabled} 
              onChange={(e) => setNotificationsEnabled(e.target.checked)} 
            />
            <div className={`block w-10 h-6 rounded-full transition-colors duration-300 ${notificationsEnabled ? 'bg-blue-500' : 'bg-gray-700'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${notificationsEnabled ? 'transform translate-x-4' : ''}`}></div>
          </div>
        </label>
      </div>
      
      {notificationsEnabled ? (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <p className="text-xs text-gray-400">Recibe notificaciones preventivas antes de que se cumpla la fecha estimada de llegada (ETA).</p>
          
          <div className="bg-[#0A0A0B] border border-gray-800 rounded-lg p-4 space-y-4">
            <div>
              <label htmlFor="threshold-days-select" className="block text-xs font-medium text-gray-400 mb-2 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1.5" /> Umbral de Notificación Preventiva
              </label>
              <div className="flex items-center space-x-3">
                <span className="text-xs text-gray-400">Avisar</span>
                <select 
                  id="threshold-days-select"
                  name="thresholdDays"
                  value={thresholdDays}
                  onChange={(e) => setThresholdDays(Number(e.target.value))}
                  className="bg-[#111114] border border-gray-700 rounded-md text-xs text-white p-2 focus:border-blue-500 focus:outline-none"
                >
                  <option value={1}>1 día</option>
                  <option value={2}>2 días</option>
                  <option value={3}>3 días</option>
                  <option value={5}>5 días</option>
                  <option value={7}>1 semana</option>
                </select>
                <span className="text-xs text-gray-400">antes del ETA</span>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-800/50 space-y-3">
              <label htmlFor="email-enabled-checkbox" className="flex items-start p-3 border border-gray-800 rounded-lg bg-[#111114] cursor-pointer hover:border-gray-700 transition">
                <div className="pt-0.5">
                  <input 
                    type="checkbox" 
                    id="email-enabled-checkbox"
                    name="emailEnabled"
                    className="rounded border-gray-700 text-blue-500 bg-[#0A0A0B] w-4 h-4" 
                    checked={emailEnabled} 
                    onChange={(e) => setEmailEnabled(e.target.checked)} 
                  />
                </div>
                <div className="ml-3 flex-1">
                  <span className="text-xs font-medium text-gray-300 flex items-center mb-1"><Mail className="w-3.5 h-3.5 mr-1.5 text-gray-400" /> Alertas por Email</span>
                  {emailEnabled && (
                    <input 
                      type="email" 
                      id="alert-email-address-input"
                      name="emailAddress"
                      placeholder="Correo electrónico para alertas..." 
                      value={emailAddress} 
                      onChange={(e) => setEmailAddress(e.target.value)} 
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-[#0A0A0B] border border-gray-800 rounded text-xs p-2.5 text-white mt-2 focus:border-blue-500 focus:outline-none" 
                    />
                  )}
                </div>
              </label>

              <label htmlFor="push-enabled-checkbox" className="flex items-center justify-between p-3 border border-gray-800 rounded-lg bg-[#111114] cursor-pointer hover:border-gray-700 transition">
                <div>
                  <span className="text-xs font-medium text-gray-300 flex items-center"><Smartphone className="w-3.5 h-3.5 mr-1.5 text-gray-400" /> Push (App)</span>
                  <p className="text-[10px] text-gray-400 mt-0.5">Recibir notificaciones directamente en el dispositivo móvil.</p>
                </div>
                <input 
                  type="checkbox" 
                  id="push-enabled-checkbox"
                  name="pushEnabled"
                  className="rounded border-gray-700 text-blue-500 bg-[#0A0A0B] w-4 h-4 ml-3" 
                  checked={pushEnabled} 
                  onChange={(e) => setPushEnabled(e.target.checked)} 
                />
              </label>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-xs text-gray-400 text-center py-4 bg-[#0A0A0B] rounded-lg border border-gray-800/50">
          Las notificaciones preventivas y alertas de ETA están desactivadas para este embarque.
        </div>
      )}
    </div>
  );
}
