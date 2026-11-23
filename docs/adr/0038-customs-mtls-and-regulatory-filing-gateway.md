# 0038. Sovereign Customs Authority Gateway & mTLS XML/SOAP Filing Engine

- **Status**: Accepted
- **Date**: 2026-11-23
- **Context**: Atlas Logistics Architecture, Regulatory Compliance, Customs Brokerage, Security & Interoperability Teams
- **Quadrant**: Explanation & Architectural Decisions (`docs/adr/`)
- **See Also**: [ADR 0004](0004-zero-cost-local-architecture.md), [ADR 0009](0009-sqlite-wal-mandatory-foreign-keys.md), [ADR 0010](0010-zero-mock-live-persistence-standard.md), [ADR 0011](0011-webcrypto-sat-efirma-and-mletr-blockchain.md), [ADR 0028](0028-customs-brokerage-dua-mrn-disbursements-and-cbam-compliance.md), [ADR 0037](0037-sqlite-wal-concurrency-and-monorepo-invariants.md)

---

## 1. Context & Problem Statement

Cross-border freight forwarding requires direct, sovereign electronic declarations to national customs authorities. Historically, [ADR 0028](0028-customs-brokerage-dua-mrn-disbursements-and-cbam-compliance.md) formalized the internal domain model for customs clearances, DUA/MRN lifecycles, and zero-markup disbursements (suplidos). However, live integration with national customs gateways—such as:
- **AEAT** (Agencia Tributaria - Spanish DUA & Import Control System),
- **German ATLAS** (Automatisiertes Tarif- und Lokales Zoll-Abwicklungs-System),
- **French DELTA** (Dédouanement en Ligne par Traitement Automatisé),
- **EU NCTS Phase 5** (New Computerised Transit System),
- **UK HMRC CDS** (Customs Declaration Service), and
- **US CBP ACE** (Automated Commercial Environment)—
imposes rigorous cryptographic and transport-layer requirements that cannot be satisfied by standard unauthenticated REST APIs.

Specifically, international customs administrations demand:
1. **Mutual TLS (mTLS) Authentication**: Both client and server must exchange and validate X.509 digital certificates at the TLS transport handshake.
2. **XML Digital Signatures (XMLDSig / XAdES)**: Outbound customs declaration payloads must be cryptographically signed using official corporate e-Certificates (PKCS#12 or hardware security modules / HSMs) with SHA-256 digests and canonicalized XML transforms (C14N).
3. **Dual-Gateway Protocols**: Legacy systems (AEAT, ATLAS) mandate SOAP 1.1/1.2 over HTTPS, while newer European and UK customs platforms (HMRC CDS, NCTS Phase 5) expose REST JSON/XML APIs.
4. **Immutable Transmission Ledger**: Every outbound XML/JSON payload, raw response, HTTP status, and cryptographic signature thumbprint must be recorded with exact timestamps for statutory audit trails (minimum 5-year retention under Union Customs Code Art. 51).

---

## 2. Decision Drivers

- **Zero Third-Party EDI Surcharges**: Eliminate reliance on expensive proprietary clearing VANs (Value-Added Networks) like Descartes or CargoWise customs brokers by establishing native, direct mTLS endpoints.
- **Hardware & Software PKI Abstraction**: Provide a unified certificate manager supporting local encrypted PKCS#12 keys (`.p12` / `.pfx`), software keystores, and external PKCS#11 / cloud KMS abstractions.
- **Atomic Transmission Ledger**: Persist all outbound filings and inbound CUSRES (Customs Response) messages in SQLite WAL with strict foreign keys to `customs_clearances`.
- **Zero Mocks Standard (`ADR 0010`)**: Direct schema persistence with typed Drizzle tables, TypeBox validation, and verifiable integration test harnesses.

---

## 3. Considered Options

### Option 1: Outsource Customs Gateway to Third-Party SaaS Brokering Networks
- *Pros*: Offloads mTLS maintenance and SOAP XML generation.
- *Cons*: Incurs ongoing SaaS fees per filing ($5–$25 per DUA/MRN); introduces external vendor lock-in; fails the $0.00 infrastructure mandate.

### Option 2: Native Dual-Gateway Engine with Drizzle Transmission Ledger (Chosen)
- *Pros*:
  - Completely sovereign and zero subscription cost.
  - Native Node.js `node:https` and WebCrypto / `node:crypto` support for mTLS client certificates, XML canonicalization, and SHA-256 signing.
  - Full auditability: Every submission retains its exact raw XML payload hash, certificate thumbprint, and routing channel response (`GREEN`, `ORANGE`, `RED`).
- *Cons*:
  - Requires maintaining XML/SOAP schema definitions for each targeted national customs authority.

---

## 4. Decision Outcome

Chosen Option: **Option 2**.

### Database Architecture (`src/db/schema/customs_filings.ts`)

Two core relational tables are added to the SQLite WAL schema:

1. `customs_pki_certificates`:
   Manages authorized digital certificates, validation dates, certificate authorities, and thumbprints per tenant and customs agency.
2. `customs_filing_transmissions`:
   Records every discrete transmission, message function (`ORIGINAL`, `AMENDMENT`, `CANCELLATION`), raw payload hashes, signature algorithms, MRN assignments, error codes, and channel routings.

### Transport and Signature Flow

```
┌────────────────────────┐      1. Synthesize XML/SOAP      ┌─────────────────────────┐
│ customsClearances Data │ ───────────────────────────────> │ Customs Payload Builder │
└────────────────────────┘                                  └─────────────────────────┘
                                                                         │
                                                            2. XMLDSig / C14N
                                                               SHA-256 Sign
                                                                         ▼
┌────────────────────────┐      4. SOAP / REST mTLS         ┌─────────────────────────┐
│ National Customs Auth  │ <─────────────────────────────── │ Sovereign mTLS Gateway  │
│ (AEAT / ATLAS / DELTA) │                                  │ (Client Certificate)    │
└────────────────────────┘                                  └─────────────────────────┘
            │
            │ 5. Synchronous CUSRES Ack or Webhook
            ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ customs_filing_transmissions (Ledger: Channel GREEN/ORANGE/RED, MRN, Audit Hashes)  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Consequences

### Positive
- **Complete Forwarder Independence**: Stations can clear cargo directly with national customs authorities without paying intermediary broker network fees.
- **Cryptographic Non-Repudiation**: Every customs filing is provably signed and verifiable against the official declarant certificate.
- **Multi-Jurisdiction Flexibility**: Easily extensible to UK HMRC CDS, US CBP ACE, and EU NCTS Phase 5.

### Negative / Trade-offs
- Forwarding stations must securely provision their national tax/customs digital certificates into the keystore with strict file-system permissions.
