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

Atlas Logistics enforces automated security and static analysis controls in local pre-commit hooks and the CI/CD pipeline:

- **SLSA v1.0 Build Provenance Gate**: All container images published to GitHub Container Registry (`ghcr.io/xpallares1987-ai/atlas-*`) generate Sigstore Cosign build provenance attestations via GitHub OIDC (`actions/attest-build-provenance@v2`). Downstream deployments are blocked unless cryptographically verified via `gh attestation verify` against `--repo` and `--signer-workflow`.
- **Automated DDL Drift Detection (`audit:ddl-drift`)**: Every pull request and push to `main` verifies migration consistency (`drizzle-kit check`), schema drift parity between `src/db/schema/` and `drizzle/` snapshots, and replays all migrations on a fresh scratch database enforcing `PRAGMA integrity_check` and `PRAGMA foreign_key_check`.
- **njsscan SAST & SARIF Code Scanning**: Every pull request and push to `main` runs `njsscan` across `src/` and `packages/` and uploads SARIF results to GitHub Security.
- **Leak Prevention Guard (`audit:leaks`)**: Pre-commit and CI gates scan tracked and staged files to block sensitive identifiers, credentials, and confidential partner references.
- **Dependabot & `pnpm audit` Overrides**: Actively monitors and constrains transitive dependencies across all monorepo packages.
- **Strict ESLint & TypeScript Compilation**: TypeScript runs in strict mode (`tsc --noEmit`) across both the root backend (`src/`) and all workspace packages (`packages/*`).

---

## Container Image Provenance Verification

To verify the integrity and authentic origin of Atlas Logistics container images:

```bash
# Verify Frontend Container Image
gh attestation verify oci://ghcr.io/xpallares1987-ai/atlas-frontend:latest \
  --repo xpallares1987-ai/Atlas-Logistics \
  --signer-workflow xpallares1987-ai/Atlas-Logistics/.github/workflows/ci.yml

# Verify Backend API Container Image
gh attestation verify oci://ghcr.io/xpallares1987-ai/atlas-backend:latest \
  --repo xpallares1987-ai/Atlas-Logistics \
  --signer-workflow xpallares1987-ai/Atlas-Logistics/.github/workflows/ci.yml

# Verify Async Worker Container Image
gh attestation verify oci://ghcr.io/xpallares1987-ai/atlas-worker:latest \
  --repo xpallares1987-ai/Atlas-Logistics \
  --signer-workflow xpallares1987-ai/Atlas-Logistics/.github/workflows/ci.yml
```

---

## Vulnerability Reporting

If you discover a security vulnerability in Atlas Logistics:

1. **Do not report it in public GitHub issues**.
2. Please submit a private security advisory report via the [GitHub Security Advisory Reporting Form](https://github.com/xpallares1987-ai/Atlas-Logistics/security/advisories/new) or contact the lead architecture team directly at `onysablet1987@gmail.com`.
3. We acknowledge security reports within **24 hours** and aim to deploy verified patches within **48 hours**.

---

## Security Assurance Case & Threat Model

Atlas-Logistics provides this formal Security Assurance Case justifying why and how its security requirements and regulatory compliance standards are satisfied:

### 1. Threat Model & Assets at Risk
- **Assets Protected**:
  - Operational freight execution data (House & Master Bills of Lading, AWB tracking, container manifests).
  - Financial records (job costing accruals, freight invoices, carrier/agent clearing ledgers, credit notes).
  - Regulatory compliance filings (EU CBAM declarations, customs DUA/MRN filings, VGM weight certificates).
  - Authentication credentials and session tokens (JWT keys, user passwords, API integration secrets).
- **Adversary Capabilities & Threat Vectors**:
  - Malicious External Actors: Network MITM, automated brute-force attacks, XSS payload delivery, SQL injection attempts, and forged carrier webhook callbacks.
  - Compromised / Malicious Trading Partners: Forged shipment consignee reassignment, tampered container weights, or illicit invoice tampering.
  - Software Supply Chain Attackers: Malicious upstream npm dependencies or compromised build pipeline runners.

### 2. Identification of Trust Boundaries
- **Boundary A: Public Web / Client Browser $\rightarrow$ Fastify API Gateway**:
  - All incoming HTTP/WebSocket traffic is untrusted.
  - Strictly guarded by TLS 1.3/1.2, HSTS headers, `@fastify/rate-limit`, CORS policies, and mandatory JWT signature verification (`@fastify/jwt`).
- **Boundary B: API Gateway $\rightarrow$ Domain Services & Persistence Layer**:
  - All input payloads, parameters, and query strings undergo strict allowlist validation via TypeBox and Zod schemas (`additionalProperties: false`).
  - Direct SQL string interpolation is strictly prohibited; all database interaction executes through Drizzle ORM parameterized prepared statements.
- **Boundary C: External Carrier Webhooks & Third-Party APIs $\rightarrow$ Ingestion Pipeline**:
  - External status updates (IATA Cargo-XML, EDIFACT, ocean carrier tracking) are routed through asynchronous outbox staging queues, authenticated via HMAC signatures or mutual TLS.
- **Boundary D: CI/CD Build Environment $\rightarrow$ Artifact Deployment (GHCR / GitHub Pages)**:
  - Immutable production container images are cryptographically signed using GitHub OIDC and Sigstore Cosign (SLSA Level 2 build provenance attestations).

### 3. Application of Secure Design Principles
- **Least Privilege & Role-Based Access Control (RBAC)**: Route-level permissions strictly constrain operations by role (`ADMIN`, `OPERATIONS`, `EXECUTIVE`, `SALES`, `CUSTOMER`, `DRIVER`).
- **Defense-in-Depth**: Multi-layered controls combine network security headers (CSP, HSTS), runtime schema enforcement, transactional ACID locking on ledger updates, and immutable audit logging.
- **Fail-Safe Defaults & Complete Mediation**: Unauthenticated or unauthorized requests fail closed (`401 Unauthorized` / `403 Forbidden`). Every request must re-verify authentication and permissions on every transaction.
- **Zero-Trust Input Sanitization**: Domain algorithms enforce mathematical checksums (IATA Modulo-7, ISO 6346 Modulo-11) before committing operational records.

### 4. Countermeasures Against Common Implementation Weaknesses
- **Injection (CWE-89 / CWE-77)**: Parameterized queries in Drizzle ORM guarantee complete separation between SQL code and user data.
- **Cross-Site Scripting (CWE-79)**: Adherence to strict Zero-innerHTML and programmatic DOM construction (`element.textContent`) permanently severs taint-tracking flows in CodeQL AST analysis.
- **Sensitive Data Exposure & Timing Attacks (CWE-208 / CWE-312)**: Constant-time comparisons (`crypto.timingSafeEqual`) prevent timing side-channels; secrets are segregated into gitignored `.env.local` with pre-commit leak scanning.
- **Supply Chain Vulnerabilities**: Pinned dependency digests in `pnpm-lock.yaml`, Dependabot automated CVE monitoring, and automated SAST auditing via CodeQL and njsscan.

