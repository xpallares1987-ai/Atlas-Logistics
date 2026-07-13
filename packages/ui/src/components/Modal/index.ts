export interface ModalOptions {
  title?: string;
  id?: string;
  onClose?: () => void;
  maxWidth?: string;
}

export const Modal = {
  create(content: string | HTMLElement, options: ModalOptions = {}) {
    const {
      title = "",
      id = "shared-modal",
      onClose,
      maxWidth = "600px",
    } = options;

    // Remove existing if any
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const modalOverlay = document.createElement("div");
    modalOverlay.id = id;
    modalOverlay.className = "modal-overlay";
    modalOverlay.style.display = "flex";

    // Create structure using safe methods
    const modalContent = document.createElement("div");
    modalContent.className = "modal-content ff-card";
    modalContent.style.maxWidth = maxWidth;
    modalContent.style.width = "100%";

    const modalHeader = document.createElement("div");
    modalHeader.className = "modal-header";

    const modalTitle = document.createElement("h2");
    modalTitle.className = "modal-title";
    modalTitle.textContent = title;

    const closeBtn = document.createElement("button");
    closeBtn.className = "modal-close-btn";
    closeBtn.setAttribute("aria-label", "Cerrar");
    closeBtn.innerHTML = "&times;"; // Entity is safe here

    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeBtn);

    const modalBody = document.createElement("div");
    modalBody.className = "modal-body";

    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalOverlay.appendChild(modalContent);

    if (typeof content === "string") {
      // If we must support string HTML, we should ideally sanitize it.
      // For now, if it's a string, we use innerHTML but warn/document it's for trusted content.
      modalBody.innerHTML = content;
    } else {
      modalBody.appendChild(content);
    }

    document.body.appendChild(modalOverlay);
    document.body.style.overflow = "hidden";

    const close = () => {
      modalOverlay.remove();
      document.body.style.overflow = "auto";
      if (onClose) onClose();
    };

    modalOverlay
      .querySelector(".modal-close-btn")
      ?.addEventListener("click", close);
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) close();
    });

    return {
      close,
      element: modalOverlay,
    };
  },
};

export interface ModalInstance {
  close: () => void;
  element: HTMLElement;
}

const HTMLElementClass =
  typeof HTMLElement !== "undefined" ? HTMLElement : (class {} as any);

class TorreModalElement extends HTMLElementClass {
  private modalInstance: { close: () => void } | null = null;

  connectedCallback() {
    const title = this.getAttribute("title") || "";
    const maxWidth = this.getAttribute("max-width") || "600px";

    const bodyContainer = document.createElement("div");
    while (this.firstChild) {
      bodyContainer.appendChild(this.firstChild);
    }

    this.modalInstance = Modal.create(bodyContainer, {
      title,
      maxWidth,
      onClose: () => {
        this.dispatchEvent(new CustomEvent("close"));
        this.remove();
      },
    });
  }

  disconnectedCallback() {
    if (this.modalInstance) {
      this.modalInstance.close();
      this.modalInstance = null;
    }
  }
}

if (typeof window !== "undefined" && !customElements.get("torre-modal")) {
  // @ts-expect-error - TODO: fix type
  customElements.define("torre-modal", TorreModalElement);
}
