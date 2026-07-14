# Atlas Logistics 🌍🚢

Atlas Logistics is a comprehensive **Super-App** for Supply Chain Management (SCM). It offers advanced tools for freight forwarders, shipping lines, and logistics operators, centralizing freight quotes, shipment management, and AI-powered predictive intelligence.

![Atlas Logistics Dashboard](https://img.shields.io/badge/Status-Active-success) ![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

## 🌟 Features and Modules (ERP SCM Suite)
Atlas Logistics features specialized modules to cover the complete lifecycle of an ocean shipment and the operation of a freight forwarder:

**📦 Core Operations**
- **Sailing Schedules**: Search engine for maritime routes and cut-off control.
- **Booking & B/L**: HBL issuance and Kanban board for bookings.
- **Rate Comparer**: Real-time freight analytics and comparison.

**⚖️ Finance and Compliance**
- **Customs Clearance**: DUA tracking, customs traffic light, and HS Code calculation.
- **Invoicing & Settlement**: A/R, A/P reconciliation, and profitability.

**🤝 External View (Client)**
- **Customer Portal**: "White-label" portal for end customers to track their cargo and download documents in real-time.

## 🏗️ Architecture and Technologies

The project operates as a **Monorepo (Turborepo)**, unifying multiple submodules under a single React Super-App (Vite).

### Core Stack
- **Frontend (Client App):** React, Vite, React Router, TailwindCSS (Dark Premium Glassmorphism).
- **Backend (API Service):** Node.js, Express, Drizzle ORM.
- **Database:** PostgreSQL (Google Cloud SQL for Production, local Postgres for Development).
- **Predictive Intelligence:** Google Gen AI (Gemini 2.5 Flash) for predictive ETA calculations and risks.
- **Package Management:** `pnpm` (v10+) and Turborepo for ultra-fast caches and efficient continuous integration.

## 📦 Monorepo Structure

```text
Atlas-Logistics/
├── packages/
│   ├── frontend/          # Host App Vite (Frontend Super-App)
│   ├── ui/                # Design system and reusable UI components
├── src/                   # Backend API (Express & Drizzle ORM)
├── Dockerfile             # Container definition for Frontend (Nginx)
├── Dockerfile.backend     # Container definition for Backend API (Node)
└── docker-compose.yml     # Local orchestration
```

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js >= 20
- `pnpm` version 10+
- [Docker & Docker Compose](https://docs.docker.com/get-docker/)

### Installation & Execution

We provide a complete containerized local environment mirroring production. See [README.Docker.md](README.Docker.md) for detailed instructions.

1. Clone the repository and install dependencies:
```bash
git clone https://github.com/xpallares1987-ai/Atlas-Logistics.git
cd Atlas-Logistics
pnpm install
```

2. Start the application locally using Docker:
```bash
docker compose up -d
```

3. Seed the database with realistic test data:
```bash
pnpm run db:push
npx tsx src/db/seed.ts
```

### E2E Testing
The ecosystem includes End-to-End tests integrated with Playwright.
```bash
npx playwright install --with-deps
pnpm run test:e2e
```

## 🌐 Continuous Integration and Deployments (CI/CD)

Atlas Logistics features a fully automated pipeline in **GitHub Actions**:
- **Multi-Container Architecture:** The repository maintains two distinct images: one for the Nginx Frontend and one for the Node.js Backend API.
- **Google Cloud Run (Production):** The application is designed to be deployed as stateless microservices on Google Cloud Run, seamlessly scaling to zero or thousands of instances, backed by Google Cloud SQL.

## 📖 Additional Documentation
- [SCM Vision (SCM_VISION.md)](SCM_VISION.md)
- [Contribution Guide](CONTRIBUTING.md)
- [Security Policies](SECURITY.md)

## 🤝 Support
If you have questions or encounter issues with Firebase connectors, please open an Issue or review the official Firebase Data Connect documentation.