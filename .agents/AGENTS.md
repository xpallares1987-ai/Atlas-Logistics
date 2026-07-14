<RULE[atlas_logistics_knowledge]>
# Atlas Logistics Project Guidelines & Knowledge

## Architecture & Tech Stack
- **Monorepo (Turborepo)** using `pnpm`.
- **Frontend App**: Located in `packages/frontend/`. This is the main host app built with Vite, React, React Router, and TailwindCSS.
- **Routing**: `packages/frontend/src/App.tsx` handles all the routing and the main layout (sidebar, top navbar). Modules are imported using `React.lazy()`.
- **Styling**: TailwindCSS with a focus on modern, premium aesthetics (slate/indigo/emerald/amber/rose color palettes, glassmorphism, rounded corners).
- **Icons**: Always use `lucide-react`.

## Expansion Modules (ERP Suite)
The platform is a comprehensive ERP for Freight Forwarders, containing the following modules:
- **Core Operations**: Dashboard, Rate Comparer, Dynamic Pricing, Globe Tracker, Sailing Schedules (`/schedules`), Booking & B/L (`/bookings`).
- **Finance & Compliance**: Invoicing & Settlement (`/invoices`), Customs Clearance (`/customs`).
- **Analytics**: Profitability, Carbon Tracker, Demurrage Alerts.
- **Operations Support**: Container Planner, LCL Engine, Warehouse 3D, Tasklist, Document Vault, AI Assistant.
- **External Views**: Customer Portal (`/portal`).

## Known Issues & Gotchas
- **React Versions**: Ensure the monorepo has unified React versions (currently `18.3.1`) across all packages to avoid `useState` null errors due to duplicate React instances.
- **GitHub Actions Cache**: The cache can grow very large (up to 10GB limit); periodically clear obsolete caches via GitHub UI or CLI if builds fail or get stuck.
- **Build Validation**: Always run `pnpm run build` from the monorepo root to test production builds. The frontend is built into `packages/frontend/dist`.
- **Package Manager**: Always use `pnpm` (v10+) for managing dependencies. When updating dependencies or adding new packages, run `pnpm install` from the root to ensure workspace hoisting.
- **GitHub CLI**: Because Antigravity runs in a sandbox with a dummy `$GITHUB_TOKEN`, always prefix `gh` commands with `$env:GITHUB_TOKEN=""; gh ...` to use the host machine's authentications.

</RULE[atlas_logistics_knowledge]>
