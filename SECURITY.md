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
- **Secretos de GCP y Firebase:** Cualquier vulnerabilidad que permita la exposición de los Service Accounts de GCP o tokens API sin restricción en el navegador. Las claves de API públicas deben estar fuertemente restringidas por dominio en Google Cloud Console.
- **Firebase Data Connect:** Escalada de privilegios a través de fallos en las directivas `@auth` del esquema GraphQL. Asegurar que las operaciones sensibles usen siempre `@auth(level: USER)` o controles de roles más avanzados.
- **Vulnerabilidades XSS en la Súper-App:** Cualquier vector que permita inyectar scripts en `apps/atlas-scm` y pueda robar tokens de sesión de Firebase Authentication.

Alentamos a los investigadores de seguridad a auditar los despliegues, siempre y cuando se haga de manera responsable y en entornos locales o *sandbox*.
