export type Language = "es" | "en";

export interface I18nConfig<T> {
  translations: Record<Language, T>;
  storageKey?: string;
  defaultLang?: Language;
}

export class I18nEngine<T> {
  private currentLang: Language;
  private translations: Record<Language, T>;
  private storageKey: string;

  constructor(config: I18nConfig<T>) {
    this.translations = config.translations;
    this.storageKey = config.storageKey || "app_lang";
    this.currentLang =
      (localStorage.getItem(this.storageKey) as Language) ||
      config.defaultLang ||
      "es";
  }

  get t(): T {
    return this.translations[this.currentLang];
  }

  get lang(): Language {
    return this.currentLang;
  }

  setLang(lang: Language) {
    this.currentLang = lang;
    localStorage.setItem(this.storageKey, lang);
    window.location.reload();
  }
}
