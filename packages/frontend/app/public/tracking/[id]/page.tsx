import TrackingClient from "./TrackingClient";

export function generateStaticParams() {
  return [{ id: 'demo' }];
}

export default function Page() {
  return <TrackingClient />;
}
