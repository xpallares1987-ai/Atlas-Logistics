# ADR 0020: Descomposición Modular Frontend y Guardarraíles de Complejidad (<1.000 Líneas)

## Estado
**Aceptado**

## Cuadrante Diátaxis
**Explicación y Decisiones Arquitectónicas** (`docs/adr/`)

---

## Contexto y Planteamiento del Problema

A medida que el proyecto Atlas Logistics ha incorporado flujos de trabajo avanzados de comercio exterior (DCSA 3.0, OCR aduanero con modelos multimodales, trazabilidad PKI con sellos WebCrypto/SAT e.firma, y orquestación B2B EDIFACT/ANSI X12), varios módulos de interfaz de usuario en `packages/frontend/src/pages/` crecieron de manera desproporcionada hasta convertirse en componentes monolíticos de más de 2.400 líneas de código:

1. `DocumentVaultModule.tsx`: **2.736 líneas** (acumulaba catálogo de plantillas, bóveda con filtros, verificador criptográfico SHA-256, motor OCR 4-en-1 con matriz de conciliación tripartita y modal de firma digital).
2. `EdiIntegrationModule.tsx`: **2.402 líneas** (acumulaba feed telemático DCSA 3.0 con simulador de disrupciones, parser de árboles sintácticos AST de mensajes EDI, generador outbound para EDI 304 SOLAS VGM y 310 Freight Invoice, libro mayor de auditoría y directorio de trading partners).

Este crecimiento monolítico presentaba importantes desventajas:
- **Sobrecarga Cognitiva y Mantenibilidad**: Dificultad para localizar secciones específicas y riesgo elevado de regresiones cruzadas durante ediciones concurrentes.
- **Degradación del HMR (Hot Module Replacement)**: Recompilaciones más lentas durante el ciclo de desarrollo en Vite ante modificaciones puntuales.
- **Violación del Principio de Responsabilidad Única**: Un único componente orquestador gestionaba simultáneamente el estado de servidor, múltiples pestañas funcionales disjuntas y diálogos modales complejos.

---

## Decisiones Tomadas

### 1. Establecimiento de Umbral Estricto de Tamaño (<1.000 líneas)
Se adopta como estándar obligatorio del monorepo que **ningún módulo de página u orquestador en `packages/frontend/src/pages/` superará las 1.000 líneas de código**. Los orquestadores deben limitarse a:
- Centralizar el estado reactivo raíz y la sincronización con los endpoints Fastify / SQLite (Zero Mocks).
- Proveer los handlers de navegación y eventos de alto nivel.
- Delegar la renderización de pestañas y modales a submódulos especializados.

### 2. Patrón de Descomposición Modular Canónica
Todo módulo que supere o se aproxime al umbral debe estructurarse según el siguiente patrón:

```
packages/frontend/src/
├── types/
│   └── <dominio>.types.ts               # Contratos e interfaces de props tipadas
├── utils/
│   └── <dominio>.utils.tsx              # Utilidades de renderizado de iconos y formato
├── components/<dominio>/
│   ├── <Dominio><Tab1>Tab.tsx           # Pestaña 1 atómica y desacoplada
│   ├── <Dominio><Tab2>Tab.tsx           # Pestaña 2 atómica y desacoplada
│   └── modals/
│       └── <Dominio><Accion>Modal.tsx   # Diálogos modales extraídos
└── pages/
    └── <Dominio>Module.tsx              # Orquestador lean (<1.000 líneas)
```

### 3. Automatización del Guardarraíl de Tamaño de Archivo (`check:file-sizes`)
Se implementó un script de verificación automatizada en `scripts/check-file-sizes.mjs`, acompañado de su suite de pruebas unitarias (`tests/check-file-sizes.test.ts`), integrado en `package.json` mediante:
```json
"check:file-sizes": "node scripts/check-file-sizes.mjs"
```
El scanner reporta mediante tablas coloreadas los archivos que exceden el límite de 1.000 líneas y se ejecuta en las rutinas de aseguramiento de calidad antes de commits mayores.

---

## Resultados y Métricas de Impacto

| Módulo Refactorizado | Líneas Originales | Líneas Resultantes | Reducción Neta | Subcomponentes Creados |
| :--- | :--- | :--- | :--- | :--- |
| `DocumentVaultModule.tsx` | 2.736 líneas | **895 líneas** | **-67,3% (-1.841 líneas)** | `DocumentStudioTab`, `DocumentVaultTab`, `DocumentVerifyTab`, `DocumentOcrStudioTab`, `DocumentViewerModal`, `document-vault.types`, `document-vault.utils` |
| `EdiIntegrationModule.tsx` | 2.402 líneas | **673 líneas** | **-72,0% (-1.729 líneas)** | `EdiDcsaTab`, `EdiStudioTab`, `EdiOutboundTab`, `EdiAuditTab`, `EdiPartnersTab`, `DcsaSubscriptionModal`, `edi-integration.types` |
| **Total Combinado** | **5.138 líneas** | **1.568 líneas** | **-69,5% (-3.570 líneas)** | **14 módulos atómicos nuevos** |

---

## Consecuencias y Verificación

### Consecuencias Positivas
- **Cero Mocks Preservado**: El 100% de las integraciones con endpoints reales de Fastify (`/api/documents/*`, `/api/dcsa/*`, `/api/edi/*`, `/api/shipments`) continúan operando con persistencia en SQLite y modo WAL.
- **Tipado Estricto de Contratos**: La extracción de `document-vault.types.ts` y `edi-integration.types.ts` permite reutilizar interfaces sin acoplar componentes entre sí.
- **Alineación con CI/CD**: Verificación con 0 errores de TypeScript (`tsc --noEmit`), Vite build en menos de 8 segundos y pruebas unitarias de guardarraíl pasando al 100%.

### Consecuencias a Gestionar
- Mantener la disciplina en futuros PRs y desarrollos para no sobrepasar el umbral de 1.000 líneas en los módulos restantes del backlog (`ShipmentWorkspace360Module`, `SettingsModule`, `ContainerPlannerModule`).
