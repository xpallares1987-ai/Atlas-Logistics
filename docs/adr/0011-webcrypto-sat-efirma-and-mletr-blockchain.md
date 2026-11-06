# 0011 WebCrypto SAT e-Firma Hub and MLETR Decentralized Ledger Architecture

- **Status**: Accepted
- **Deciders**: Engineering Team & AI Architecture Reviewer
- **Date**: 2026-11-05

## Context and Problem Statement

Atlas-Logistics required advanced digital trust mechanisms for international trade:
1. **Mexican SAT CFDI 4.0 & Carta Porte 3.1 Compliance**: Requiring cryptographic signing with taxpayer private keys (`.key` and `.cer`), SHA-256 digital seals (*Sello Digital del SAT*), and RFC 3161 timestamps without leaking private keys to backend servers.
2. **UNCITRAL MLETR Electronic Bills of Lading (e-BL)**: Requiring an immutable endorsement chain to prove title transfer of ocean bills of lading without reliance on expensive third-party proprietary networks.

## Decision Drivers

- **Zero Trust Private Key Security**: Taxpayer private keys must never touch server disk or network cables; cryptographic signing must occur entirely client-side in the operator's browser.
- **Standards Conformance**: Compliance with SAT Anexo 20 CFDI 4.0, Carta Porte 3.1, and UNCITRAL Model Law on Electronic Transferable Records (MLETR).
- **Embedded Immutability**: Cryptographic hash chaining (SHA-256 block ledger) without cloud gas fees or external cryptocurrency dependencies.

## Decision Outcome

1. **Browser-Native WebCrypto Signing**: Implemented SAT e.Firma PKI parsing and RSA-SHA256 signature generation entirely in the browser using the Web Cryptography API (`window.crypto.subtle`).
2. **Deterministic SAT Digestion**: Implemented canonical pipeline (*Cadena Original*) extraction directly in Fastify and React.
3. **Local DLT / Blockchain Ledger**: Created `blockchain_blocks` and `smart_escrow_contracts` tables in SQLite storing block indices, previous hashes, current SHA-256 hashes, timestamps, and e-BL title endorsement history.
4. **Independent Cryptographic Audit**: Implemented `/api/smart-contracts/verify-chain` verifying SHA-256 hash chains across blocks to guarantee tamper evidence.

### Consequences

- **Good**: Private keys remain 100% secure in operator RAM; zero risk of server-side key compromise.
- **Good**: Legally admissible e-BL title transfer records compliant with UNCITRAL MLETR.
- **Good**: No gas fees, external blockchain networks, or third-party signing service dependencies.
- **Bad**: Large cryptographic operations in low-spec browser clients require Web Workers to avoid UI thread jitter.
