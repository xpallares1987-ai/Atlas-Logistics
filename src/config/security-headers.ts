import { FastifyInstance } from "fastify";
import { logger } from "./logger.js";

/**
 * Security Headers Configuration
 * OWASP-recommended security headers for all responses
 */

export interface SecurityHeadersConfig {
  enableHSTS: boolean;
  enableCSP: boolean;
  enableXFrameOptions: boolean;
  enableXContentTypeOptions: boolean;
  enableReferrerPolicy: boolean;
  enablePermissionsPolicy: boolean;
}

/**
 * Register security headers middleware
 */
export function registerSecurityHeaders(
  app: FastifyInstance,
  isProduction: boolean,
): void {
  // HSTS: Force HTTPS for next 1 year
  app.addHook("onSend", async (request, reply) => {
    // Only send HSTS on HTTPS connections
    if (request.protocol === "https" || isProduction) {
      reply.header(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubdomains; preload",
      );
    }

    // X-Content-Type-Options: Prevent MIME type sniffing
    reply.header("X-Content-Type-Options", "nosniff");

    // X-Frame-Options: Clickjacking protection
    reply.header("X-Frame-Options", "DENY");

    // Referrer-Policy: Control referrer information
    reply.header("Referrer-Policy", "strict-origin-when-cross-origin");

    // X-XSS-Protection: XSS filter (legacy, for old browsers)
    reply.header("X-XSS-Protection", "1; mode=block");

    // Remove X-Powered-By header (don't leak tech stack)
    reply.header("X-Powered-By", "");

    // Permissions-Policy: Disable unused features
    reply.header(
      "Permissions-Policy",
      "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
    );
  });

  logger.info("Security headers middleware registered");
}

/**
 * HTTP to HTTPS redirect middleware (production only)
 */
export function enforceHTTPS(
  app: FastifyInstance,
  isProduction: boolean,
): void {
  if (!isProduction) {
    return; // Only enforce in production
  }

  if (process.env.ENFORCE_HTTPS === "false") {
    logger.warn("HTTPS enforcement disabled via ENFORCE_HTTPS=false");
    return;
  }

  app.addHook("onRequest", async (request, reply) => {
    // Check if connection is insecure
    if (request.protocol !== "https") {
      // Get the original hostname
      const hostname = request.headers.host || "example.com";

      // Build HTTPS URL
      const httpsUrl = `https://${hostname}${request.url}`;

      logger.warn(
        { originalUrl: request.url, redirectUrl: httpsUrl },
        "Redirecting HTTP to HTTPS",
      );

      // Permanent redirect (301 is better for SEO, but 308 preserves method)
      return reply.redirect(301, httpsUrl);
    }
  });

  logger.info(
    "HTTPS enforcement enabled - all HTTP traffic redirected to HTTPS",
  );
}

/**
 * Content Security Policy Configuration
 */
export function getCSPDirectives(
  isProduction: boolean,
): Record<string, string[]> {
  if (!isProduction) {
    return {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      childSrc: ["'none'"],
    };
  }

  // Strict CSP for production
  return {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'nonce-{random}'"],
    styleSrc: ["'self'", "'nonce-{random}'"],
    imgSrc: ["'self'", "data:", "https:"],
    fontSrc: ["'self'"],
    connectSrc: ["'self'"],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'none'"],
    childSrc: ["'none'"],
    upgradeInsecureRequests: [],
  };
}

/**
 * Security headers configuration summary
 */
export function logSecurityConfig(isProduction: boolean): void {
  const config = {
    HTTPS: isProduction ? "Required" : "Optional",
    HSTS: isProduction ? "Enabled (1 year)" : "Disabled",
    CSP: isProduction ? "Strict" : "Permissive",
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    Environment: process.env.NODE_ENV || "unknown",
  };

  logger.info({ config }, "Security headers configured");
}
