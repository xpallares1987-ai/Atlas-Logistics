import { AtlasWorker, AtlasBpmnError } from '../../utils/worker-base.js';
import { AIS_UNAVAILABLE, VESSEL_NOT_FOUND } from '../../utils/error-codes.js';

interface CheckAisInput {
  vessel: string;
  imo?: string;
  mmsi?: string;
}

interface AisPosition {
  latitude: number;
  longitude: number;
  course: number;
  speed: number;
  timestamp: string;
  status: string;
}

interface CheckAisOutput {
  positionFound: boolean;
  position: AisPosition | null;
  predictedEta: string | null;
  distanceToPort: number | null;
}

/**
 * Fetches vessel AIS position data.
 * In production: connects to MarineTraffic, VesselFinder, or AIS provider.
 */
class CheckAisWorker extends AtlasWorker<CheckAisInput, CheckAisOutput> {
  readonly taskType = 'atlas.tracking.check-ais';

  async execute(job: any): Promise<CheckAisOutput> {
    const { vessel } = job.variables;

    console.log(`[CheckAIS] Querying position for vessel: ${vessel}`);

    // Simulate AIS API call
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 5% chance of AIS unavailability for realistic simulation
    if (Math.random() < 0.05) {
      throw new AtlasBpmnError(AIS_UNAVAILABLE, `AIS data temporarily unavailable for ${vessel}`);
    }

    // Generate realistic mock position
    const lat = 20 + Math.random() * 40;   // 20°N to 60°N
    const lon = -10 + Math.random() * 130; // -10°E to 120°E
    const speed = 12 + Math.random() * 8;  // 12-20 knots
    const course = Math.floor(Math.random() * 360);

    const position: AisPosition = {
      latitude: Math.round(lat * 10000) / 10000,
      longitude: Math.round(lon * 10000) / 10000,
      course,
      speed: Math.round(speed * 10) / 10,
      timestamp: new Date().toISOString(),
      status: 'UNDER_WAY',
    };

    const distanceNm = Math.floor(500 + Math.random() * 5000);
    const hoursToArrival = Math.round(distanceNm / speed);
    const eta = new Date();
    eta.setHours(eta.getHours() + hoursToArrival);

    console.log(`[CheckAIS] ${vessel}: ${position.latitude}°N, ${position.longitude}°E | Speed: ${position.speed}kn | ETA: ${eta.toISOString().split('T')[0]}`);

    return {
      positionFound: true,
      position,
      predictedEta: eta.toISOString(),
      distanceToPort: distanceNm,
    };
  }
}

export const checkAisWorker = new CheckAisWorker();
