# Política de Seguridad - Freight-Comparer

Este repositorio es un proyecto independiente dentro del ecosistema **Control Tower**. La seguridad de los datos logísticos y las credenciales es nuestra prioridad.

## Reporte de Vulnerabilidades

Si encuentras una vulnerabilidad, por favor **no la hagas pública**.

1. Utiliza la funcionalidad [Private Vulnerability Reporting](https://docs.github.com/en/code-security/security-advisories/guidelines-for-reporting-vulnerabilities/reporting-a-vulnerability-to-a-maintainer) de GitHub en la pestaña **Security**.
2. Proporciona detalles técnicos y pasos para reproducir.

## Prácticas de Seguridad Específicas

### 1. Gestión de API Keys

- El uso de **Gemini API** requiere una clave privada.
- Esta clave **nunca** debe ser expuesta en el código fuente, mensajes de commit o archivos subidos al repositorio.
- Usa variables de entorno (`.env`) localmente y **GitHub Secrets** para despliegues o CI.

### 2. Procesamiento de Archivos

- El análisis de archivos Excel (`.xlsx`, `.csv`) se realiza de forma segura, validando los tipos de datos para prevenir ataques de inyección de fórmulas o desbordamientos de memoria.

### 3. Entorno de Ejecución

- Los flujos de CI/CD siguen el principio de **mínimos privilegios** (`contents: read`).
- El ecosistema es auditado semanalmente con Dependabot y mediante el script local `./scripts/maintenance/security-audit.sh`.
