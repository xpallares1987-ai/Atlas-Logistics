import { GlobeTracker } from '@atlas/ui/src/components/GlobeTracker';

export default function GlobeTrackerModule() {
  return (
    <div className="w-full h-full bg-slate-950 overflow-hidden relative">
      <GlobeTracker markers={[{lat: 34.0522, lng: -118.2437, name: 'LAX'}]} />
    </div>
  );
}
