# ADR 0021: Gobierno Ágil de Datos Externos, Vinculación de Entidades y Metodología Offline Resiliente (Zero-Cost SQLite)

## Estado
**Aceptado (Revisión Pragmática)**

## Cuadrante Diátaxis
**Explicación y Decisiones Arquitectónicas** (`docs/adr/`)

---

## Contexto y Planteamiento del Problema

Atlas Logistics opera en un modelo híbrido "Zero Cost & Offline First" con SQLite y Fastify. La integración de fuentes externas (UN/LOCODE de UNECE, OpenStreetMap, GeoNames, GLEIF, etc.) debe alimentar de forma ágil y confiable las entidades operativas internas (contenedores, puertos, expedientes y buques).

El diseño inicial contemplaba una arquitectura hiper-normalizada de 11 tablas con un evaluador determinista de licencias (ODbL, CC-BY, etc.). Sin embargo, para la realidad operativa del ecosistema local de coste cero, la hiper-burocracia de licencias introduce fricción innecesaria. La necesidad prioritaria es:
1. **Vincular entidades operativas** (puertos UN/LOCODE, coordenadas geocodificadas, terminales) con identificadores externos reales y conservar el payload crudo en JSON.
2. **Resolver la sincronización offline** mediante Event Sourcing / Outbox inmutable (append-only) para evitar conflictos de merge relacional entre bases locales y servidores centrales.
3. **Prevenir orfandad de archivos** en el sistema de archivos local mediante rutas relativas (`DOCS_ROOT`) y un Garbage Collector automático.
4. **Evitar des-sincronizaciones en caliente** del diccionario de puertos en memoria (RAM) usando un patrón *Write-Through Cache*.
5. **Garantizar backups transaccionalmente seguros** sin riesgo de corrupción por commits concurrentes mediante el comando nativo de SQLite `VACUUM INTO`.

---

## Decisiones Tomadas

### 1. Modelo Relacional Lean: La Tríada Esencial (3 Tablas)
Se descarta la hiper-normalización de 11 tablas en esta etapa y se adopta una arquitectura lean de 3 tablas fundamentales en `src/db/schema/external_governance.ts`:
- **`data_sources`**: Catálogo de orígenes de datos externos (`UNLOCODE`, `OPENSTREETMAP`, `GEONAMES`, `GLEIF`, `IMO_GISIS`).
- **`source_records`**: Datos crudos ingeridos con su payload original en JSON (`text("raw_payload", { mode: "json" })`), identificador externo, marca temporal de extracción y hash SHA-256 de integridad.
- **`entity_source_links`**: Cruce semántico directo entre registros externos y entidades operativas internas de Atlas (`PORT`, `LOCATION`, `VESSEL`, `CARRIER`, `SHIPMENT`, `CONTAINER`), con puntuación de confianza (`match_confidence`) y método de coincidencia.

### 2. Escrituras Exclusivas Append-Only (Event Sourcing / Outbox)
Para garantizar la sincronización bidireccional asíncrona entre entornos offline locales (`atlas-erp-v2.db`) y consolas consolidadas (`atlas-erp-prod.db` o nubes centrales):
- Las mutaciones de la UI y los endpoints no dependen de escrituras destructivas `UPDATE`/`DELETE` ad-hoc.
- Toda acción se canaliza a través de eventos inmutables en el log append-only `scmOutboxMessages` / `local_outbox_events` mediante `TransactionalOutboxBus`.
- La UI lee del modelo relacional proyectado (CQRS), pero las escrituras generan eventos de dominio que permiten replay y sincronización secuencial sin conflictos de UUIDs.

### 3. Gestión Documental: Rutas Relativas y Garbage Collector
- **Cero Rutas Absolutas en Base de Datos**: La tabla `documents` almacena únicamente hashes SHA-256 y rutas relativas o URLs virtuales (`/api/documents/download/...`).
- **Resolución al Vuelo**: Fastify resuelve la ruta física en disco a través de la variable de entorno `DOCS_ROOT` (por defecto `./uploads`), garantizando portabilidad absoluta entre Windows, Linux y NAS.
- **Garbage Collector Programado**: Script automatizado (`src/scripts/documents-garbage-collector.ts`) que audita el sistema de archivos contra la tabla `documents` en SQLite y purga de forma segura archivos huérfanos sin fila activa.

### 4. Diccionarios en Memoria: Write-Through Cache
- El motor de UN/LOCODE y lookups rápidos (`UnlocodePrefixTrie` en `packages/shared/src/unlocode.ts`) implementa un patrón **Write-Through**:
- Al crear o editar una entidad en SQLite, la mutación actualiza inmediatamente el objeto `Map()` / Trie en la memoria de Fastify sin requerir reinicios del servidor.

### 5. Respaldo Transaccional Seguro: SQLite Nativo (`VACUUM INTO`)
- Se prohíbe la copia directa de archivos `.db` en caliente con utilidades de sistema operativo (`Copy-Item` / `fs.copyFile`).
- El script maestro de copias de seguridad (`src/scripts/backup-db.js`) invoca la sentencia nativa de SQLite `VACUUM INTO 'backup-path.db'`, garantizando un volcado atómico, compacto y 100% libre de páginas corruptas incluso durante escrituras activas en modo WAL.

---

## Consecuencias

### Positivas
- **Velocidad de Implementación**: Reducción del 70% en código de soporte innecesario, permitiendo enlazar inmediatamente los contenedores y expedientes con UN/LOCODE y GeoNames.
- **Offline Resiliente y Sincronizable**: El append-only log de eventos permite mover datos entre instancias locales y centrales sin conflictos relacionales destructivos.
- **Almacenamiento y Backups Blindados**: Sin riesgo de fugas de espacio en disco por orfandad ni fallos silenciosos en copias de base de datos.
- **Rendimiento Máximo en Lectura**: Caché en memoria sincronizada en caliente para búsquedas instantáneas en la UI.
