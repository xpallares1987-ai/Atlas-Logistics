import { i18n } from '../core/i18n.js';

class LanguageSwitcher extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.setupListeners();
  }

  private setupListeners() {
    if (!this.shadowRoot) return;
    const select = this.shadowRoot.querySelector('select');
    select?.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      i18n.setLanguage(target.value as 'en' | 'es');
    });
  }

  render() {
    if (!this.shadowRoot) return;
    const currentLang = i18n.getLanguage();
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
        }
        select {
          padding: 0.5rem 2rem 0.5rem 1rem;
          border-radius: 6px;
          border: 1px solid #d1d5db;
          background-color: #f9fafb;
          color: #374151;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23374151%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
          background-repeat: no-repeat;
          background-position: right 0.7rem top 50%;
          background-size: 0.65rem auto;
        }
        select:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
      </style>
      <select aria-label="Language Selector">
        <option value="en" ${currentLang === 'en' ? 'selected' : ''}>English</option>
        <option value="es" ${currentLang === 'es' ? 'selected' : ''}>Español</option>
      </select>
    `;
  }
}

customElements.define('language-switcher', LanguageSwitcher);