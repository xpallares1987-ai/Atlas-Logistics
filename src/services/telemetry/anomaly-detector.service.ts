export interface AssetProfile {
  id: string;
  assetCode: string;
  name: string;
  cargoCategory: string;
  minTempCelsius?: number | null;
  maxTempCelsius?: number | null;
}

export interface ReadingData {
  temperatureCelsius?: number | null;
  humidityPct?: number | null;
  shockGForce: number;
  doorOpen: boolean;
  sealTampered: boolean;
  batteryPct: number;
  speedKnots: number;
}

export interface DetectedAlert {
  severity: "INFO" | "WARNING" | "CRITICAL";
  alertType:
    | "TEMPERATURE_EXCURSION"
    | "ROUTE_DEVIATION"
    | "SHOCK_IMPACT"
    | "GEOFENCE_EXIT"
    | "UNPLANNED_STOP"
    | "SEAL_TAMPERED";
  message: string;
  metricValue: string;
  thresholdValue: string;
}

export class AnomalyDetectorService {
  static evaluateReading(
    asset: AssetProfile,
    reading: ReadingData,
  ): DetectedAlert[] {
    const alerts: DetectedAlert[] = [];

    // 1. Temperature Excursion Check
    if (
      reading.temperatureCelsius !== undefined &&
      reading.temperatureCelsius !== null
    ) {
      const temp = reading.temperatureCelsius;

      if (
        asset.maxTempCelsius !== null &&
        asset.maxTempCelsius !== undefined &&
        temp > asset.maxTempCelsius
      ) {
        const delta = temp - asset.maxTempCelsius;
        alerts.push({
          severity: delta >= 3.0 ? "CRITICAL" : "WARNING",
          alertType: "TEMPERATURE_EXCURSION",
          message: `Excursión térmica superior detectada en ${asset.name}: ${temp.toFixed(1)}°C (Límite: ${asset.maxTempCelsius.toFixed(1)}°C)`,
          metricValue: `${temp.toFixed(1)}°C`,
          thresholdValue: `Max: ${asset.maxTempCelsius.toFixed(1)}°C`,
        });
      } else if (
        asset.minTempCelsius !== null &&
        asset.minTempCelsius !== undefined &&
        temp < asset.minTempCelsius
      ) {
        const delta = asset.minTempCelsius - temp;
        alerts.push({
          severity: delta >= 3.0 ? "CRITICAL" : "WARNING",
          alertType: "TEMPERATURE_EXCURSION",
          message: `Excursión térmica inferior (riesgo de congelación) en ${asset.name}: ${temp.toFixed(1)}°C (Límite: ${asset.minTempCelsius.toFixed(1)}°C)`,
          metricValue: `${temp.toFixed(1)}°C`,
          thresholdValue: `Min: ${asset.minTempCelsius.toFixed(1)}°C`,
        });
      }
    }

    // 2. Shock & Impact G-Force Check
    if (reading.shockGForce >= 2.5) {
      alerts.push({
        severity: reading.shockGForce >= 4.0 ? "CRITICAL" : "WARNING",
        alertType: "SHOCK_IMPACT",
        message: `Impacto o aceleración brusca de ${reading.shockGForce.toFixed(2)}G detectada en ${asset.name}`,
        metricValue: `${reading.shockGForce.toFixed(2)}G`,
        thresholdValue: `2.50G Max`,
      });
    }

    // 3. Electronic Seal Tamper Check
    if (reading.sealTampered) {
      alerts.push({
        severity: "CRITICAL",
        alertType: "SEAL_TAMPERED",
        message: `ALERTA DE SEGURIDAD: Precinto electrónico violado o desconectado en ${asset.name}`,
        metricValue: "TAMPERED",
        thresholdValue: "SECURE",
      });
    }

    return alerts;
  }
}
