# Política de Seguridad - Shipment-Dashboard

Este repositorio es un proyecto independiente dentro del ecosistema **Control Tower**. La seguridad de los datos operativos y la integridad de los reportes es fundamental.

## Versiones Soportadas

Actualmente se proporcionan actualizaciones de seguridad para las siguientes versiones:

| Versión | Soportada          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporte de Vulnerabilidades

Si encuentras una vulnerabilidad de seguridad, por favor **no la hagas pública**.

1. Reporta la vulnerabilidad a través de la funcionalidad [Private Vulnerability Reporting](https://docs.github.com/en/code-security/security-advisories/guidelines-for-reporting-vulnerabilities/reporting-a-vulnerability-to-a-maintainer) de GitHub, disponible en la pestaña **Security**.
2. Proporciona una descripción detallada y pasos para reproducir.

**Expectativas de Respuesta:**

- **Acuse de recibo:** Menos de 48 horas.
- **Actualizaciones de estado:** Cada 7 días.

## Prácticas de Seguridad en Desarrollo

- **Procesamiento Local:** Los reportes corporativos (XML/Excel) se procesan localmente en el cliente para minimizar el riesgo de exposición de datos en tránsito.
- **Mínimos Privilegios:** Todos los flujos de GitHub Actions están configurados con permisos restringidos (`contents: read`).
- **Auditoría de Dependencias:** Uso semanal de Dependabot y del script local `./scripts/maintenance/security-audit.sh`.
- **Saneamiento:** Obligatorio el uso de técnicas de escape para prevenir XSS al renderizar datos dinámicos provenientes de los archivos de origen.
