'use client';

import React from 'react';
import Image from 'next/image';
import { User, Camera, Bell, Mail, Smartphone } from 'lucide-react';

export interface UserProfileData {
  profileImage: string | null;
  emailAlerts: boolean;
  pushAlerts: boolean;
  dailyDigest: boolean;
}

interface UserProfileConfigProps {
  profile: UserProfileData;
  onChange: (newProfile: UserProfileData) => void;
}

export default function UserProfileConfig({ profile, onChange }: UserProfileConfigProps) {
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      onChange({ ...profile, profileImage: imageUrl });
    }
  };

  return (
    <div className="bg-[#16161A] border border-gray-800 rounded-xl p-5 mb-8">
      <h3 className="text-sm font-medium text-gray-300 flex items-center mb-5 pb-3 border-b border-gray-800">
        <User className="w-4 h-4 mr-2 text-blue-400" />
        Configuración de Perfil y Preferencias
      </h3>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Foto de Perfil */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-24 h-24 rounded-full bg-[#0A0A0B] border-2 border-gray-800 flex items-center justify-center overflow-hidden group">
            {profile.profileImage ? (
              <Image src={profile.profileImage} alt="Profile" fill className="object-cover" unoptimized />
            ) : (
              <User className="w-10 h-10 text-gray-400 group-hover:text-gray-300 transition-colors" />
            )}
            <label htmlFor="file-upload-input" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              <Camera className="w-6 h-6 text-white" />
              <input 
                type="file" 
                id="file-upload-input"
                name="profileImageUpload"
                accept="image/*" 
                className="hidden" 
                onChange={handleImageUpload} 
              />
            </label>
          </div>
          <span className="text-xs text-gray-400">Cargar Foto</span>
        </div>

        {/* Preferencias de Notificaciones */}
        <div className="flex-1 space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-gray-300 mb-3 flex items-center">
              <Bell className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
              Preferencias Globales de Notificación
            </h4>
            
            <div className="space-y-3">
              <label htmlFor="pref-email-alerts" className="flex items-center justify-between p-3 border border-gray-800 rounded-lg bg-[#0A0A0B] cursor-pointer hover:border-gray-700 transition">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 text-gray-400 mr-3" />
                  <div>
                    <span className="block text-xs font-medium text-gray-200">Alertas por Correo Electrónico</span>
                    <span className="block text-[10px] text-gray-400 mt-0.5">Recibir actualizaciones críticas de embarques.</span>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  id="pref-email-alerts"
                  name="emailAlerts"
                  checked={profile.emailAlerts} 
                  onChange={(e) => onChange({...profile, emailAlerts: e.target.checked})} 
                  className="rounded border-gray-700 text-blue-500 bg-[#111114] w-4 h-4" 
                />
              </label>

              <label htmlFor="pref-push-alerts" className="flex items-center justify-between p-3 border border-gray-800 rounded-lg bg-[#0A0A0B] cursor-pointer hover:border-gray-700 transition">
                <div className="flex items-center">
                  <Smartphone className="w-4 h-4 text-gray-400 mr-3" />
                  <div>
                    <span className="block text-xs font-medium text-gray-200">Notificaciones Push (App)</span>
                    <span className="block text-[10px] text-gray-400 mt-0.5">Alertas instantáneas en tu dispositivo móvil.</span>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  id="pref-push-alerts"
                  name="pushAlerts"
                  checked={profile.pushAlerts} 
                  onChange={(e) => onChange({...profile, pushAlerts: e.target.checked})} 
                  className="rounded border-gray-700 text-blue-500 bg-[#111114] w-4 h-4" 
                />
              </label>

              <label htmlFor="pref-daily-digest" className="flex items-center justify-between p-3 border border-gray-800 rounded-lg bg-[#0A0A0B] cursor-pointer hover:border-gray-700 transition">
                <div className="flex items-center">
                  <Bell className="w-4 h-4 text-gray-400 mr-3" />
                  <div>
                    <span className="block text-xs font-medium text-gray-200">Resumen Diario</span>
                    <span className="block text-[10px] text-gray-400 mt-0.5">Un reporte diario con el estatus de todos tus embarques activos.</span>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  id="pref-daily-digest"
                  name="dailyDigest"
                  checked={profile.dailyDigest} 
                  onChange={(e) => onChange({...profile, dailyDigest: e.target.checked})} 
                  className="rounded border-gray-700 text-blue-500 bg-[#111114] w-4 h-4" 
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
