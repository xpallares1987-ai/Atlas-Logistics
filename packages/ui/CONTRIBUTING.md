# Contributing to Control-Tower-UI

Gracias por tu interés en contribuir a **Control-Tower-UI**. Este repositorio es un proyecto **100% independiente** dentro del ecosistema **Control Tower**.

## Proceso de Desarrollo

### 1. Requisitos
- **Node.js v20** y **pnpm v10**.
- Clona e instala:
  ```bash
  pnpm install
  ```

### 2. Estándares de Next.js 16
- Usamos **App Router**. Los componentes deben ser Server Components por defecto a menos que se requiera interactividad (`'use client'`).
- **TypeScript 6.0:** Mantener tipado estricto.
- **Vanilla CSS:** Usa CSS Modules (`.module.css`) para evitar colisiones de estilos.

### 3. Flujo de Git & Commits
Es obligatorio seguir la especificación de **Conventional Commits**:
- `feat(app): añadir nuevo widget de analítica de stock`
- `fix(map): corregir centrado inicial en Leaflet`
- `chore(ci): configurar caché de Next.js en GitHub Actions`

### 4. Pruebas
- Ejecuta `pnpm run test` para pruebas unitarias con Vitest.
- Asegúrate de que `pnpm run lint` no devuelva errores antes de enviar un PR.

## Pull Requests

1. Crea una rama desde `main`.
2. Realiza tus cambios y verifica el build estático con `pnpm run build`.
3. Abre un PR con una descripción clara de las mejoras o correcciones.

## Licencia
Al contribuir, aceptas que tu código sea licenciado bajo la licencia **MIT**.

