import ClientDashboard from "./ClientDashboard";

/**
 * Dashboard Page (Server Component)
 * The dashboard is now fully client-driven via CSV/Excel ingestion.
 * No server-side XML fetching is performed.
 */
export default function DashboardPage() {
  return <ClientDashboard />;
}
