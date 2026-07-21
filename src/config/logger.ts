import pino from "pino";

// En producción (Cloud Run), GCP captura la salida estándar (stdout) y 
// parsea automáticamente el JSON generado por Pino como Structured Logs.
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: undefined,
  formatters: {
    level(label, number) {
      // Mapear los niveles de Pino a la severidad de Google Cloud Logging
      const gcpSeverity =
        label === "trace" || label === "debug" ? "DEBUG" :
        label === "info" ? "INFO" :
        label === "warn" ? "WARNING" :
        label === "error" || label === "fatal" ? "ERROR" : "DEFAULT";
      return { severity: gcpSeverity };
    },
  },
});
