# 0003: Unified Single Sign-On using Firebase

- **Status**: Accepted
- **Deciders**: AI Assistant, xpall
- **Date**: 2026-06-28

## Context and Problem Statement

As the `Control-Tower` ecosystem expands with multiple independent applications (`BPMN-Modeler`, `Freight-Comparer`, `Shipment-Dashboard`, `Atlas-Logistics`), users were required to manage separate authentication contexts or lacked access control entirely in some tools (e.g., `BPMN-Modeler`). We needed a centralized, scalable, and secure Single Sign-On (SSO) mechanism across the entire suite.

## Decision Drivers

- Consistent user experience across all Control-Tower applications.
- Centralized identity management.
- Reusability of UI components (e.g., `<AuthProvider>`) from the `@xpallares1987-ai/control-tower-ui` shared package.
- High security and ease of implementation.

## Considered Options

1. **Custom JWT Auth Server**: Building our own authentication microservice.
2. **Auth0 or Okta**: Third-party SSO providers.
3. **Firebase Authentication**: Leveraging Google Cloud Firebase for seamless integration and built-in SSO capabilities (Email/Password, Google OAuth).

## Decision Outcome

Chosen option: **Firebase Authentication**, because it provides an out-of-the-box, secure, and highly scalable authentication system that integrates perfectly with our existing React and Vite architecture. We injected a centralized `<AuthProvider>` component from our internal UI library to act as an `AuthGuard` over all applications, standardizing the login modal and session persistence across the suite.

### Consequences

- **Good**: Users log in once and can traverse the ecosystem using the same credentials. Secure session handling is abstracted away from individual apps. The login UI is 100% consistent.
- **Bad**: Adds a dependency on Firebase and React (even in previously vanilla JS applications like `BPMN-Modeler`, which now requires a React DOM root specifically for the authentication overlay).
