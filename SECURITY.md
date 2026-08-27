# Atlas Logistics Security Policy

We take the security and integrity of freight forwarding, customs declarations, financial settlements, and logistics data very seriously. Due to the mission-critical nature of international supply chain management, we enforce rigorous deterministic validation and zero-trust engineering standards.

## Supported Versions

Security updates and patches are actively applied to the latest stable release line.

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

---

## Critical Security Focus Areas

1. **Authentication & Role-Based Access Control (RBAC)**:
   - All REST API endpoints under `/api/*` are guarded by JWT validation (`@fastify/jwt`) and strict role permissions (`ADMIN`, `MANAGER`, `OPERATIONS`, `EXECUTIVE`, `SALES`, `CUSTOMER`, `DRIVER`).
   - Frontend route protection is enforced via `ProtectedRoute` and `RoleGate` components.

2. **Timing Attack & Cryptographic Randomness Mitigations**:
   - Sensitive string and token comparisons use constant-time operations (`crypto.timingSafeEqual`).
   - Pseudo-random number generation for identifiers and tokens uses cryptographically secure sources (`crypto.getRandomValues()` / `crypto.randomBytes()`) without modulo bias.

3. **Deterministic Business Logic & Regulatory Compliance**:
   - All customs valuation, tariff calculations (TARIC / DUA), IATA checksums (Modulo-7), Incoterms 2020 cost/risk transfers, ADR 1.1.3.6 points, and international convention statutory liability caps (Hague-Visby, Montreal 1999, CMR) are implemented using 100% deterministic mathematical algorithms.

4. **Document & Payload Sanitation**:
   - PDF generation (`PDFKit`) and XML exports (Cargo-XML, DUA XML) sanitize inputs to prevent injection and memory corruption vulnerabilities.
   - HTML rendering in client views uses DOMPurify for strict XSS prevention.

5. **Secrets & Credentials Management**:
   - No production secrets or credentials are hardcoded into the repository.
   - Environment variables are securely loaded via `.env.local` or container environment orchestration.

---

## Continuous Auditing & CI Code Scanning

Atlas Logistics mandatorily incorporates **GitHub Advanced Security** in the continuous integration pipeline:

- **CodeQL SAST Analysis**: Every pull request and push to `main` is scanned for security vulnerabilities, path traversal, injection vectors, and tainted data flows.
- **Dependabot**: Actively monitors all dependencies across all monorepo packages to ensure fast resolution of any CVEs.
- **Strict ESLint & TypeScript Compilation**: TypeScript runs in strict mode (`tsc --noEmit`) to prevent runtime type errors and null-pointer dereferences.

---

## Vulnerability Reporting

If you discover a security vulnerability in Atlas Logistics:

1. **Do not report it in public GitHub issues**.
2. Please submit a private security advisory on GitHub or notify the lead architecture team directly.
3. We acknowledge security reports within **24 hours** and aim to deploy verified patches within **48 hours**.
