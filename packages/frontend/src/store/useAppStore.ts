import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';
type Role = 'ADMIN' | 'EXECUTIVE' | 'MANAGER' | 'SALES' | 'OPERATIONS' | 'CUSTOMER';

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarInitials: string;
}

interface AppState {
  // Session / User State
  user: User | null;
  setUser: (user: User | null) => void;

  // UI State
  theme: Theme;
  setTheme: (theme: Theme) => void;
  
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  
  isNotificationsOpen: boolean;
  toggleNotifications: () => void;
  setNotificationsOpen: (isOpen: boolean) => void;
  
  isSettingsMenuOpen: boolean;
  toggleSettingsMenu: () => void;
  setSettingsMenuOpen: (isOpen: boolean) => void;
  
  isCopilotOpen: boolean;
  toggleCopilot: () => void;
  setCopilotOpen: (isOpen: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Default mock user for now
  user: {
    id: 'usr_1',
    name: 'John Doe',
    email: 'john.doe@atlas.com',
    role: 'ADMIN',
    avatarInitials: 'JD'
  },
  setUser: (user) => set({ user }),

  theme: 'light',
  setTheme: (theme) => set({ theme }),

  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  isNotificationsOpen: false,
  toggleNotifications: () => set((state) => ({ 
    isNotificationsOpen: !state.isNotificationsOpen,
    isSettingsMenuOpen: false // close other menus
  })),
  setNotificationsOpen: (isOpen) => set({ isNotificationsOpen: isOpen }),

  isSettingsMenuOpen: false,
  toggleSettingsMenu: () => set((state) => ({ 
    isSettingsMenuOpen: !state.isSettingsMenuOpen,
    isNotificationsOpen: false // close other menus
  })),
  setSettingsMenuOpen: (isOpen) => set({ isSettingsMenuOpen: isOpen }),

  isCopilotOpen: false,
  toggleCopilot: () => set((state) => ({ isCopilotOpen: !state.isCopilotOpen })),
  setCopilotOpen: (isOpen) => set({ isCopilotOpen: isOpen }),
}));
