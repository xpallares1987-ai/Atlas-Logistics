import { useState } from 'react';
import { User, Building2, Key, Bell, Shield, PaintBucket, Smartphone, LogOut, Settings, Monitor, Moon, Sun } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export default function SettingsModule() {
  const [activeTab, setActiveTab] = useState('Appearance');
  const { theme, setTheme, user } = useAppStore();

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
    <div className="flex flex-col h-full bg-transparent text-slate-900 dark:text-slate-100">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-6 shrink-0 transition-colors">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your account, team preferences, and system integrations.</p>
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
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            ))}
            <div className="h-px bg-slate-200 dark:bg-slate-800 my-4"></div>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors">
              <LogOut className="w-5 h-5" />
              Sign out of all devices
            </button>
          </div>

          {/* Settings Content Area */}
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 min-h-[500px] transition-colors">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">{activeTab}</h2>
            
            {activeTab === 'Profile' && (
              <div className="max-w-xl space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400 text-2xl font-black">
                    {user?.avatarInitials || 'JD'}
                  </div>
                  <div>
                    <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-colors">
                      Change Avatar
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">First Name</label>
                    <input type="text" defaultValue={user?.name.split(' ')[0] || "John"} className="w-full px-3 py-2 bg-transparent border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Last Name</label>
                    <input type="text" defaultValue={user?.name.split(' ')[1] || "Doe"} className="w-full px-3 py-2 bg-transparent border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                  <input type="email" defaultValue={user?.email || "john.doe@atlas.com"} className="w-full px-3 py-2 bg-transparent border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Timezone</label>
                  <select className="w-full px-3 py-2 bg-transparent border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:text-slate-200">
                    <option>Pacific Time (PT) - US & Canada</option>
                    <option>Eastern Time (ET) - US & Canada</option>
                    <option>Central European Time (CET)</option>
                    <option>China Standard Time (CST)</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm">
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'Appearance' && (
              <div className="max-w-xl space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Interface Theme</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <button 
                      onClick={() => setTheme('light')}
                      className={`flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        theme === 'light' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <Sun className={theme === 'light' ? 'text-indigo-600' : 'text-slate-400'} size={24} />
                      <span className={`text-sm font-medium ${theme === 'light' ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>Light</span>
                    </button>
                    <button 
                      onClick={() => setTheme('dark')}
                      className={`flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        theme === 'dark' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <Moon className={theme === 'dark' ? 'text-indigo-600' : 'text-slate-400'} size={24} />
                      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>Dark</span>
                    </button>
                    <button 
                      onClick={() => setTheme('system')}
                      className={`flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        theme === 'system' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <Monitor className={theme === 'system' ? 'text-indigo-600' : 'text-slate-400'} size={24} />
                      <span className={`text-sm font-medium ${theme === 'system' ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>System</span>
                    </button>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Density</h3>
                  <div className="flex gap-4">
                    <button className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300">Comfortable</button>
                    <button className="px-4 py-2 rounded-lg border-2 border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-sm font-medium text-indigo-700 dark:text-indigo-400">Compact</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab !== 'Profile' && activeTab !== 'Appearance' && (
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
