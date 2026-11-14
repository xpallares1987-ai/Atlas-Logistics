# How-To Guide: Verifying Container Image Provenance (SLSA v1.0)

**Module:** `@atlas/security/supply-chain`  
**Standard:** SLSA (Supply-chain Levels for Software Artifacts) v1.0  
**Registry:** GitHub Container Registry (`ghcr.io`)  
**Target Images:** `atlas-frontend`, `atlas-backend`, `atlas-worker`  

---

## 1. Overview

Atlas-Logistics container images published to GitHub Container Registry (GHCR) include cryptographically signed build provenance attestations generated via GitHub Actions and Sigstore Cosign.

Each attestation cryptographically binds:
- The immutable container image digest (`sha256:...`).
- The canonical GitHub repository (`xpallares1987-ai/Atlas-Logistics`).
- The exact git commit SHA and ref (`refs/heads/main` or `refs/tags/v*`).
- The workflow execution definition (`.github/workflows/ci.yml` or `.github/workflows/docker-build.yml`).
- The trusted OIDC issuer (`https://token.actions.githubusercontent.com`).

---

## 2. Prerequisites

To verify container provenance attestations on any workstation:
1. Install the [GitHub CLI (`gh`)](https://cli.github.com/) (version 2.49.0 or later).
2. Authenticate with GitHub CLI:
   ```bash
   gh auth login
   ```
3. Docker or Podman (optional, if pulling images locally).

---

## 3. Verification Commands

### 3.1. Verifying Latest Production Images from GHCR

Run `gh attestation verify` specifying the OCI image URL and the authorized repository:

#### Frontend Container Image
```bash
gh attestation verify oci://ghcr.io/xpallares1987-ai/atlas-frontend:latest \
  --owner xpallares1987-ai
```

#### Backend API Container Image
```bash
gh attestation verify oci://ghcr.io/xpallares1987-ai/atlas-backend:latest \
  --owner xpallares1987-ai
```

#### Async Worker Container Image
```bash
gh attestation verify oci://ghcr.io/xpallares1987-ai/atlas-worker:latest \
  --owner xpallares1987-ai
```

---

## 4. Expected Output & Verification Criteria

A successful verification output displays the cryptographic signing certificate and SLSA statement:

```text
Loaded digest sha256:d8a2... for oci://ghcr.io/xpallares1987-ai/atlas-frontend:latest
Loaded 1 attestation from GitHub
✓ Verification succeeded!

[Attestation summary]
Repository: xpallares1987-ai/Atlas-Logistics
Workflow:   .github/workflows/ci.yml
Commit:     1a30b1b (or current release commit)
Signer:     GitHub Actions (OIDC)
```

If the image was modified, tampered with, or built by an unauthorized repository, `gh attestation verify` fails with an explicit exit code and error.

---

## 5. Automated CI/CD Enforcement

Provenance generation is automated within:
- [ci.yml](file:///C:/Users/xpall/Source/Atlas-Logistics/.github/workflows/ci.yml): Generates attestations for images built on pushes to `main`.
- [docker-build.yml](file:///C:/Users/xpall/Source/Atlas-Logistics/.github/workflows/docker-build.yml): Generates attestations for tagged production releases (`v*`).
