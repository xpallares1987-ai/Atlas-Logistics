# 0013. Google Gemini AI On-Demand Gateway (Free Tier) and Environment Variable Unification

- **Status**: Accepted
- **Date**: 2026-11-06
- **Context**: Atlas Logistics (Fastify + SQLite/Drizzle + React/Vite)
- **Quadrant**: Explanation & Architectural Decisions (`docs/adr/`)

## Context & Problem Statement

1. **Zero-Cost AI Integration (Google AI Studio Free Tier)**:
   The platform requires advanced maritime-legal analysis capabilities (FMC 46 CFR Part 541, ICC UCP 600, DCSA v3.0, CTU/IMDG Code, HS/CBAM classification, and semantic protocol search) using a free Google AI Studio API key, while guaranteeing zero recurring costs and preventing `429 Too Many Requests` quota exhaustion.
2. **Proliferation of Obsolete `.env*` Files**:
   Multiple conflicting configuration files (`.env`, `.env.example`, `.env.local.example`, `.env.production.example`, `.env.saas.example`, `.env.production`, and copies in test backups) accumulated deprecated variables from PostgreSQL, Firebase Data Connect, and Camunda 8 SaaS, causing port collisions and divergent database paths.

## Architectural Decisions

### 1. Centralized Multi-Model On-Demand Gateway (`src/services/geminiService.ts`)
- **Strictly On-Demand Invocation (`1 Click = 1 Request`)**: Automated background polling, lifecycle trigger hooks, or page-load AI queries are strictly prohibited.
- **Independent Quota Pools by Model**:
  - `gemini-2.5-flash` (auto-resolving to `gemini-3.8-flash` on updated accounts): Dedicated to FMC 541 legal drafting, UCP 600 bank pre-audit, multimodal OCR extraction, and executive summaries (**12 RPM / 1,400 RPD**).
  - `gemini-2.5-flash-lite` (auto-resolving to `gemini-3.5-flash-lite`): Dedicated to fast 3D CTU/IMDG stowage audits and DCSA/HS/CBAM tariff classification (**15 RPM / 1,400 RPD**).
  - `text-embedding-004` (auto-resolving to `gemini-embedding-001`): Dedicated to semantic similarity lookups across operational standard operating procedures (**100 RPM / 5,000 RPD**).
- **Structured JSON Outputs (`responseMimeType: "application/json"`)**: Reduces output token consumption by 40–60% and guarantees strict TypeScript contracts for React consumers.
- **Dual-Layer Caching (L1 + L2) and Test Sandbox**:
  - **L1 In-Memory Cache (`NodeCache`, TTL 30–60 min)**: Prevents redundant roundtrips within the same operator session.
  - **L2 SQLite Relational Persistence (`metadata` JSON column)**: Directly persists generated legal opinions and audit summaries into target entities (`demurrage_invoices`, `ocean_booking_details`, `container_stowage_plans`).
  - **Test Sandbox Isolation (`vitest`)**: During automated testing (`process.env.VITEST`), the gateway automatically routes queries to deterministic offline mock analyzers without consuming real developer API quota.

### 2. Two-File `.env` Standard in Root
- Redundant and obsolete `.env*` copies are removed, preserving only:
  1. **`.env.example`** *(Tracked in Git)*: Single canonical template aligned with SQLite (`file:./data/dev.db`), Fastify (`3001`), Vite (`5173`), and Google AI Studio (`GEMINI_API_KEY`).
  2. **`.env.local`** *(Ignored in Git)*: Active local environment configuration for developers.

## Consequences

- **Positive**: Token overhead minimized, zero unintended background API consumption, permanent SQLite retention of generated AI evaluations, and full elimination of conflicting environment configurations.
- **Mitigations**: If the API key is missing or a minute rate limit is reached, all endpoints return deterministic rule-based evaluations calculated directly over live SQLite records (`source: "deterministic-fallback"`).
