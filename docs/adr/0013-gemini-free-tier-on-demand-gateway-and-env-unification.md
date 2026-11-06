# 0013. Gateway On-Demand de Google Gemini AI (Free Tier) y Unificación de Variables de Entorno

- **Estado**: Aceptado
- **Fecha**: 2026-11-06
- **Contexto**: Atlas Logistics (Fastify + SQLite/Drizzle + React/Vite)

## Contexto y Problema

1. **Integración de IA sin Coste Operativo (Google AI Studio Free Tier)**:
   El proyecto requiere capacidades avanzadas de análisis jurídico-marítimo (FMC 46 CFR Part 541, ICC UCP 600, DCSA v3.0, Código CTU/IMDG, clasificación HS/CBAM y búsqueda semántica de protocolos) utilizando una API Key gratuita de Google AI Studio, garantizando cero costes y cero errores `429 Too Many Requests`.
2. **Proliferación de Archivos `.env*` Obsoletos**:
   Existían múltiples plantillas y copias contradictorias (`.env`, `.env.example`, `.env.local.example`, `.env.production.example`, `.env.saas.example`, `.env.production` y copias en `backups-test/`) con variables obsoletas de PostgreSQL, Firebase Data Connect y Camunda 8 SaaS que provocaban colisiones de puertos y rutas de base de datos.

## Decisión Arquitectónica

### 1. Gateway Centralizado On-Demand Multi-Modelo (`src/services/geminiService.ts`)
- **Ejecución Estrictamente Bajo Demanda (`1 Clic = 1 Petición`)**: Se prohíbe cualquier invocación automática a Gemini en carga de vistas, *polling* o tareas en segundo plano.
- **Separación de Cupos por Modelo (Independent Quota Pools)**:
  - `gemini-2.5-flash` (con auto-resolución a `gemini-3.8-flash` en cuentas nuevas): reservado para redacción jurídica FMC 541, pre-auditoría bancaria UCP 600, extracción multimodal e informes ejecutivos (**12 RPM / 1.400 RPD**).
  - `gemini-2.5-flash-lite` (con auto-resolución a `gemini-3.5-flash-lite`): asignado a auditorías rápidas de estiba 3D CTU/IMDG y clasificación arancelaria DCSA/HS/CBAM (**15 RPM / 1.400 RPD**).
  - `text-embedding-004` (con auto-resolución a `gemini-embedding-001`): asignado a búsqueda por similitud semántica de protocolos operativos (**100 RPM / 5.000 RPD**).
- **Salidas Estructuradas (`responseMimeType: "application/json"`)**: Reduce entre un 40% y un 60% el consumo de tokens de salida y garantiza contratos tipados para la interfaz React.
- **Caché de Doble Capa (L1 + L2) y Protección en Tests**:
  - **L1 (`NodeCache`, TTL 30–60 min)**: Evita llamadas repetidas en la misma sesión.
  - **L2 (Columna `metadata` en SQLite)**: Persiste los dictámenes generados directamente en las entidades relacionales (`demurrage_invoices`, `ocean_booking_details`, `container_stowage_plans`).
  - **Aislamiento en `vitest`**: Durante la ejecución de pruebas automatizadas (`process.env.VITEST`), el servicio utiliza el motor determinístico local sin consumir cuota real de la API Key del desarrollador.

### 2. Estándar Único de Dos Archivos `.env` en Raíz
- Se eliminan todos los archivos `.env*` redundantes u obsoletos, manteniendo exclusivamente:
  1. **`.env.example`** *(Versionado en Git)*: Plantilla canónica única alineada con SQLite (`file:./data/dev.db`), Fastify (`3001`), Vite (`5173`) y Google AI Studio (`GEMINI_API_KEY`).
  2. **`.env.local`** *(Ignorado en Git)*: Configuración local activa del desarrollador.

## Consecuencias

- **Positivas**: Consumo de tokens reducido al mínimo, 0 llamadas accidentales en segundo plano, persistencia permanente en SQLite de los análisis IA ya generados y eliminación total de conflictos entre archivos `.env`.
- **Mitigaciones**: En caso de ausencia de clave o agotamiento temporal de ventana por minuto, todos los endpoints devuelven un dictamen determinístico calculado sobre los registros reales de SQLite (`source: "deterministic-fallback"`).
