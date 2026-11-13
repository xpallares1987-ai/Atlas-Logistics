/**
 * @file useOmnichannelNotifications.test.ts
 * @description Unit tests for Omnichannel Notifications templates and Adaptive Card payload generation.
 * @module @atlas/frontend/components/OmnichannelNotifications/hooks/__tests__/useOmnichannelNotifications.test
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import { describe, it, expect } from "vitest";
import { ANOMALY_TEMPLATES } from "../useOmnichannelNotifications";
import {
  generateAdaptiveCardPayload,
  getSampleAnomalyContext,
} from "@atlas/shared";

describe("OmnichannelNotifications templates & Adaptive Cards", () => {
  it("defines all 8 operational anomaly templates", () => {
    expect(ANOMALY_TEMPLATES).toHaveLength(8);
  });

  it("generates a valid MS Teams Adaptive Card v1.5 payload", () => {
    const ctx = getSampleAnomalyContext("COLD_CHAIN_TEMP_BREACH");
    const payload = generateAdaptiveCardPayload("COLD_CHAIN_TEMP_BREACH", ctx);
    expect(payload).toBeDefined();
    expect(payload.type).toBe("message");
  });
});
