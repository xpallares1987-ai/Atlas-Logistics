# Freight Comparer

Este proyecto es una herramienta para comparar costos de fletes, utilizando Gemini API para proporcionar análisis de datos logísticos y visualizaciones interactivas.

## Objetivos del Proyecto

- Facilitar la comparación de tarifas de fletes entre diferentes transportistas.
- Analizar tendencias de costos mediante visualizaciones basadas en Chart.js y D3.

## Stack Tecnológico

- **Frontend:** React 19, TypeScript 5.8, TailwindCSS.
- **Backend:** Express, Vite.
- **Visualización:** Chart.js, D3.
- **Librerías Core:**
  - `@google/genai`: Integración con Gemini.
  - `xlsx`: Procesamiento de archivos Excel.

## Estructura del Proyecto

- `src/`: Código fuente de la aplicación (Frontend y componentes).
- `server/` (opcional/implícito): Backend Express.
- `public/`: Recursos estáticos.

## Guías de Desarrollo

- **TypeScript:** Mantener tipado estricto.
- **Seguridad:** Nunca exponer `GEMINI_API_KEY` en el control de versiones. Asegurar que las llamadas a la API se realicen preferiblemente desde el backend o de forma segura.
- **Estilos:** Utilizar TailwindCSS siguiendo el diseño proporcionado.

## Comandos Útiles

- `pnpm run dev`: Iniciar el servidor de desarrollo.
- `pnpm run build`: Compilación para producción.
- `pnpm run test`: Ejecución de tests.
- `pnpm run lint`: Verificación estática de código.

## Mantenimiento y Auditoría

- **Security Audit**: Revisar dependencias periódicamente.

## Roadmap de Mejora
Este repositorio sigue el plan de 20 puntos detallado en el [Roadmap Maestro](../ROADMAP.md).
---
