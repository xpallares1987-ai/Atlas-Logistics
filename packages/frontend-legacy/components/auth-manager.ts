import { i18n } from '../core/i18n.js';
import { api } from '../core/api.js';

class AuthManager extends HTMLElement {
  private user: any = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  async connectedCallback() {
    await this.checkAuth();
    this.render();
  }

  private async checkAuth() {
    const token = localStorage.getItem('atlas_token');
    if (token) {
      try {
        this.user = await api.get('/auth/me');
      } catch (err) {
        localStorage.removeItem('atlas_token');
        this.user = null;
      }
    }
  }

  private async handleLogin(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const username = (form.elements.namedItem('username') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    try {
      const response = await api.post<{ token: string }>('/auth/login', { username, password });
      localStorage.setItem('atlas_token', response.token);
      await this.checkAuth();
      this.render();
      window.dispatchEvent(new CustomEvent('auth-changed', { detail: this.user }));
    } catch (err) {
      alert('Login failed: ' + (err as Error).message);
    }
  }

  private handleLogout() {
    localStorage.removeItem('atlas_token');
    this.user = null;
    this.render();
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: null }));
  }

  private render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: 'Inter', sans-serif;
        }
        .auth-container {
          padding: 1rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 1rem;
        }
        .login-form {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
        input {
          padding: 0.4rem;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          font-size: 0.9rem;
        }
        button {
          padding: 0.4rem 1rem;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }
        button:hover {
          background: #1d4ed8;
        }
        .user-info {
          font-size: 0.9rem;
          color: #475569;
        }
        .logout-btn {
          background: #ef4444;
        }
        .logout-btn:hover {
          background: #dc2626;
        }
      </style>
      <div class="auth-container">
        ${this.user ? `
          <span class="user-info">
            <strong>${this.user.username}</strong> (${this.user.role})
          </span>
          <button class="logout-btn" id="logoutBtn">Logout</button>
        ` : `
          <form class="login-form" id="loginForm">
            <input type="text" name="username" placeholder="Username" required autocomplete="username">
            <input type="password" name="password" placeholder="Password" required autocomplete="current-password">
            <button type="submit">Login</button>
          </form>
        `}
      </div>
    `;

    const loginForm = this.shadowRoot.querySelector('#loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    const logoutBtn = this.shadowRoot.querySelector('#logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }
  }
}

customElements.define('auth-manager', AuthManager);
