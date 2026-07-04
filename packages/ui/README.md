# @xpallares1987-ai/control-tower-ui

> Shared logistics UI component library for the Control-Tower ecosystem.  
> Published to **GitHub Packages** npm registry.

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | React 19 |
| Build | Vite 8 + vite-plugin-dts |
| Language | TypeScript 6 |
| Styling | Tailwind CSS 4, clsx, tailwind-merge |
| Animation | Framer Motion |
| Charts | Recharts |
| Maps | Leaflet + leaflet.markercluster |
| Validation | Zod 4 |
| Auth | Firebase |
| Virtualization | @tanstack/react-virtual |
| Linting | oxlint |

---

## Installation

This package is published to the **GitHub Packages** npm registry. Consuming projects need a `.npmrc` file configured to resolve the `@xpallares1987-ai` scope:

```ini
# .npmrc
@xpallares1987-ai:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Then install the package:

```bash
pnpm add @xpallares1987-ai/control-tower-ui
```

> [!NOTE]
> The `GITHUB_TOKEN` needs `read:packages` scope. In GitHub Actions, use `secrets.GITHUB_TOKEN` which is automatically available.

---

## Available Components

### UI Primitives

| Component | Description |
|-----------|-------------|
| `Toast` | Notification toast system with stacking and auto-dismiss |
| `Modal` | Accessible modal dialog with imperative API (`ModalInstance`) |

### Logistics Components

| Component | Description |
|-----------|-------------|
| `ContainerPlanner` | Interactive container load planning tool with 3D visualization (~27 KB) |
| `DemurrageAlerts` | Demurrage & detention alert management with cost tracking (~20 KB) |
| `LogisticsDashboardLayout` | Shell layout for logistics dashboards with sidebar and header |
| `LogisticsOverlay` | Loading overlay / spinner for async operations |
| `LogisticsSankey` | Sankey flow diagrams for visualizing logistics flows (Recharts-based) |
| `LogisticsTable` | Data table with sorting, filtering, and pagination |
| `ShippingMap` | Leaflet-based shipping map with route visualization, marker clustering, and **Live AIS Engine** simulation |
| `VirtualLogisticsTable` | Virtualized table for large datasets (@tanstack/react-virtual) |

### Auth

| Export | Description |
|--------|-------------|
| `FirebaseProvider` | React context provider for Firebase app initialization |
| `useAuth` | Authentication hook for login/logout/session state |

### Shared Utilities (`shared/*`)

| Module | Description |
|--------|-------------|
| `crypto` | Hashing and encryption helpers |
| `cache-service` | Multi-layer caching (memory + IndexedDB) |
| `analysis-cache` | Specialized cache for analysis results |
| `broadcast-service` | Cross-tab communication via BroadcastChannel |
| `xml-utils` | XML parsing/building (sax + xml2js) |
| `i18n` | Internationalization utilities |
| `theme` | Theme management (light/dark) |
| `logistics-schemas` | Zod validation schemas for logistics domain types |
| `logistics` | Core logistics type helpers and constants |
| `dom` | DOM manipulation utilities |
| `db` | IndexedDB wrapper (Dexie) |
| `config` | Application configuration |
| `hooks` | Shared React hooks |
| `types` | TypeScript type definitions |
| `tokens.css` | CSS design tokens |

---

## Development

```bash
# Start dev server with HMR
pnpm dev

# Build the library (TypeScript compilation + Vite library build)
pnpm build

# Run the linter (oxlint)
pnpm lint

# Preview the built library
pnpm preview
```

The library is built in **ES module** format (`dist/index.es.js`) with auto-generated TypeScript declarations (`dist/index.d.ts`).

### External Dependencies

The following are marked as externals in the Vite config and must be provided by the consuming application:

`react`, `react-dom`, `lucide-react`, `recharts`, `leaflet`, `leaflet.markercluster`, `xml2js`, `sax`, `zod`, `dexie`, `framer-motion`, `clsx`, `tailwind-merge`, `@tanstack/react-virtual`, `next`, `idb`

---

## Publishing

The package is published to **GitHub Packages** under the `@xpallares1987-ai` scope:

```bash
# Bump version
npm version patch   # or minor / major

# Publish (uses publishConfig.registry from package.json)
npm publish
```

> [!IMPORTANT]
> Ensure you are authenticated with `npm login --registry=https://npm.pkg.github.com` before publishing.

---

## Architecture

This repository is a **standalone, publishable** package that bundles together components and utilities for external consumption.

### Relationship to `packages/ui` and `packages/shared`

Within the Control-Tower monorepo, the same components exist as **workspace packages**:

- **`packages/shared`** (`@torre/shared`) — Shared utilities, schemas, and services
- **`packages/ui`** (`@torre/ui`) — React components depending on `@torre/shared`

This repository (`Control-Tower-UI`) is the **published distribution** that combines both into a single installable package. It is consumed by the sub-projects (BPMN-Modeler, Freight-Comparer, Shipment-Dashboard) via a `file:` dependency:

```json
{
  "dependencies": {
    "@xpallares1987-ai/control-tower-ui": "file:../Control-Tower-UI"
  }
}
```

```
┌─────────────────────────────────────────────────┐
│  Control-Tower-UI (published to GitHub Packages) │
│  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ packages/ui  │  │ packages/shared (inlined) │ │
│  │ components   │→ │ utils, schemas, services  │ │
│  └──────────────┘  └──────────────────────────┘ │
└────────────────────────┬────────────────────────┘
                         │ consumed by
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
  BPMN-Modeler   Freight-Comparer  Shipment-Dashboard
```

---

## License

See [LICENSE](../LICENSE) in the root repository.
