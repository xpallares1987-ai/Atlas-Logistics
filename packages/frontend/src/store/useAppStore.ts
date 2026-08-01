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

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  read: boolean;
}

interface AppState {
  // Session / User State
  user: User | null;
  setUser: (user: User | null) => void;

  isAuthLoading: boolean;
  setAuthLoading: (isLoading: boolean) => void;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;

  // UI State
  theme: Theme;
  setTheme: (theme: Theme) => void;
  
  language: string;
  setLanguage: (lang: string) => void;
  
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  
  isNotificationsOpen: boolean;
  toggleNotifications: () => void;
  setNotificationsOpen: (isOpen: boolean) => void;
  
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  markAllNotificationsAsRead: () => void;
  
  isSettingsMenuOpen: boolean;
  toggleSettingsMenu: () => void;
  setSettingsMenuOpen: (isOpen: boolean) => void;
  
  isCopilotOpen: boolean;
  toggleCopilot: () => void;
  setCopilotOpen: (isOpen: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  isAuthLoading: true,
  setAuthLoading: (isLoading) => set({ isAuthLoading: isLoading }),
  
  checkAuth: async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        set({ user: { ...data.user, avatarInitials: data.user.email.substring(0, 2).toUpperCase() }, isAuthLoading: false });
      } else {
        set({ user: null, isAuthLoading: false });
      }
    } catch (error) {
      console.error('Failed to check auth:', error);
      set({ user: null, isAuthLoading: false });
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      set({ user: null });
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  },

  theme: 'light',
  setTheme: (theme) => set({ theme }),

  language: 'en',
  setLanguage: (language) => set({ language }),

  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  isNotificationsOpen: false,
  toggleNotifications: () => set((state) => ({ 
    isNotificationsOpen: !state.isNotificationsOpen,
    isSettingsMenuOpen: false // close other menus
  })),
  setNotificationsOpen: (isOpen) => set({ isNotificationsOpen: isOpen }),
  
  notifications: [],
  addNotification: (notification) => set((state) => ({ 
    notifications: [notification, ...state.notifications] 
  })),
  markAllNotificationsAsRead: () => set((state) => ({ 
    notifications: state.notifications.map(n => ({ ...n, read: true })) 
  })),

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
