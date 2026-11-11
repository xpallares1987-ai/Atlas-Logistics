## Descripción del Cambio
<!-- Describe brevemente los cambios introducidos, la motivación y el contexto técnico. -->

## Tipo de Cambio
- [ ] 🐛 Corrección de bug (`fix`)
- [ ] ✨ Nueva funcionalidad (`feat`)
- [ ] ⚡ Optimización de rendimiento (`perf`)
- [ ] 📝 Documentación Diátaxis (`docs`)
- [ ] ♻️ Refactorización (`refactor`)
- [ ] 🔧 Mantenimiento / CI / Dependencias (`chore` / `ci`)

## Módulos Afectados
- [ ] Backend Fastify API (`src/`)
- [ ] Frontend SPA React (`packages/frontend/`)
- [ ] Base de Datos & Drizzle ORM (`src/db/`)
- [ ] Paquetes Compartidos (`packages/shared/`, `packages/ui/`)
- [ ] CI/CD & Workflows (`.github/`)
- [ ] Documentación (`docs/`)

---

## Lista de Verificación Obligatoria
Antes de solicitar revisión o fusionar este Pull Request, confirma que se han completado los siguientes pasos:

- [ ] **Typecheck**: `pnpm type-check` ejecutado con éxito (cero errores en backend y frontend).
- [ ] **Tests Unitarios e Integración**: `pnpm test` (o `pnpm vitest run`) ejecutado con éxito (100% de tests pasando).
- [ ] **Linting & Formato**: `pnpm run eslint` pasa sin errores.
- [ ] **Auditoría de Fugas**: `pnpm run audit:leaks` finaliza en código 0 sin secretos ni identificadores confidenciales.
- [ ] **Política Zero Mocks**: Todas las vistas o mutaciones nuevas consumen endpoints reales de SQLite/Fastify.
- [ ] **Gobernanza Diátaxis**: No se han añadido archivos sueltos en la raíz del repositorio.
- [ ] **Formato de Commits**: Se utiliza la convención de *Conventional Commits* para compatibilidad con Semantic Release.
