# Contributing to Atlas-Logistics

Gracias por tu interés en contribuir a **Atlas-Logistics**. Este proyecto es un **repositorio independiente** dentro del ecosistema **Control Tower**.

## Proceso de Desarrollo

### 1. Requisitos

- **Node.js v20** y **pnpm v10**.
- **Docker Desktop** para servicios locales.

### 2. Flujo de Trabajo

- Usa **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`).
- Las ramas deben seguir el patrón `feat/nombre-cambio` o `fix/descripcion-bug`.

### 3. Estándares de Código

- **TypeScript:** Tipado estricto mandatorio.
- **Drizzle:** Los cambios en el esquema deben generar migraciones mediante `pnpm run db:generate`.

### 4. Validación

- Ejecuta `pnpm run test` antes de enviar cambios.
- Los commits son validados mediante Husky y lint-staged.

## Licencia

Al contribuir, aceptas que tu código sea licenciado bajo la licencia **MIT**.
