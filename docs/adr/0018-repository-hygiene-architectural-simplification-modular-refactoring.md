# 0018. Higiene del Repositorio, Simplificación Arquitectónica y Descomposición Modular

* **Estado**: Aceptado
* **Fecha**: 2026-11-11
* **Cuadrante Diátaxis**: Explicación y Decisiones (`docs/adr/`)
* **Autores**: Atlas Logistics Core Architecture Team & Frontend Platform Engineers

---

## 1. Contexto y Problemática

A medida que el proyecto Atlas Logistics ha incorporado capacidades avanzadas (SCM CQRS, contratos inteligentes MLETR, despacho DUA/CBAM, B2B EDI/DCSA/ONE Record y Sostenibilidad Marítima FuelEU/EU ETS), el repositorio experimentó una acumulación de deuda técnica estructural y dispersión de archivos:

1. **Infracción de Higiene de la Raíz del Repositorio**: Se detectaron especificaciones y reportes Markdown obsoletos fechados en 2024 en la raíz (`DOCUMENTATION_PROJECT_COMPLETE.md`, `API_INTEGRATION_GUIDE.md`, etc.), así como bases de datos SQLite temporales de pruebas (`atlas-erp-*.db*`, `test-migrate*.db*`), parches y registros de log. Esto vulneraba la directriz de gobernanza Diátaxis (Sección 5 de `AGENTS.md`) que exige la presencia exclusiva de los 6 archivos canónicos en la raíz.
2. **Capas Proxy Redundantes (`src/services/`)**: Existían 18 directorios con archivos de servicio vacíos o de cinco líneas cuya única función era re-exportar símbolos de `src/modules/*` (`export * from "../../modules/..."`), generando una duplicidad de capas sin valor operativo ni consumidores activos.
3. **Archivos de Datos Mockup Huérfanos**: En `packages/rate-comparer/src/data/`, persistían los archivos `datos.ts` (6.145 líneas de datos mock) y `raw_rates.csv` (35 KB) sin ninguna importación activa en el monorepo.
4. **Vistas Monolíticas Masivas en el Frontend**: Vistas operativas de alta complejidad, en particular `ShipmentWorkspace360Module.tsx` (3.385 líneas), acumulaban internamente la declaración de múltiples interfaces de tipos BFF, lógica de negocio y JSX de múltiples pestañas desacopladas (Visión General, Finanzas Verdes/GLEC v3/CBAM/DUA, Tareas, etc.), dificultando el mantenimiento y la navegación del código.

---

## 2. Decisiones Arquitectónicas y Acciones Ejecutadas

### 2.1. Purgado Integral de Basura y Cumplimiento de Higiene de Raíz
- **Eliminación de Archivos Obsoletos**: Se eliminaron los 7 archivos Markdown heredados de 2024 en la raíz y en `docs/` sueltos.
- **Purgado de Bases de Datos Temporales y Logs**: Se eliminaron las bases de datos transitorias de pruebas, archivos de depuración y parches en la raíz.
- **Garantía Canónica de Raíz**: La raíz del repositorio queda fijada estrictamente en los 6 archivos estándar:
  1. `README.md`
  2. `AGENTS.md`
  3. `CONTRIBUTING.md`
  4. `SECURITY.md`
  5. `CHANGELOG.md`
  6. `CODE_OF_CONDUCT.md`
- **Eliminación de Directorios Vacíos**: Se purgaron 17 carpetas vacías identificadas en el monorepo.

### 2.2. Supresión de la Capa de Re-exportación Proxy en `src/services/`
Se eliminaron 18 subdirectorios redundantes en `src/services/`:
- `aeo-security`, `air-cargo`, `bulk-operations`, `cargo-insurance`, `cbam`, `chartering`, `claims`, `cold-chain`, `customs`, `customs-warehouse`, `dangerous-goods`, `fueleu`, `general-average`, `incoterms`, `rail`, `road-freight`, `trade-finance`, `treasury`.
- Se preservaron exclusivamente los servicios con lógica e implementación propia en `src/services/`: `carbon`, `control-tower`, `dcsa`, `documents`, `edi`, `mletr`, `pdf`, `routing`, `telemetry` y `__tests__`.
- Los módulos operativos continúan residiendo de forma canónica en `src/modules/*` siguiendo principios de cohesión modular Domain-Driven Design (DDD).

### 2.3. Eliminación de Datos Mock en Rate-Comparer
- Se eliminó `packages/rate-comparer/src/data/datos.ts` (-6.145 líneas) y `raw_rates.csv`.
- Se verificó que el compilado y funcionamiento de `@atlas/rate-comparer` opera al 100% sin dependencias de datos ficticios.

### 2.4. Descomposición Modular de `ShipmentWorkspace360Module.tsx`
Se refactorizó la vista de 3.385 líneas aplicando separación de responsabilidades:
1. **Extracción de Tipos de Dominio**: Se creó `packages/frontend/src/types/shipment-workspace360.types.ts` reuniendo interfaces canónicas del BFF (`OperationalShipment360View`, `ShipmentGreenComplianceReadModel`, `MletrRecordSummary`, etc.).
2. **Componente `ShipmentOverviewTab.tsx`**: Se extrajo la perspectiva de visión general (325 líneas) a `packages/frontend/src/components/workspace360/ShipmentOverviewTab.tsx`.
3. **Componente `ShipmentGreenComplianceTab.tsx`**: Se extrajo la perspectiva de finanzas verdes, huella Scope 3 GLEC v3, CBAM y DUA (545 líneas) a `packages/frontend/src/components/workspace360/ShipmentGreenComplianceTab.tsx`.
4. **Reducción de Líneas**: `ShipmentWorkspace360Module.tsx` se redujo en más de 1.240 líneas (-36.5%), pasando a 2.140 líneas altamente legibles.

---

## 3. Consecuencias y Verificación de Integridad

| Métrica | Antes | Después | Impacto |
| :--- | :--- | :--- | :--- |
| **Líneas `datos.ts` (mock)** | 6.145 | 0 (eliminado) | -100% código muerto |
| **Líneas `ShipmentWorkspace360`** | 3.385 | 2.140 | -36.5% complejidad reducida |
| **Directorios Proxy en `services/`**| 28 | 10 (solo activos) | -64% carpetas redundantes |
| **Archivos Markdown en Raíz** | 13 | 6 canónicos | 100% higiene Diátaxis |
| **TypeScript Type-Check** | - | 0 errores (`tsc --noEmit`) | Verificación estricta superada |
| **Frontend Vite Build** | - | Éxito en 8.88s (PWA ok) | Cero regresiones |
| **Backend Vitest Tests** | - | 22/22 pasados | 100% suites verdes |

---

## 4. Referencias y Vínculos Diátaxis
- [AGENTS.md](../../AGENTS.md) - Directrices de Desarrollo, Guardarraíles y Gobernanza de la Raíz.
- [0010-zero-mock-live-persistence-standard.md](0010-zero-mock-live-persistence-standard.md) - Estándar Cero Mocks.
- [0017-fueleu-maritime-ets-carbon-insetting.md](0017-fueleu-maritime-ets-carbon-insetting.md) - Módulo FuelEU Maritime y Carbon Insetting.
