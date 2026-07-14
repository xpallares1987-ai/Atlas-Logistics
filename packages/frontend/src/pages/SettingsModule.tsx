import { useState, useEffect } from 'react';
import { User, Building2, Key, Bell, Shield, PaintBucket, Smartphone, LogOut, Settings, Monitor, Moon, Sun, Globe } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from 'react-i18next';

export default function SettingsModule() {
  const location = window.location;
  
  const getInitialTab = () => {
    const hash = location.hash.replace('#', '');
    if (hash === 'profile') return 'Profile';
    if (hash === 'company') return 'Company';
    if (hash === 'security') return 'Security';
    if (hash === 'apikeys') return 'API';
    return 'Appearance';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());
  const { theme, setTheme, language, setLanguage, user } = useAppStore();
  const { t, i18n } = useTranslation();

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    window.location.hash = id.toLowerCase().replace(' ', '');
  };

  useEffect(() => {
    const handleHashChange = () => {
      setActiveTab(getInitialTab());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleLanguageChange = (lng: string) => {
    setLanguage(lng);
    i18n.changeLanguage(lng);
  };

  const tabs = [
    { id: 'Profile', icon: User, label: t('settings.profile') },
    { id: 'Company', icon: Building2, label: t('settings.company') },
    { id: 'Security', icon: Shield, label: t('settings.security') },
    { id: 'API', icon: Key, label: t('settings.apiKeys') },
    { id: 'Notifications', icon: Bell, label: t('settings.notifications') },
    { id: 'Appearance', icon: PaintBucket, label: t('settings.appearance') },
    { id: 'Devices', icon: Smartphone, label: t('settings.devices') },
  ];

  return (
    <div className="flex flex-col h-full bg-transparent text-slate-900 dark:text-slate-100">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-6 shrink-0 transition-colors">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{t('settings.title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('settings.description')}</p>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
          
          {/* Settings Sidebar */}
          <div className="w-full md:w-64 shrink-0 space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
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
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
              <LogOut className="w-5 h-5" />
              {t('settings.signOut')}
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
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2"><Shield size={18} /> Role Simulator (RBAC Test)</h3>
                  <p className="text-xs text-slate-500 mb-3">Change your current role to test the access control restrictions across different modules.</p>
                  <select 
                    value={user?.role || 'ADMIN'}
                    onChange={(e) => user && useAppStore.getState().setUser({ ...user, role: e.target.value as any })}
                    className="w-full px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                  >
                    <option value="ADMIN">ADMIN (Full Access)</option>
                    <option value="EXECUTIVE">EXECUTIVE (High Level & Finance)</option>
                    <option value="MANAGER">MANAGER (Operations & Finance)</option>
                    <option value="SALES">SALES (Pricing & Quotes)</option>
                    <option value="OPERATIONS">OPERATIONS (Logistics & Customs)</option>
                    <option value="CUSTOMER">CUSTOMER (Portal Only)</option>
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
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">{t('settings.theme')}</h3>
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
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">{t('settings.density')}</h3>
                  <div className="flex gap-4">
                    <button className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300">Comfortable</button>
                    <button className="px-4 py-2 rounded-lg border-2 border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-sm font-medium text-indigo-700 dark:text-indigo-400">Compact</button>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2"><Globe size={18} /> {t('settings.language')}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { code: 'en', label: 'English' },
                      { code: 'es', label: 'Español' },
                      { code: 'de', label: 'Deutsch' },
                      { code: 'fr', label: 'Français' },
                    ].map(lang => (
                      <button 
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                          language === lang.code 
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' 
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'API' && (
              <div className="max-w-3xl space-y-6">
                <div className="flex justify-between items-center mb-6">
                   <div>
                     <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">API Keys</h3>
                     <p className="text-xs text-slate-500">Manage your B2B integration tokens. Keep these secret.</p>
                   </div>
                   <button 
                     onClick={async () => {
                       try {
                         const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
                         const res = await fetch(`${backendUrl}/api/keys/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'New Integration Key' }) });
                         const data = await res.json();
                         if (data.success) {
                           alert(`Token generated! Please copy it now, you won't be able to see it again:\n\n${data.key.token}`);
                         }
                       } catch (e) {
                         alert('Error generating API key');
                       }
                     }}
                     className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm text-sm"
                   >
                     Generate New Token
                   </button>
                </div>
                
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">NAME</th>
                        <th className="px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">CREATED</th>
                        <th className="px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      <tr>
                        <td className="px-4 py-4 text-sm font-medium text-slate-800 dark:text-slate-200">Production ERP Sync</td>
                        <td className="px-4 py-4 text-sm text-slate-500">Oct 12, 2025</td>
                        <td className="px-4 py-4 text-sm text-right"><button className="text-rose-500 hover:text-rose-600 font-medium">Revoke</button></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab !== 'Profile' && activeTab !== 'Appearance' && activeTab !== 'API' && (
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
