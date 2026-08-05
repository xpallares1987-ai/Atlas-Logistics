# 0005. Fastify WebSockets for Real-Time

- **Status**: Accepted
- **Deciders**: Tech Lead, Core Team
- **Date**: 2026-08-03

## Context and Problem Statement

Our real-time features (like Kanban board updates and background job progress) previously relied on Firebase. This introduced vendor lock-in, external dependencies, and additional cloud costs. We want a fully self-hosted solution for real-time communication that integrates well with our Node.js ecosystem and Zero-Cost Architecture.

## Decision Drivers

- Eliminate external cloud dependencies (e.g., Firebase) to achieve a self-hosted stack.
- Reduce vendor lock-in and cloud costs.
- High performance and seamless integration with our existing Node.js/Vite environment.

## Considered Options

1. **Firebase Realtime Database / Firestore**: Easy to use but incurs cloud costs and vendor lock-in.
2. **Socket.io**: Very popular, but slightly heavy and carries its own abstraction layer which can be overkill for simple PubSub.
3. **Fastify WebSockets (`@fastify/websocket`)**: Extremely fast, lightweight, and integrates perfectly with our backend workers and fastify instances.

## Decision Outcome

Chosen option: **Fastify WebSockets**, because it allows us to self-host our real-time infrastructure with minimal overhead. It aligns with our goal of a zero-cost local environment and completely removes the Firebase dependency.

### Consequences

- **Good**: No vendor lock-in. $0 cost for local real-time development. High performance.
- **Bad**: We have to manage WebSocket connection lifecycles, scaling (e.g., Redis PubSub for multiple instances), and reconnection logic ourselves instead of relying on a managed service.
