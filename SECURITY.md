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
- **Secretos de GCP y Camunda:** Cualquier vulnerabilidad que permita la exposición de los Service Accounts de GCP o los `ZEEBE_CLIENT_SECRET` en el navegador.
- **Firebase Data Connect:** Escalada de privilegios a través de inyecciones en el esquema GraphQL.
- **Workers BPMN:** Ejecución remota de código en los Node Workers que atienden a Zeebe.

Alentamos a los investigadores de seguridad a auditar los despliegues, siempre y cuando se haga de manera responsable y en entornos locales o *sandbox*.
