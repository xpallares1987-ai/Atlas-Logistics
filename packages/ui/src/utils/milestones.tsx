
import { CheckCircle2, Truck, Ship, Package } from 'lucide-react';
import { StepperMilestone } from '../MilestoneStepper';

// Helper to quickly generate a standard ocean freight milestone template
export function getStandardOceanMilestones(pol: string, pod: string, eta: string): StepperMilestone[] {
  return [
    { id: 'm1', title: 'Empty P/U', location: 'Depot', date: null, status: 'pending', icon: <Truck size={16} /> },
    { id: 'm2', title: 'Gate-In', location: pol, date: null, status: 'pending', icon: <Package size={16} /> },
    { id: 'm3', title: 'Vessel Departed', location: pol, date: null, status: 'pending', icon: <Ship size={16} /> },
    { id: 'm4', title: 'Arrived at POD', location: pod, date: eta, status: 'pending', icon: <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg> },
    { id: 'm5', title: 'Delivered', location: 'Consignee', date: null, status: 'pending', icon: <CheckCircle2 size={16} /> },
  ];
}
