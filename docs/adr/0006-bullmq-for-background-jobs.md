# 0006. BullMQ for Background Jobs

- **Status**: Accepted
- **Deciders**: Tech Lead, Core Team
- **Date**: 2026-08-03

## Context and Problem Statement

The application requires heavy asynchronous processing for tasks like PDF generation, rate comparisons, and complex logistics workflows. Previously, these were either handled synchronously (blocking the main thread) or via external managed services like Google Cloud Tasks, which added cloud dependencies and complexity to local development.

## Decision Drivers

- Decouple heavy workflows from the main Node.js event loop.
- Support robust retry mechanisms, rate limiting, and delayed jobs.
- Keep the technology stack self-hosted for a zero-cost local development environment.

## Considered Options

1. **Google Cloud Tasks / AWS SQS**: Robust and managed, but requires internet access, cloud authentication, and incurs costs. Harder to mock locally.
2. **In-memory queues**: Simple to implement but lacks persistence, meaning jobs are lost if the server restarts. No built-in retry or delay features.
3. **BullMQ + Redis (ioredis)**: Industry standard for Node.js. Provides persistence, retries, cron jobs, and rate limiting. Runs entirely locally via a Redis instance or mock.

## Decision Outcome

Chosen option: **BullMQ + Redis**, because it provides enterprise-grade queueing features while allowing us to keep our stack fully self-hosted. It integrates well with our AtlasEngine Workers.

### Consequences

- **Good**: Reliable asynchronous processing. Full control over job queues (retries, delays, rate limiting). Easy to run locally for a zero-cost architecture.
- **Bad**: Introduces Redis as a new infrastructural dependency that must be managed and monitored in production.
