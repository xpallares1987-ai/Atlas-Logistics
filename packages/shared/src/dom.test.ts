import { describe, expect, it } from "vitest";
import { ensureElement, escapeHTML, hexToRgbA, safeTrim } from "./dom";

describe("dom utilities", () => {
  it("should escape HTML characters correctly", () => {
    const input = '<script>alert("xss")</script>';
    const expected = "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;";
    expect(escapeHTML(input)).toBe(expected);
  });

  it("should handle safeTrim with valid and invalid input", () => {
    expect(safeTrim("  hello  ", "fallback")).toBe("hello");
    expect(safeTrim("", "fallback")).toBe("fallback");
    expect(safeTrim(null, "fallback")).toBe("fallback");
  });

  it("should ensure element is provided", () => {
    const el = document.createElement("div");
    expect(ensureElement(el)).toBe(el);
    expect(() => ensureElement(null)).toThrow("No valid element provided");
  });

  it("should convert hex to rgba correctly", () => {
    expect(hexToRgbA("#ffffff", 1)).toBe("rgba(255,255,255,1)");
    expect(hexToRgbA("#000", 0.5)).toBe("rgba(0,0,0,0.5)");
  });
});
