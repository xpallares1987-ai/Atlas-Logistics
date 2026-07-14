# Atlas Logistics Security Policy

We take the security of logistics and customs information transiting through Atlas Logistics very seriously. Due to the critical nature of Supply Chain Management software, we enforce strict policies.

## Supported Versions

Currently, we only apply security patches to the latest stable versions.

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

## Vulnerability Reporting

If you discover a vulnerability in this project, **PLEASE DO NOT report it via public Issues**. Logistics information and connectors to GCP/Camunda are confidential.

Please send an email to the architecture team. We will acknowledge receipt within 24 hours and issue a patch (Hotfix) for critical vulnerabilities in less than 48 hours.

### Critical Areas of Focus
- **GCP and Firebase Secrets:** Automated deployments (CI/CD) use **Google Cloud Workload Identity Federation (WIF)**, eliminating the need for static service keys. Any attempt to inject or exfiltrate private keys or traditional *Service Accounts* is considered critical. Public API keys are restricted by domain.
- **Code-Level Vulnerabilities (Timing Attacks and Randomness):** The repository uses `timingSafeEqual` for sensitive comparisons and `crypto.getRandomValues()` strictly (without modulo bias) to prevent prediction or timing analysis vulnerabilities.
- **Firebase Data Connect and RBAC:** Privilege escalation through failures in GraphQL schema `@auth` directives. Ensure that sensitive operations always use `@auth(level: USER)` or more advanced role controls based on **Custom Claims** injected by the `assignUserRole` function.
- **XSS Vulnerabilities and Dependencies:** Any vector that allows injecting scripts into the frontend and can steal Firebase session tokens. Risky dependencies have been removed (e.g., migrations towards robust libraries like `exceljs`).
- **Prompt Injection in AI (AI Layer)::** Intentional manipulation of Google Gemini models (e.g., `chatWithData`) through user inputs that could result in database schema leakage, code injections in `code_execution`, or PII exfiltration.

## Continuous Auditing and Code Scanning

Atlas Logistics mandatorily employs **GitHub Advanced Security** in continuous integration:
- **CodeQL & njsscan:** Every Pull Request is statically analyzed (SAST) looking for logical, memory, or secret exposure vulnerabilities. Code integration (merge) is not allowed with pending CodeQL alerts.
- **Dependabot:** Actively monitors the dependency tree (`pnpm`) to enforce updates of libraries with detected CVEs.

We encourage security researchers to audit deployments, provided it is done responsibly and in local or *sandbox* environments.