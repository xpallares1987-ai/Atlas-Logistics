import { qs } from "@/shared";

export type ToastType = "info" | "success" | "warning" | "error";

export interface ToastOptions {
  duration?: number;
  containerSelector?: string;
}

export const Toast = {
  show(message: string, type: ToastType = "info", options: ToastOptions = {}) {
    const { duration = 4000, containerSelector = "#toast-container" } = options;

    let container = qs(containerSelector);
    if (!container) {
      container = this.createContainer(containerSelector.replace("#", ""));
    }

    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Trigger reflow for animation
    void toast.offsetHeight;
    toast.classList.add("toast--visible");

    const removeToast = () => {
      toast.classList.remove("toast--visible");
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 400);
    };

    setTimeout(removeToast, duration);
  },

  createContainer(id: string) {
    const container = document.createElement("div");
    container.id = id;
    container.className = "toast-container";
    document.body.appendChild(container);
    return container;
  },
};

const HTMLElementClass =
  typeof HTMLElement !== "undefined" ? HTMLElement : (class {} as any);

class TorreToastElement extends HTMLElementClass {
  static get observedAttributes() {
    return ["message", "type", "duration"];
  }

  attributeChangedCallback(name: string, _oldVal: string, newVal: string) {
    if (name === "message" && newVal) {
      const type = (this.getAttribute("type") as ToastType) || "info";
      const duration = parseInt(this.getAttribute("duration") || "4000", 10);
      Toast.show(newVal, type, { duration });
      this.removeAttribute("message");
    }
  }
}

if (typeof window !== "undefined" && !customElements.get("torre-toast")) {
  // @ts-expect-error - Valid at runtime in browser
  customElements.define("torre-toast", TorreToastElement);
}
