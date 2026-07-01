
import { trackingService } from '@/services/trackingService';
import { TrackingMilestone, ContainerTracking, MilestoneType } from '@/types/schema';

export async function fetchMilestones(shipmentId: string): Promise<TrackingMilestone[]> {
  return await trackingService.getMilestonesForShipment(shipmentId);
}

export async function fetchContainers(shipmentId: string): Promise<ContainerTracking[]> {
  return await trackingService.getContainersForShipment(shipmentId);
}

export async function createMilestone(shipmentId: string, type: MilestoneType, location: string, date: string, description: string): Promise<TrackingMilestone> {
  return await trackingService.addMilestone(shipmentId, type, location, date, description);
}
