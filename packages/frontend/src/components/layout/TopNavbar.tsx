import React from "react";
import { Link } from "react-router-dom";
import { Menu, Bell, Settings } from "lucide-react";
import { OmniSearch } from "@atlas/ui/src/components/OmniSearch";
import { useAppStore } from "../../store/useAppStore";
import { useTranslation } from "react-i18next";
import { ApiStatusIndicator } from "../ApiStatusIndicator";
import { Button } from "@atlas/ui";

interface TopNavbarProps {
  setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ setMobileMenuOpen }) => {
  const {
    user,
    isNotificationsOpen,
    toggleNotifications,
    isSettingsMenuOpen,
    toggleSettingsMenu,
    setSettingsMenuOpen,
    notifications,
    markAllNotificationsAsRead,
    logout,
  } = useAppStore();
  const { t } = useTranslation();

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 z-30 shrink-0">
      <div className="flex-1 flex items-center gap-4">
        <Button
          className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg h-auto"
          onClick={() => setMobileMenuOpen(true)}
          variant="ghost"
        >
          <Menu size={24} />
        </Button>
        <div className="max-w-xl hidden md:flex items-center gap-6 w-full">
          <OmniSearch />
        </div>
      </div>
      <div className="flex items-center gap-4 ml-4">
        <ApiStatusIndicator />
        <div className="relative">
          <Button
            onClick={toggleNotifications}
            variant="ghost"
            className="p-2 text-slate-400 hover:text-indigo-600 relative h-auto"
          >
            <Bell size={20} />
            {notifications.filter((n) => !n.read).length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            )}
          </Button>
          {isNotificationsOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800">Notifications</h3>
                <span
                  onClick={markAllNotificationsAsRead}
                  className="text-xs text-indigo-600 cursor-pointer hover:underline font-medium"
                >
                  Mark all as read
                </span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((n, idx) => (
                    <div
                      key={n.id || idx}
                      className={`p-4 border-b border-slate-50 transition-colors flex gap-3 ${n.read ? "opacity-50 bg-white" : "bg-slate-50"}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.type === "warning" ? "bg-amber-100" : n.type === "error" ? "bg-rose-100" : "bg-indigo-100"}`}
                      >
                        <Bell
                          size={14}
                          className={`${n.type === "warning" ? "text-amber-600" : n.type === "error" ? "text-rose-600" : "text-indigo-600"}`}
                        />
                      </div>
                      <div>
                        <p className="text-sm text-slate-800 font-medium">
                          {n.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(n.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <div className="relative">
          <Button
            onClick={toggleSettingsMenu}
            variant="ghost"
            className="p-2 text-slate-400 hover:text-indigo-600 h-auto"
          >
            <Settings size={20} />
          </Button>
          {isSettingsMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden py-2">
              <div className="px-4 py-3 border-b border-slate-100 mb-1">
                <p className="text-sm font-bold text-slate-800">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              <Link
                to="/settings#profile"
                onClick={() => setSettingsMenuOpen(false)}
                className="block w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
              >
                {t("settings.profile")}
              </Link>
              <Link
                to="/settings#company"
                onClick={() => setSettingsMenuOpen(false)}
                className="block w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
              >
                {t("settings.company")}
              </Link>
              <Link
                to="/settings#apikeys"
                onClick={() => setSettingsMenuOpen(false)}
                className="block w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
              >
                {t("settings.apiKeys")}
              </Link>
              <div className="h-px bg-slate-100 my-1"></div>
              <Button
                onClick={async () => {
                  setSettingsMenuOpen(false);
                  await logout();
                }}
                variant="ghost"
                className="w-full justify-start px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-normal rounded-none h-auto"
              >
                {t("settings.signOut")}
              </Button>
            </div>
          )}
        </div>
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200 text-indigo-700 font-bold text-sm ml-2">
          {user?.avatarInitials}
        </div>
      </div>
    </header>
  );
};
