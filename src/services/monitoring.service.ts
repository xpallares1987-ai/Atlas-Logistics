import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

export const monitoringService = {
  init() {
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        integrations: [nodeProfilingIntegration()],
        // Tracing
        tracesSampleRate: 1.0, //  Capture 100% of the transactions
        // Set sampling rate for profiling - this is relative to tracesSampleRate
        profilesSampleRate: 1.0,
      });
      console.log("[Monitoring] Sentry initialized");
    } else {
      console.log(
        "[Monitoring] Sentry DSN not provided. Running in fallback/mock mode.",
      );
    }
  },

  captureException(error: Error, context?: Record<string, any>) {
    console.error(
      `[Monitoring] Exception captured: ${error.message}`,
      context || "",
    );
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error, { extra: context });
    }
  },

  captureMessage(
    message: string,
    level: "info" | "warning" | "error" | "fatal" = "info",
  ) {
    console.log(`[Monitoring - ${level.toUpperCase()}] ${message}`);
    if (process.env.SENTRY_DSN) {
      Sentry.captureMessage(message, level as any);
    }
  },

  setUser(user: { id: string; email?: string; username?: string } | null) {
    if (user) {
      console.log(`[Monitoring] User context set: ${user.id}`);
      if (process.env.SENTRY_DSN) {
        Sentry.setUser(user);
      }
    } else {
      console.log("[Monitoring] User context cleared");
      if (process.env.SENTRY_DSN) {
        Sentry.setUser(null);
      }
    }
  },
};
