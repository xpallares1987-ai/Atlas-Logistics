# Política de Seguridad - BPMN-Modeler

Este documento describe la política de seguridad para el repositorio **BPMN-Modeler**, parte del ecosistema **Control Tower**.

## Versiones Soportadas

Actualmente se proporcionan actualizaciones de seguridad para las siguientes versiones:

| Versión | Soportada          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporte de Vulnerabilidades

Si descubres una vulnerabilidad de seguridad, por favor **no abras un issue público**. En su lugar:

1. Reporta la vulnerabilidad a través de la funcionalidad [Private Vulnerability Reporting](https://docs.github.com/en/code-security/security-advisories/guidelines-for-reporting-vulnerabilities/reporting-a-vulnerability-to-a-maintainer) de GitHub, disponible en la pestaña **Security** de este repositorio.
2. Proporciona una descripción detallada y pasos para reproducir el fallo.

**Expectativas de Respuesta:**
- **Acuse de recibo:** Menos de 48 horas.
- **Actualizaciones de estado:** Cada 7 días hasta la resolución.
- **Divulgación:** Se coordinará una fecha de divulgación pública una vez que el parche esté disponible.

## Prácticas de Seguridad en Desarrollo

- **Sanitización de XML:** Toda manipulación de archivos BPMN/XML se realiza en Web Workers aislados y pasa por un proceso de sanitización para evitar ataques de inyección (XSS) o XML Bombs.
- **Dependencias:** El repositorio es monitoreado semanalmente por Dependabot para asegurar que todas las librerías críticas estén actualizadas.
