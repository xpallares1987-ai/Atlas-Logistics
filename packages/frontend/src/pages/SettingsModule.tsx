import { useState } from 'react';
import { User, Building2, Key, Bell, Shield, PaintBucket, Smartphone, LogOut, Settings } from 'lucide-react';

export default function SettingsModule() {
  const [activeTab, setActiveTab] = useState('Profile');

  const tabs = [
    { id: 'Profile', icon: User, label: 'Profile Preferences' },
    { id: 'Company', icon: Building2, label: 'Company Settings' },
    { id: 'Security', icon: Shield, label: 'Security & Access' },
    { id: 'API', icon: Key, label: 'API Keys & Webhooks' },
    { id: 'Notifications', icon: Bell, label: 'Notification Rules' },
    { id: 'Appearance', icon: PaintBucket, label: 'Appearance' },
    { id: 'Devices', icon: Smartphone, label: 'Active Devices' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900">
      <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your account, team preferences, and system integrations.</p>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
          
          {/* Settings Sidebar */}
          <div className="w-full md:w-64 shrink-0 space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-indigo-50 text-indigo-700' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            ))}
            <div className="h-px bg-slate-200 my-4"></div>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors">
              <LogOut className="w-5 h-5" />
              Sign out of all devices
            </button>
          </div>

          {/* Settings Content Area */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-8 min-h-[500px]">
            <h2 className="text-xl font-bold text-slate-800 mb-6 pb-4 border-b border-slate-100">{activeTab}</h2>
            
            {activeTab === 'Profile' && (
              <div className="max-w-xl space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 text-2xl font-black">
                    JD
                  </div>
                  <div>
                    <button className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors">
                      Change Avatar
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                    <input type="text" defaultValue="John" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                    <input type="text" defaultValue="Doe" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <input type="email" defaultValue="john.doe@atlas.com" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
                  <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                    <option>Pacific Time (PT) - US & Canada</option>
                    <option>Eastern Time (ET) - US & Canada</option>
                    <option>Central European Time (CET)</option>
                    <option>China Standard Time (CST)</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm">
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {activeTab !== 'Profile' && (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Settings className="w-12 h-12 mb-4 opacity-20" />
                <p>This settings panel ({activeTab}) is under construction.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
