/**
 * @file public-routes.ts
 * @description Hardened public-route classification policy for the global Fastify onRequest authentication hook, preventing query-string, substring, and path-traversal authentication bypasses.
 * @module @atlas/api/middleware/public-routes
 * @see {@link docs/adr/0018-cross-tenant-security-and-jwt-rbac-contracts.md}
 */

// ============================================================================
// 1. PUBLIC ROUTE ALLOWLIST DEFINITIONS
// ============================================================================

const PUBLIC_EXACT_PATHS: ReadonlySet<string> = new Set([
  "/api/events",
  "/api/health",
  "/api/healthz",
  "/api/readyz",
  "/health",
  "/healthz",
  "/readyz",
  "/metrics",
  "/favicon.ico",
  "/favicon.png",
  "/api/tracking/webhook/ais",
]);

/**
 * Segment-bounded public path prefixes (matched as exact path or `<prefix>/...`).
 */
const PUBLIC_SEGMENT_PREFIXES: readonly string[] = [
  "/api/auth",
  "/api/edi/inbound",
  "/api/dcsa/v3/events",
  "/api/documents/verify",
  "/api/ai/config-status",
  "/api/ai/status",
  "/api/warehouse/ws",
  "/ws",
  "/docs",
];

/**
 * Confidential financial, document-vault, and customs export prefixes that must ALWAYS
 * require authenticated sessions (auth_session cookie or Bearer JWT), even when ending in
 * an export suffix like `/pdf` or `/xml`.
 */
const CONFIDENTIAL_EXPORT_PREFIXES: readonly string[] = [
  "/api/invoices/",
  "/api/agent-settlements/",
  "/api/documents/",
  "/api/scm/v1/",
  "/api/customs-declarations/",
];

const PUBLIC_TRACKING_LOOKUP_REGEX = /^\/api\/tracking\/([^/]+)$/i;

/**
 * Terminal document/export pathname suffixes allowed without session headers.
 * Evaluated strictly against the end of the normalized pathname (never query strings).
 */
const PUBLIC_EXPORT_SUFFIX_REGEX =
  /(?:\/pdf|-pdf|\/xml|-xml|\/csv|-csv|\/xfwb|\/fwb)$/i;

const SUSPICIOUS_ENCODING_REGEX = /(?:%2e|%5c|%00|\\)/i;

// ============================================================================
// 2. PATH NORMALIZATION & POLICY EVALUATION
// ============================================================================

/**
 * Extracts the raw pathname component before any `?` query string or `#` fragment.
 */
function stripQueryAndFragment(rawUrl: string): string {
  let end = rawUrl.length;
  const queryIndex = rawUrl.indexOf("?");
  if (queryIndex !== -1 && queryIndex < end) {
    end = queryIndex;
  }
  const hashIndex = rawUrl.indexOf("#");
  if (hashIndex !== -1 && hashIndex < end) {
    end = hashIndex;
  }
  return rawUrl.slice(0, end);
}

/**
 * Detects dot-segment traversal, encoded separators, backslashes, or null bytes.
 */
function hasTraversalOrSuspiciousEncoding(rawPath: string): boolean {
  if (
    rawPath.includes("..") ||
    rawPath.includes("\\") ||
    rawPath.includes("\0") ||
    SUSPICIOUS_ENCODING_REGEX.test(rawPath)
  ) {
    return true;
  }
  try {
    const decoded = decodeURIComponent(rawPath);
    if (
      decoded.includes("..") ||
      decoded.includes("\\") ||
      decoded.includes("\0")
    ) {
      return true;
    }
  } catch {
    return true;
  }
  return false;
}

/**
 * Normalizes a request URL to a clean pathname without query strings, fragments,
 * duplicate slashes, or trailing slashes (except root `/`).
 */
export function normalizeRequestPathname(rawUrl: string): string {
  const rawPath = stripQueryAndFragment(rawUrl || "/");
  let decoded = rawPath;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    decoded = rawPath;
  }
  const collapsed = decoded.replace(/\/{2,}/g, "/");
  if (collapsed.length > 1 && collapsed.endsWith("/")) {
    return collapsed.slice(0, -1);
  }
  return collapsed || "/";
}

/**
 * Determines whether a request URL matches an explicitly allowlisted public route.
 * Any traversal sequence or malformed percent-encoding immediately returns `false`.
 */
export function isPublicRoute(rawUrl: string): boolean {
  const rawPath = stripQueryAndFragment(rawUrl || "/");
  if (hasTraversalOrSuspiciousEncoding(rawPath)) {
    return false;
  }

  const pathname = normalizeRequestPathname(rawUrl);

  if (PUBLIC_EXACT_PATHS.has(pathname)) {
    return true;
  }

  for (const prefix of PUBLIC_SEGMENT_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return true;
    }
  }

  // Public single-segment cargo tracking reference lookup (/api/tracking/:ref),
  // excluding authenticated customer portal routes (/api/tracking/my-shipments)
  const trackingMatch = PUBLIC_TRACKING_LOOKUP_REGEX.exec(pathname);
  if (
    trackingMatch &&
    trackingMatch[1].toLowerCase() !== "my-shipments" &&
    trackingMatch[1].toLowerCase() !== "webhook"
  ) {
    return true;
  }

  const lowerPathname = pathname.toLowerCase();
  const isConfidentialExport = CONFIDENTIAL_EXPORT_PREFIXES.some((prefix) =>
    lowerPathname.startsWith(prefix),
  );
  if (!isConfidentialExport && PUBLIC_EXPORT_SUFFIX_REGEX.test(pathname)) {
    return true;
  }

  return false;
}

/**
 * Returns `true` when the global `onRequest` hook must invoke `authMiddleware`.
 */
export function requiresGlobalApiAuth(rawUrl: string): boolean {
  const rawPath = stripQueryAndFragment(rawUrl || "/");
  const pathname = normalizeRequestPathname(rawUrl);
  const lowerPathname = pathname.toLowerCase();
  const lowerRaw = rawPath.toLowerCase();
  const isProtectedPath =
    lowerPathname === "/api" ||
    lowerPathname.startsWith("/api/") ||
    lowerRaw.startsWith("/api/") ||
    lowerPathname === "/admin" ||
    lowerPathname.startsWith("/admin/") ||
    lowerRaw.startsWith("/admin/");

  if (!isProtectedPath) {
    return false;
  }

  return !isPublicRoute(rawUrl);
}
