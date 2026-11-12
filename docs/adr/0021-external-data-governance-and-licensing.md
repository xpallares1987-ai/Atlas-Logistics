# ADR 0021: Bounded Context de Gobierno de Datos Externos, Licenciamiento y Procedencia (Zero-Cost & Offline)

## Estado
**Aceptado**

## Cuadrante Diátaxis
**Explicación y Decisiones Arquitectónicas** (`docs/adr/`)

---

## Contexto y Planteamiento del Problema

Atlas Logistics integra de forma recurrente información proveniente de múltiples fuentes externas y registros abiertos (Wikidata, Wikipedia, Wikimedia Commons, OpenStreetMap / Nominatim, GeoNames, UN/LOCODE de UNECE, GLEIF / LEI, UN Comtrade, Crossref, ORCID, OpenAlex, Europeana, DBpedia, OpenCorporates, VIAF, ISNI e IMO GISIS).

Hasta el momento, estas fuentes se consumían de forma fragmentada o implícita en servicios como `address-geocoding.service.ts` y hooks como `useNominatimGeocoding.ts`, sin una capa unificada de gobernanza que garantizara:
1. **Verificación Formal de Licencias y Derechos**: Identificar si un dataset o registro cuenta con licencias permisivas (`CC0-1.0`), con atribución (`CC-BY-4.0`, `ODC-BY-1.0`), de compartir igual (`CC-BY-SA-4.0`, `ODbL-1.0`) o términos contractuales/propietarios restringidos.
2. **Evaluación de Conformidad por Finalidad**: Autorizar o bloquear el uso de datos según el propósito de negocio (`INGESTION`, `INTERNAL_USE`, `COMMERCIAL_USE`, `PUBLICATION`, `REDISTRIBUTION`, `DERIVATIVE_DATASET`, `AI_RAG_USE`, `API_EXPORT`).
3. **Generación Determinista de Atribuciones**: Cumplir con las cláusulas de atribución obligatoria sin descuidar enlaces canónicos ni avisos de modificación.
4. **Trazabilidad y Procedencia End-to-End**: Probar qué versión o release se utilizó, cuándo se verificaron los derechos, qué transformaciones se aplicaron y qué evidencias sustentan el uso.
5. **Revisión Manual Auditable**: Establecer un flujo regulado para que oficiales de cumplimiento resuelvan bloqueos mediante justificaciones fundadas y URLs de evidencia inmutables.

---

## Decisiones Tomadas

### 1. Creación del Bounded Context de Soporte `ExternalDataGovernance`
Se establece un nuevo bounded context de soporte denominado `ExternalDataGovernance` que no reemplaza el MDM existente de Atlas Logistics, sino que vincula afirmaciones externas con entidades internas conservando valores originales, normalizados, autoridad, confianza y evidencia.

### 2. Metodología de Base de Datos (Zero-Cost & Offline SQLite)
De acuerdo con la directriz de ingeniería de base de datos de Atlas Logistics, la persistencia se implementa bajo los siguientes pilares inquebrantables:
- **Topología WAL y Claves Foráneas**: SQLite en modo WAL (`PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;`) con claves foráneas activas (`PRAGMA foreign_keys = ON;`).
- **Esquema Modular Relacional**: Ubicado en `src/db/schema/external_governance.ts` y re-exportado en el `index.ts` maestro.
- **Patrón Puntero (Cero BLOBs en SQLite)**: Queda estrictamente prohibido almacenar binarios en SQLite. Las evidencias, capturas, volcados y dumps se alojan en el sistema de archivos local (`/atlas-data/governance/evidence/YYYY/MM/`), registrando en la base de datos únicamente metadatos, hashes SHA-256 y la ruta física/URL de evidencia.
- **Modo JSON para Payloads Dinámicos**: Los registros externos crudos y normalizados se almacenan en columnas `text("payload", { mode: "json" })`, indexando en columnas relacionales de primer nivel únicamente los identificadores y atributos clave de búsqueda (`source_record_id`, `licence_code`, etc.).
- **Diccionarios en RAM para Cargas de Alto Rendimiento**: Las licencias canónicas y los códigos estáticos se cargan en `Map()` nativos en memoria durante el inicio del servicio para permitir validaciones en microsegundos sin sobrecargar SQLite.
- **Escrituras en Lote Transaccionales**: Las ingestas masivas de registros externos se realizan mediante transacciones atómicas `db.insert().values(array)`.

### 3. Modelo Físico Desacoplado (11 Entidades Fundamentales)
Se prohíbe concentrar la lógica en una única tabla de fuentes. Se modelan explícitamente:
- `data_sources`: Catálogo de proveedores externos (institución, términos, web).
- `source_datasets`: Datasets alojados por cada fuente con su alcance predeterminado.
- `dataset_releases`: Releases o versiones temporales del dataset con fecha de verificación.
- `access_methods`: Puntos de entrada técnicos (REST API, SPARQL, Dump masivo).
- `source_records`: Instancias individuales de datos con payload original y normalizado.
- `entity_source_links`: Vínculo semántico entre registros externos y entidades del dominio Atlas (Locations, Vessels, Carriers, Parties).
- `provenance_events`: Registro inmutable de eventos de procedencia y transformaciones.
- `licence_definitions`: Definiciones canónicas de licencias con URLs inmutables y permisos.
- `compliance_assessments`: Evaluaciones de cumplimiento por finalidad.
- `validation_results`: Detalle individual de reglas ejecutadas.
- `manual_reviews`: Resoluciones de excepciones y overrides emitidos por oficiales.

### 4. Motor de Reglas Automáticas y Algoritmo Fail-Closed
- Se implementan reglas independientes y testeables:
  - Estructurales (`VAL-001` a `VAL-015`): Validación de URLs canónicas, fechas consistentes, presencia de términos, evidencia suficiente.
  - De Atribución (`ATTR-001` a `ATTR-009`): Verificación de autor, enlace a licencia, aviso de cambios, visibilidad.
  - Específicas por Licencia (`CC0-1.0`, `CC-BY-4.0`, `CC-BY-SA-4.0`, `ODbL-1.0`, `PROPRIETARY-TERMS`, `CONTRACTUAL`).
- **Algoritmo de Decisión**:
  $$\text{Si } (\text{bloqueos} > 0 \lor \text{conflicto de finalidad} \lor \neg\text{derechos\_verificados}) \implies \mathbf{BLOCKED}$$
  $$\text{Si no hay bloqueos y hay advertencias} \implies \mathbf{PASS\_WITH\_WARNINGS}$$
  $$\text{En cualquier otro caso} \implies \mathbf{PASS}$$
- El motor **devuelve todos los motivos de bloqueo** sin interrumpir la evaluación en el primer fallo.

### 5. Rol `COMPLIANCE_OFFICER` y Aislamiento de Tenant
- Las revisiones manuales, sobreescrituras de bloqueos y registro de nuevos proveedores requieren autenticación JWT y rol `COMPLIANCE_OFFICER` (o `ADMIN`).
- Todo registro de auditoría y vinculación operativa respeta el aislamiento multi-tenant mediante `AsyncLocalStorage<TenantContext>` (`assertTenantAccess()` y `scopeByTenant()`).

### 6. Integración con el Transactional Outbox
Toda modificación o evaluación emite eventos de dominio inmutables hacia `scmOutboxMessages` a través de `TransactionalOutboxBus` (`external_data.source.registered`, `external_data.compliance.completed`, `external_data.compliance.blocked`, etc.).

### 7. Interfaz de Usuario PWA y Guardarraíl de Complejidad
- Se implementa `ExternalDataGovernanceModule.tsx` en `packages/frontend/src/pages/` bajo el límite estricto de `<1.000 líneas` (ADR 0020), apoyado en 5 submódulos de pestañas operativas y 1 modal de revisión manual en `packages/frontend/src/components/external-governance/`.
- Uso exclusivo de datos en vivo de Fastify/SQLite (Zero Mocks) y paleta semántica estandarizada.

---

## Consecuencias

### Positivas
- **Blindaje Legal y Auditoría Continua**: Atlas Logistics cuenta con evidencia inmutable sobre el origen y las licencias de cada dato externo que alimenta cotizaciones, pedimentos aduanales y georutas.
- **Rendimiento Óptimo a Cero Coste**: SQLite en modo WAL, diccionarios en RAM e inserciones transaccionales en lote garantizan tiempos de respuesta en milisegundos sin requerir servicios de nube de pago ni infraestructuras pesadas.
- **Cumplimiento Automatizado**: Las finalidades críticas como `AI_RAG_USE` y `COMMERCIAL_USE` quedan protegidas ante contaminaciones de licencias incompatibles (`CC-BY-SA` o términos no comerciales).
- **Consistencia Arquitectónica**: Sigue fielmente los estándares del monorepo (Zod en `packages/shared`, Fastify en backend, PWA en frontend, Diátaxis en documentación).

### Desafíos y Mitigaciones
- **Mantenimiento del Catálogo de Licencias**: Nuevas fuentes pueden introducir licencias sui generis; se mitiga permitiendo códigos `PROVIDER-SPECIFIC` y `CONTRACTUAL` acompañados de revisión manual obligatoria.
- **Caducidad de Derechos**: Las fuentes dinámicas requieren verificación periódica; se resuelve incorporando un job de reevaluación programado en BullMQ para detectar derechos expirados.
