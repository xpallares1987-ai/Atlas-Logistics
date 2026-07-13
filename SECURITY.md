# Política de Seguridad de Atlas Logistics

Nos tomamos muy en serio la seguridad de la información logística y aduanera que transita por Atlas Logistics. Debido a la naturaleza crítica del software de Supply Chain Management, aplicamos políticas estrictas.

## Versiones Soportadas

Actualmente, solo aplicamos parches de seguridad a las últimas versiones estables.

| Versión | Soportada          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

## Reporte de Vulnerabilidades

Si descubres una vulnerabilidad en este proyecto, **POR FAVOR, NO la reportes a través de Issues públicos**. La información logística y los conectores a GCP/Camunda son confidenciales.

Por favor, envía un correo electrónico al equipo de arquitectura. Proporcionaremos acuse de recibo en un plazo de 24 horas y emitiremos un parche (Hotfix) para vulnerabilidades críticas en menos de 48 horas.

### Áreas Críticas de Atención
- **Secretos de GCP y Firebase:** Los despliegues automáticos (CI/CD) utilizan **Google Cloud Workload Identity Federation (WIF)**, eliminando la necesidad de claves de servicio estáticas. Cualquier intento de inyectar o exfiltrar llaves privadas o *Service Accounts* tradicionales es considerado crítico. Las claves de API públicas están restringidas por dominio.
- **Vulnerabilidades a Nivel de Código (Timing Attacks y Randomness):** El repositorio utiliza `timingSafeEqual` para comparaciones sensibles y `crypto.getRandomValues()` de forma estricta (sin sesgo de módulo o *modulo bias*) para evitar vulnerabilidades de predicción o análisis de tiempo.
- **Firebase Data Connect y RBAC:** Escalada de privilegios a través de fallos en las directivas `@auth` del esquema GraphQL. Asegurar que las operaciones sensibles usen siempre `@auth(level: USER)` o controles de roles más avanzados basados en los **Custom Claims** inyectados por la función `assignUserRole`.
- **Vulnerabilidades XSS y Dependencias:** Cualquier vector que permita inyectar scripts en el frontend y pueda robar tokens de sesión de Firebase. Dependencias riesgosas han sido eliminadas (ej. migraciones hacia librerías robustas como `exceljs`).
- **Inyección de Prompts en IA (AI Layer):** Manipulación intencionada de los modelos de Google Gemini (ej. `chatWithData`) a través de los inputs de usuario que pueda resultar en filtración de esquemas de bases de datos, inyecciones de código en `code_execution` o exfiltración de PII.

## Auditoría Continua y Code Scanning

Atlas Logistics emplea **GitHub Advanced Security** de forma obligatoria en la integración continua:
- **CodeQL & njsscan:** Todo Pull Request es analizado estáticamente (SAST) buscando vulnerabilidades lógicas, de memoria, o exposición de secretos. No se permite la integración de código (merge) con alertas pendientes de CodeQL.
- **Dependabot:** Monitoriza activamente el árbol de dependencias (`pnpm`) para forzar actualizaciones de librerías con CVEs detectados.

Alentamos a los investigadores de seguridad a auditar los despliegues, siempre y cuando se haga de manera responsable y en entornos locales o *sandbox*.
