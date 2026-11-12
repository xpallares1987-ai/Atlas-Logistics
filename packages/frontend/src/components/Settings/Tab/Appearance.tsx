/**
 * @file Appearance.tsx
 * @description Theme mode, layout density, and multilingual preferences configuration tab.
 * @module @atlas/frontend/components/Settings/Tab/Appearance
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import { Globe, Monitor, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@atlas/ui";
import { useAppStore } from "../../../store/useAppStore";

export const Appearance: React.FC = () => {
  const { theme, setTheme, language, setLanguage } = useAppStore();
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (lng: string) => {
    setLanguage(lng);
    i18n.changeLanguage(lng);
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
          {t("settings.theme")}
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <Button
            onClick={() => setTheme("light")}
            variant="outline"
            className={`h-auto flex-col justify-center gap-3 p-4 rounded-xl border-2 transition-colors duration-150 ${
              theme === "light"
                ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
            }`}
          >
            <Sun
              className={
                theme === "light" ? "text-indigo-600" : "text-slate-400"
              }
              size={24}
            />
            <span
              className={`text-sm font-medium ${
                theme === "light"
                  ? "text-indigo-700 dark:text-indigo-400"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Light
            </span>
          </Button>

          <Button
            onClick={() => setTheme("dark")}
            variant="outline"
            className={`h-auto flex-col justify-center gap-3 p-4 rounded-xl border-2 transition-colors duration-150 ${
              theme === "dark"
                ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
            }`}
          >
            <Moon
              className={
                theme === "dark" ? "text-indigo-600" : "text-slate-400"
              }
              size={24}
            />
            <span
              className={`text-sm font-medium ${
                theme === "dark"
                  ? "text-indigo-700 dark:text-indigo-400"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Dark
            </span>
          </Button>

          <Button
            onClick={() => setTheme("system")}
            variant="outline"
            className={`h-auto flex-col justify-center gap-3 p-4 rounded-xl border-2 transition-colors duration-150 ${
              theme === "system"
                ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
            }`}
          >
            <Monitor
              className={
                theme === "system" ? "text-indigo-600" : "text-slate-400"
              }
              size={24}
            />
            <span
              className={`text-sm font-medium ${
                theme === "system"
                  ? "text-indigo-700 dark:text-indigo-400"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              System
            </span>
          </Button>
        </div>
      </div>

      <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
          {t("settings.density")}
        </h3>
        <div className="flex gap-4">
          <Button
            variant="outline"
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 h-auto"
          >
            Comfortable
          </Button>
          <Button
            variant="outline"
            className="px-4 py-2 rounded-lg border-2 border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-sm font-medium text-indigo-700 dark:text-indigo-400 h-auto"
          >
            Compact
          </Button>
        </div>
      </div>

      <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <Globe size={18} /> {t("settings.language")}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { code: "en", label: "English" },
            { code: "es", label: "Español" },
            { code: "de", label: "Deutsch" },
            { code: "fr", label: "Français" },
          ].map((lang) => (
            <Button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              variant="outline"
              className={`px-4 py-3 h-auto rounded-lg border-2 text-sm font-medium transition-colors ${
                language === lang.code
                  ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              {lang.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
