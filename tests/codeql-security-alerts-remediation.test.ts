/**
 * @file codeql-security-alerts-remediation.test.ts
 * @description Regression test suite verifying remediation of GitHub CodeQL alerts #104 (SSRF), #107 (Path Injection), and #108/#109 (Prototype Pollution).
 * @module @atlas/tests/codeql-security-alerts-remediation
 * @see {@link src/modules/notifications/notifications.routes.ts}
 * @see {@link src/services/documents/document-signer.service.ts}
 * @see {@link src/services/gemini.service.ts}
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  DocumentSignerService,
  type OfficialDocumentType,
} from "../src/services/documents/document-signer.service.js";
import { executeGeminiOnDemand } from "../src/services/gemini.service.js";

vi.mock("../src/middleware/auth.js", () => ({
  authMiddleware: vi.fn(async () => {}),
  requireRole: vi.fn(() => async () => {}),
}));

import app from "../src/app.js";

describe("CodeQL Security Alerts Remediation (#104, #107, #108, #109)", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("CodeQL #104 & #110: blocks SSRF targets, IP literals, HTTP downgrades, non-Teams hosts, and unregistered Teams URLs in POST /api/notifications/teams/dispatch", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200, ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const previousAllowlist = process.env.TEAMS_WEBHOOK_ALLOWLIST;
    const approvedUrl =
      "https://approved.webhook.office.com/workflows/atlas-alerts";
    process.env.TEAMS_WEBHOOK_ALLOWLIST = approvedUrl;

    try {
      const blockedUrls = [
        "http://169.254.169.254/latest/meta-data/",
        "https://127.0.0.1:8080/internal-hook",
        "http://outlook.office.com/webhook/insecure",
        "https://user:secret@outlook.office.com/webhook/creds",
        "https://evil.test/steal",
        "https://unregistered.webhook.office.com/workflows/not-in-allowlist",
      ];

      for (const targetWebhookUrl of blockedUrls) {
        fetchMock.mockClear();
        const res = await app.inject({
          method: "POST",
          url: "/api/notifications/teams/dispatch",
          payload: {
            anomalyType: "HAZMAT_VIOLATION",
            context: {
              gsid: "GS-2026-ALG-55012",
              severity: "CRITICAL",
            },
            targetWebhookUrl,
          },
        });

        expect(res.statusCode).toBe(400);
        expect(fetchMock).not.toHaveBeenCalled();
      }

      // Registered server-side URL must succeed and dispatch with redirect: "error"
      fetchMock.mockClear();
      const okRes = await app.inject({
        method: "POST",
        url: "/api/notifications/teams/dispatch",
        payload: {
          anomalyType: "HAZMAT_VIOLATION",
          context: {
            gsid: "GS-2026-ALG-55012",
            severity: "CRITICAL",
          },
          targetWebhookUrl: approvedUrl,
        },
      });
      expect(okRes.statusCode).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        approvedUrl,
        expect.objectContaining({ method: "POST", redirect: "error" }),
      );
    } finally {
      if (previousAllowlist === undefined) {
        delete process.env.TEAMS_WEBHOOK_ALLOWLIST;
      } else {
        process.env.TEAMS_WEBHOOK_ALLOWLIST = previousAllowlist;
      }
      vi.unstubAllGlobals();
    }
  });

  it("CodeQL #107: rejects non-allowlisted or traversal document types before touching filesystem storage", async () => {
    await expect(
      DocumentSignerService.emitDocument({
        type: "../../etc/passwd" as unknown as OfficialDocumentType,
        payloadData: {},
      }),
    ).rejects.toThrow("Unsupported document type");
  });

  it("CodeQL #108 & #109: prevents __proto__ and constructor prototype pollution in gemini.service quota tracking", async () => {
    const protoKeysBefore = Object.keys(Object.prototype);

    await executeGeminiOnDemand("Test prompt", {
      model: "__proto__" as unknown as "gemini-2.5-flash",
      bypassCache: true,
      fallbackText: "safe fallback",
    });

    await executeGeminiOnDemand("Test prompt 2", {
      model: "constructor" as unknown as "gemini-2.5-flash",
      bypassCache: true,
      fallbackText: "safe fallback 2",
    });

    expect(
      (Object.prototype as Record<string, unknown>).dailyResetDate,
    ).toBeUndefined();
    expect(
      (Object.prototype as Record<string, unknown>).dailyCounter,
    ).toBeUndefined();
    expect(Object.keys(Object.prototype)).toEqual(protoKeysBefore);
  });
});
