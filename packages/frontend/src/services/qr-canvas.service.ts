/**
 * @file qr-canvas.service.ts
 * @description Native client-side QR code generation service using QRCode library for Canvas, Data URL, and PDF embedding.
 * @module @atlas/frontend/services/qr-canvas
 */

import QRCode from "qrcode";

export class QrCanvasService {
  /**
   * Generates a high-resolution PNG data URL for a given URL/digest.
   */
  public static async generateDataUrl(
    text: string,
    options?: QRCode.QRCodeToDataURLOptions,
  ): Promise<string> {
    const defaultOptions: QRCode.QRCodeToDataURLOptions = {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 256,
      color: {
        dark: "#0f172a", // slate-900
        light: "#ffffff",
      },
      ...options,
    };

    return await QRCode.toDataURL(text, defaultOptions);
  }

  /**
   * Renders the QR code directly onto an existing HTMLCanvasElement.
   */
  public static async renderToCanvas(
    canvas: HTMLCanvasElement,
    text: string,
    options?: QRCode.QRCodeRenderersOptions,
  ): Promise<void> {
    const defaultOptions: QRCode.QRCodeRenderersOptions = {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 192,
      color: {
        dark: "#10b981", // emerald-500
        light: "#020617", // slate-950
      },
      ...options,
    };

    await QRCode.toCanvas(canvas, text, defaultOptions);
  }
}
