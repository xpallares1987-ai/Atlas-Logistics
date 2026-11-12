# Especificación de Bounded Context: External Data Governance and Licensing

> **Cuadrante Diátaxis**: Referencia y Especificación Técnica (`docs/superpowers/specs/`)  
> **ADR Vinculante**: [ADR 0021: Bounded Context de Gobierno de Datos Externos, Licenciamiento y Procedencia](../../adr/0021-external-data-governance-and-licensing.md)  
> **Estado**: Aprobado para Implementación  

---

## 1. Resumen Ejecutivo y Alcance

El bounded context **External Data Governance and Licensing** proporciona a la plataforma Atlas Logistics una infraestructura formal para catalogar, auditar, evaluar y verificar los derechos de uso, términos de servicio y licencias de propiedad intelectual de todas las fuentes de datos y registros externos incorporados en los flujos operativos.

### Objetivos Clave
1. **Procedencia Inmutable**: Registrar el linaje completo desde el proveedor original hasta el registro interno vinculado.
2. **Evaluación de Licencias por Finalidad**: Evaluar si un uso pretendido (`INGESTION`, `COMMERCIAL_USE`, `AI_RAG_USE`, etc.) es lícito conforme a la licencia del dataset y las condiciones contractuales.
3. **Generación Determinista de Atribución**: Producir las cadenas de atribución requeridas por licencias como `CC-BY-4.0` u `ODbL-1.0`, incluyendo avisos de modificación.
4. **Metodología Zero-Cost & Offline**: Maximizar la eficiencia de SQLite en modo WAL con claves foráneas, diccionarios en memoria y el patrón puntero (cero binarios en base de datos).
5. **Aislamiento Multi-Tenant y Seguridad**: Garantizar que las evidencias, acuerdos y sobreescrituras respeten la frontera de la organización y el rol `COMPLIANCE_OFFICER`.

---

## 2. Catálogos y Códigos Normalizados

### 2.1 Códigos de Licencia Canónicos

| Código | URL Canónica | Atribución Requerida | Share-Alike | Uso Comercial |
| :--- | :--- | :---: | :---: | :---: |
| `CC0-1.0` | `https://creativecommons.org/publicdomain/zero/1.0/` | No | No | Sí |
| `CC-BY-4.0` | `https://creativecommons.org/licenses/by/4.0/` | Sí (`ATTR_REQUIRED`) | No | Sí |
| `CC-BY-SA-4.0` | `https://creativecommons.org/licenses/by-sa/4.0/` | Sí (`ATTR_REQUIRED`) | Sí | Sí |
| `ODbL-1.0` | `https://opendatacommons.org/licenses/odbl/1-0/` | Sí (`ATTR_REQUIRED`) | Sí (en DB derivada) | Sí |
| `ODC-BY-1.0` | `https://opendatacommons.org/licenses/by/1-0/` | Sí (`ATTR_REQUIRED`) | No | Sí |
| `ISNI-INFORMATION-LICENCE` | `https://isni.org/page/isni-information-licence/` | Sí | No | Condicional |
| `PROPRIETARY-TERMS` | *(URL de términos del proveedor)* | Contractual | No | Contractual |
| `CONTRACTUAL` | *(URL de contrato o SLA)* | Contractual | No | Contractual |
| `PROVIDER-SPECIFIC` | *(URL de términos específicos)* | Dependiente | Dependiente | Dependiente |
| `UNKNOWN` | *(Sin URL verificada)* | Indeterminado | Indeterminado | **Bloqueado** |

> [!CAUTION]
> No utilizar estados de evaluación (`PASS`, `BLOCKED`, `PER_RECORD`, `BY_RELEASE`, `LEGAL_REVIEW_REQUIRED`) como códigos de licencia.

### 2.2 Alcances de Licencia (`LicenceScope`)
- `DATASET`: Aplica a todo el conjunto de datos de forma uniforme.
- `DATABASE`: Aplica a la estructura de la base de datos (relevante en ODbL).
- `METADATA`: Aplica exclusivamente a los metadatos descriptivos.
- `CONTENT`: Aplica a contenidos textuales, descripciones o fichas.
- `MEDIA`: Aplica a fotografías, mapas vectoriales o recursos binarios.
- `RECORD`: Aplica a nivel de registro individual (requiere `record_licence_code`).
- `SERVICE`: Aplica a las condiciones de uso de la API o endpoint.
- `API`: Limitaciones específicas del método de transporte o interfaz.
- `RELEASE`: Limitado a una versión o volcado temporal específico.
- `MODULE`: Aplica a un submódulo de datos específico.
- `SCOPE_DEPENDENT`: Varía según la sección o payload consultado.

### 2.3 Políticas de Atribución (`AttributionPolicy`)
- `ATTR_REQUIRED`: Atribución legalmente obligatoria.
- `ATTR_RECOMMENDED`: Atribución voluntaria o por cortesía académica/comunitaria.
- `ATTR_NOT_REQUIRED`: Dominio público o renuncia expresa de derechos (`CC0-1.0`).
- `ATTR_PER_RECORD`: Debe resolverse con los datos particulares de cada registro.
- `ATTR_CONTRACTUAL`: Definida en el contrato bilateral o acuerdo de servicio.
- `ATTR_UNDETERMINED`: Política aún no establecida (actúa como bloqueante).

### 2.4 Finalidades Evaluadas (`EvaluationPurpose`)
- `INGESTION`: Captura e ingesta en la base de datos local para análisis.
- `INTERNAL_USE`: Procesamiento interno en motores de cálculo, ruteo y costos.
- `COMMERCIAL_USE`: Utilización en cotizaciones comerciales y facturación a clientes.
- `PUBLICATION`: Publicación abierta en portales públicos de seguimiento o dashboards de acceso abierto.
- `REDISTRIBUTION`: Reenvío o compartición de los datos crudos a terceros.
- `DERIVATIVE_DATASET`: Creación de un dataset enriquecido o base de datos derivada.
- `AI_RAG_USE`: Indexación en embeddings o consumo por agentes de lenguaje e inteligencia artificial.
- `API_EXPORT`: Exportación de los datos a través de endpoints REST públicos hacia socios B2B.
- `REPORT_EXPORT`: Generación de informes en PDF, Excel o CSV para usuarios externos.
- `MEDIA_DISPLAY`: Renderizado visual de imágenes, logos o capas cartográficas en la UI.

### 2.5 Estados Finales de Evaluación
- `PASS`: Cumplimiento total verificado.
- `BLOCKED`: Incumplimiento o términos no verificados que impiden el uso.

Detalle del Resultado (`ResultDetail`):
- `ALL_RULES_VALID`: Todas las reglas pasaron sin observaciones.
- `PASS_WITH_WARNINGS`: Cumplimiento válido pero con advertencias no bloqueantes.
- `VALIDATION_FAILED`: Fallaron una o más reglas estructurales o de licencia.
- `MANUAL_REVIEW_REQUIRED`: Se requiere intervención de un oficial de cumplimiento.
- `RIGHTS_UNVERIFIED`: Los derechos o términos no han sido formalmente verificados.
- `CONFLICTING_TERMS`: Conflicto entre la licencia declarada y la finalidad pretendida.

---

## 3. Especificación del Modelo de Datos (Drizzle SQLite)

Persistencia modular en `src/db/schema/external_governance.ts` con claves foráneas activas y modo WAL:

### 3.1 `licence_definitions`
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :---: | :--- |
| `code` | `text` | NO | PK canónica (ej. `CC-BY-4.0`, `ODbL-1.0`). |
| `canonical_name` | `text` | NO | Nombre legal completo de la licencia. |
| `canonical_url` | `text` | NO | URL inmutable de los términos oficiales. |
| `licence_scope` | `text` | NO | Alcance por defecto (`DATASET`, `METADATA`, etc.). |
| `attribution_requirement` | `text` | NO | `ATTR_REQUIRED`, `ATTR_NOT_REQUIRED`, etc. |
| `share_alike` | `integer(boolean)` | NO | Si exige compartir bajo la misma licencia. |
| `commercial_use_allowed` | `integer(boolean)` | NO | Si permite explotación comercial directa. |
| `derivative_allowed` | `integer(boolean)` | NO | Si permite obras derivadas o modificaciones. |
| `...commonAuditFields` | `mixed` | NO | `createdAt`, `updatedAt`, `isDeleted`, etc. |

### 3.2 `data_sources`
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :---: | :--- |
| `id` | `text` | NO | PK UUID (`src_...`). |
| `code` | `text` | NO | Código mnemotécnico único (ej. `OPENSTREETMAP`, `UNLOCODE`). |
| `name` | `text` | NO | Razón social o denominación institucional. |
| `organization_id` | `text` | NO | FK a `companies.id` (Aislamiento de Tenant). |
| `website_url` | `text` | NO | Portal oficial de la entidad. |
| `provider_terms_url` | `text` | SÍ | URL de Términos de Servicio generales. |
| `documentation_url` | `text` | SÍ | URL de documentación técnica o API. |
| `...commonAuditFields` | `mixed` | NO | Campos estándar de auditoría. |

### 3.3 `source_datasets`
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :---: | :--- |
| `id` | `text` | NO | PK UUID (`ds_...`). |
| `source_id` | `text` | NO | FK a `data_sources.id`. |
| `code` | `text` | NO | Identificador interno del dataset (`OSM_NOMINATIM_GEO`, `UNECE_UNLOCODE_CSV`). |
| `name` | `text` | NO | Nombre del dataset. |
| `description` | `text` | SÍ | Descripción del contenido y propósito. |
| `default_scope` | `text` | NO | Alcance por defecto (`DATASET`, `METADATA`). |
| `default_licence_code` | `text` | NO | FK a `licence_definitions.code`. |
| `default_attribution_policy`| `text` | NO | `AttributionPolicy` por defecto. |
| `...commonAuditFields` | `mixed` | NO | Campos estándar de auditoría. |

### 3.4 `dataset_releases`
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :---: | :--- |
| `id` | `text` | NO | PK UUID (`rel_...`). |
| `dataset_id` | `text` | NO | FK a `source_datasets.id`. |
| `release_version` | `text` | NO | Versión o fecha del volcado (ej. `2026-1`, `v2.4.0`). |
| `release_date` | `integer(timestamp)` | SÍ | Fecha de publicación original por el proveedor. |
| `release_url` | `text` | SÍ | Enlace de descarga o volcado del release. |
| `licence_code` | `text` | NO | FK a `licence_definitions.code` aplicable al release. |
| `record_rights_url` | `text` | SÍ | URL donde se certifican los derechos específicos. |
| `rights_checked_at` | `integer(timestamp)` | NO | Fecha de última verificación legal. |
| `is_current` | `integer(boolean)` | NO | Si es la versión activa utilizada. |
| `...commonAuditFields` | `mixed` | NO | Campos estándar de auditoría. |

### 3.5 `access_methods`
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :---: | :--- |
| `id` | `text` | NO | PK UUID (`am_...`). |
| `dataset_id` | `text` | NO | FK a `source_datasets.id`. |
| `method_type` | `text` | NO | `REST_API`, `BULK_DOWNLOAD`, `SPARQL`, `DUMP`, `OAI_PMH`. |
| `endpoint_url` | `text` | NO | URL base de conexión. |
| `auth_type` | `text` | NO | `NONE`, `API_KEY`, `OAUTH2`, `BEARER`. |
| `rate_limit_notes` | `text` | SÍ | Políticas de consumo (ej. `1 req/sec, User-Agent obligatorio`). |
| `...commonAuditFields` | `mixed` | NO | Campos estándar de auditoría. |

### 3.6 `source_records`
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :---: | :--- |
| `id` | `text` | NO | PK UUID (`rec_...`). |
| `release_id` | `text` | NO | FK a `dataset_releases.id`. |
| `source_record_id` | `text` | NO | ID en el sistema origen (ej. `ESBCN` en UN/LOCODE, `node/123456` en OSM). |
| `source_url` | `text` | SÍ | Enlace directo al registro original. |
| `original_payload` | `text(json)` | NO | Payload crudo parseado como JSON (Zero BLOBs). |
| `normalized_payload` | `text(json)` | SÍ | Entidad canónica normalizada para Atlas. |
| `retrieved_at` | `integer(timestamp)` | NO | Marca de tiempo de la extracción. |
| `record_licence_code` | `text` | SÍ | FK a `licence_definitions.code` si difiere del dataset. |
| `record_rights_url` | `text` | SÍ | Enlace de derechos específico para este objeto/registro. |
| `...commonAuditFields` | `mixed` | NO | Campos estándar de auditoría. |

### 3.7 `entity_source_links`
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :---: | :--- |
| `id` | `text` | NO | PK UUID (`esl_...`). |
| `internal_entity_type`| `text` | NO | `LOCATION`, `VESSEL`, `CARRIER`, `PARTY`, `PORT`. |
| `internal_entity_id` | `text` | NO | UUID de la entidad en Atlas Logistics. |
| `source_record_id` | `text` | NO | FK a `source_records.id`. |
| `authority_confidence`| `real` | NO | Puntuación de confianza (0.0 a 1.0). |
| `verified_at` | `integer(timestamp)` | NO | Fecha de validación por analista o algoritmo. |
| `verified_by_user_id`| `text` | SÍ | Usuario que validó el enlace. |
| `...commonAuditFields` | `mixed` | NO | Campos estándar de auditoría. |

### 3.8 `provenance_events`
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :---: | :--- |
| `id` | `text` | NO | PK UUID (`prv_...`). |
| `source_record_id` | `text` | NO | FK a `source_records.id`. |
| `event_type` | `text` | NO | `INGESTION`, `TRANSFORMATION`, `VERIFICATION`, `ENRICHMENT`. |
| `transformation_code`| `text` | SÍ | Identificador del algoritmo o worker (ej. `TRF_GEO_NORM_V1`). |
| `transformation_description` | `text` | SÍ | Explicación legible del cambio aplicado. |
| `actor_id` | `text` | NO | Usuario o servicio ejecutor. |
| `evidence_url` | `text` | SÍ | Puntero a archivo de evidencia o snapshot (`file:///...` o URL). |
| `...commonAuditFields` | `mixed` | NO | Campos estándar de auditoría. |

### 3.9 `compliance_assessments`
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :---: | :--- |
| `id` | `text` | NO | PK UUID (`asm_...`). |
| `entity_link_id` | `text` | SÍ | FK a `entity_source_links.id` (opcional). |
| `source_record_id` | `text` | SÍ | FK a `source_records.id` (opcional). |
| `dataset_id` | `text` | SÍ | FK a `source_datasets.id` (opcional). |
| `evaluated_purpose` | `text` | NO | `EvaluationPurpose` (`COMMERCIAL_USE`, `AI_RAG_USE`, etc.). |
| `final_status` | `text` | NO | `PASS` o `BLOCKED`. |
| `result_detail` | `text` | NO | `ALL_RULES_VALID`, `PASS_WITH_WARNINGS`, `VALIDATION_FAILED`, etc. |
| `blocking_reasons` | `text(json)` | NO | Array de strings con todos los motivos de bloqueo. |
| `warnings` | `text(json)` | NO | Array de strings con avisos informativos. |
| `evaluated_at` | `integer(timestamp)` | NO | Marca temporal de la ejecución de reglas. |
| `...commonAuditFields` | `mixed` | NO | Campos estándar de auditoría. |

### 3.10 `validation_results`
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :---: | :--- |
| `id` | `text` | NO | PK UUID (`val_...`). |
| `assessment_id` | `text` | NO | FK a `compliance_assessments.id`. |
| `rule_code` | `text` | NO | Código de regla (`VAL-001`, `ATTR-003`, etc.). |
| `severity` | `text` | NO | `BLOCKING`, `WARNING`, `INFO`. |
| `is_blocking` | `integer(boolean)` | NO | Flag determinista de bloqueo. |
| `evaluated_field` | `text` | SÍ | Campo sobre el que se aplicó la aserción. |
| `message` | `text` | NO | Explicación del hallazgo. |
| `proposed_fix` | `text` | SÍ | Corrección requerida para resolver el bloqueo. |
| `...commonAuditFields` | `mixed` | NO | Campos estándar de auditoría. |

### 3.11 `manual_reviews`
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :---: | :--- |
| `id` | `text` | NO | PK UUID (`rev_...`). |
| `assessment_id` | `text` | NO | FK a `compliance_assessments.id`. |
| `reviewer_user_id` | `text` | NO | FK a `users.id` (debe ser `COMPLIANCE_OFFICER` o `ADMIN`). |
| `review_status` | `text` | NO | `APPROVED` (override de bloqueo) o `REJECTED`. |
| `justification` | `text` | NO | Fundamento legal y operativo de la resolución. |
| `evidence_url` | `text` | NO | Enlace verificable a dictamen, acuerdo o licencia firmada. |
| `reviewed_at` | `integer(timestamp)` | NO | Momento de la resolución. |
| `...commonAuditFields` | `mixed` | NO | Campos estándar de auditoría. |

---

## 4. Reglas Automáticas de Cumplimiento

### 4.1 Reglas Estructurales

| Código | Identificador | Severidad | Bloqueante | Condición Evaluada | Corrección Propuesta |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `VAL-001` | `SOURCE_MISSING` | `BLOCKING` | SÍ | Proveedor externo no definido o no registrado en catálogo. | Registrar y asociar un `data_source` válido. |
| `VAL-002` | `LICENSE_MISSING` | `BLOCKING` | SÍ | Ni el registro, ni el release, ni el dataset especifican licencia. | Declarar código de licencia canónico aplicable. |
| `VAL-003` | `LICENSE_CODE_INVALID`| `BLOCKING` | SÍ | El código de licencia no coincide con el catálogo canónico. | Corregir el identificador a un código estándar. |
| `VAL-004` | `INVALID_LICENSE_SEMANTICS` | `BLOCKING` | SÍ | Se usó un estado (`PASS`, `BLOCKED`) como código de licencia. | Reemplazar por la licencia real del dataset. |
| `VAL-005` | `URL_MALFORMED` | `BLOCKING` | SÍ | Alguna URL (`license_url`, `source_url`, etc.) no es un URI RFC 3986 válido. | Corregir sintaxis y protocolo de la URL. |
| `VAL-006` | `LICENSE_URL_UNVERIFIED` | `BLOCKING` | SÍ | La URL de la licencia no apunta al texto canónico oficial. | Actualizar al URI canónico oficial de la licencia. |
| `VAL-007` | `PROVIDER_TERMS_MISSING` | `WARNING` | NO | No se registró la URL de términos de servicio del proveedor. | Registrar la URL de Términos de Servicio de la fuente. |
| `VAL-008` | `RETRIEVAL_DATE_MISSING` | `BLOCKING` | SÍ | `retrieved_at` es nulo o inválido en el registro. | Sellar fecha y hora ISO-8601 de extracción. |
| `VAL-009` | `RIGHTS_DATE_INCONSISTENT`| `BLOCKING` | SÍ | `rights_checked_at` es posterior a la fecha actual o anterior a la release. | Corregir marcas temporales de verificación legal. |
| `VAL-010` | `EVIDENCE_INSUFFICIENT` | `BLOCKING` | SÍ | Se intentó una revisión manual u override sin `evidence_url`. | Proporcionar URL o ruta de evidencia obligatoria. |
| `VAL-011` | `RELEASE_MISSING` | `BLOCKING` | SÍ | El dataset opera bajo alcance `BY_RELEASE` y no se indicó release. | Asociar el registro a un `dataset_release` específico. |
| `VAL-012` | `RECORD_RIGHTS_MISSING` | `BLOCKING` | SÍ | El dataset es `PER_RECORD` y el registro no incluye `record_rights_url`. | Suministrar URL de derechos para el registro individual. |
| `VAL-013` | `RELEASE_RIGHTS_MISSING` | `BLOCKING` | SÍ | El release no tiene fecha de verificación de derechos (`rights_checked_at`). | Realizar y sellar la auditoría legal del release. |
| `VAL-014` | `TRANSFORMATION_UNDOCUMENTED`| `WARNING` | NO | Se aplicó normalización sin generar evento de procedencia con `transformation_code`. | Emitir `provenance_event` con código de transformación. |
| `VAL-015` | `RIGHTS_UNVERIFIED` | `BLOCKING` | SÍ | La última verificación de derechos tiene más de 365 días de antigüedad. | Revalidar términos con el proveedor y actualizar `rights_checked_at`. |

### 4.2 Reglas de Atribución

| Código | Identificador | Severidad | Bloqueante | Condición Evaluada | Corrección Propuesta |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `ATTR-001` | `ATTRIBUTION_MISSING` | `BLOCKING` | SÍ | Licencia exige atribución (`ATTR_REQUIRED`) y la cadena generada está vacía. | Generar y almacenar cadena de atribución determinista. |
| `ATTR-002` | `ATTRIBUTED_PARTY_MISSING`| `BLOCKING` | SÍ | No se identifica el autor o titular institucional a reconocer. | Definir titular de los derechos en el dataset o registro. |
| `ATTR-003` | `LICENSE_LINK_MISSING` | `BLOCKING` | SÍ | La atribución requerida omite el hipervínculo canónico a la licencia. | Incluir enlace canónico a la licencia en la atribución. |
| `ATTR-004` | `MODIFICATION_NOTICE_MISSING`| `BLOCKING` | SÍ | Hubo transformaciones en los datos (`provenance_events > 0`) sin aviso de modificación. | Agregar aviso formal de modificaciones (ej. "Modificado por Atlas Logistics"). |
| `ATTR-005` | `ITEM_ATTRIBUTION_UNRESOLVED`| `BLOCKING` | SÍ | Objeto multimedia o texto no pudo resolver atribución individual. | Vincular registro con autoría del recurso multimedia. |
| `ATTR-006` | `ATTRIBUTION_PLACEHOLDER_PRESENT`| `BLOCKING` | SÍ | La cadena contiene comodines o placeholders (ej. `[AUTOR]`, `TODO`). | Sustituir valores ficticios por datos reales. |
| `ATTR-007` | `ATTRIBUTION_TOO_GENERIC` | `WARNING` | NO | La atribución no incluye el título específico del dataset. | Enriquecer la atribución incorporando el nombre del dataset. |
| `ATTR-008` | `ENDORSEMENT_IMPLIED` | `BLOCKING` | SÍ | El texto sugiere patrocinio o aval de la fuente sin autorización. | Reformular para indicar uso de datos independientes sin respaldo. |
| `ATTR-009` | `ATTRIBUTION_NOT_VISIBLE` | `BLOCKING` | SÍ | En finalidades visuales (`MEDIA_DISPLAY`, `REPORT_EXPORT`), el componente no renderiza el badge. | Integrar el badge de atribución en la vista o pie de reporte. |

### 4.3 Reglas Específicas por Licencia

- **`CC0-1.0` (Dominio Público)**:
  - No exige atribución legal obligatoria (`ATTR_NOT_REQUIRED`), pero conserva siempre procedencia y trazabilidad de extracción.
  - La renuncia `CC0` no se propaga a los recursos externos o sitios web que puedan estar enlazados desde los registros.
- **`CC-BY-4.0`**:
  - Exige atribución completa: Autor/Titular + Título + URL de Fuente + URL Canónica de la Licencia.
  - Si los datos fueron normalizados o modificados, es obligatorio incorporar el aviso explícito de cambios.
- **`CC-BY-SA-4.0` (Share-Alike)**:
  - Si la finalidad es `DERIVATIVE_DATASET` o `REDISTRIBUTION`, el evaluador comprueba si la licencia de salida es compatible. Si el consumidor pretende licenciamiento privativo cerrado, el estado es obligatoriamente `BLOCKED`.
- **`ODbL-1.0` (Open Database License)**:
  - Exige atribución a nivel de base de datos.
  - Permite la creación de *Produced Works* (ej. reportes, mapas visualizados, cálculos de rutas) sin forzar la apertura del código fuente, pero prohíbe la redistribución de bases de datos derivadas bajo términos cerrados.
- **Fuentes Contractuales (`CONTRACTUAL`, `PROPRIETARY-TERMS`)**:
  - Requieren la presencia explícita de `provider_terms_url`, número de acuerdo y validación estricta de la lista blanca de finalidades permitidas.

---

## 5. Algoritmo Determinista del Evaluador

```
INICIALIZAR blocking_reasons = []
INICIALIZAR warnings = []

1. Ejecutar Reglas Estructurales (VAL-001 a VAL-015)
   Para cada regla:
     Si falla y es_bloqueante -> blocking_reasons.push(mensaje)
     Si falla y no_es_bloqueante -> warnings.push(mensaje)

2. Validar Compatibilidad de Finalidad
   Si finalidad == 'COMMERCIAL_USE' y licence.commercial_use_allowed == false
     -> blocking_reasons.push("La licencia [código] prohíbe el uso comercial")
   Si finalidad == 'AI_RAG_USE' y licencia contiene restricciones de minería de textos/datos
     -> blocking_reasons.push("La licencia o términos prohíben el entrenamiento o indexación en IA")
   Si finalidad == 'PUBLICATION' y licence.licence_scope == 'INTERNAL_ONLY'
     -> blocking_reasons.push("Los datos están restringidos exclusivamente para uso interno")

3. Ejecutar Reglas de Atribución (ATTR-001 a ATTR-009)
   Si licence.attribution_requirement == 'ATTR_REQUIRED':
     Generar cadena determinista:
       "[Nombre Dataset] © [Titular], disponible bajo licencia [Nombre Licencia] ([URL Canónica]). [Aviso de Cambios]"
     Evaluar completitud y ausencia de placeholders.

4. Comprobar Excepciones / Revisiones Manuales Vigentes
   Si existen blocking_reasons:
     Buscar manual_review para este assessment con review_status == 'APPROVED' y evidence_url válida.
     Si existe -> Mover blocking_reasons a warnings como "Override autorizado por [usuario]".

5. Determinar Estado Final
   IF blocking_reasons.length > 0:
     final_status = "BLOCKED"
     result_detail = (manual_review_needed) ? "MANUAL_REVIEW_REQUIRED" : "VALIDATION_FAILED"
   ELSE IF warnings.length > 0:
     final_status = "PASS"
     result_detail = "PASS_WITH_WARNINGS"
   ELSE:
     final_status = "PASS"
     result_detail = "ALL_RULES_VALID"

RETORNAR { final_status, result_detail, blocking_reasons, warnings, attribution_string }
```

---

## 6. Endpoints de la API Fastify (`/api/external-governance`)

Todos los endpoints exigen autenticación JWT y son tenant-scoped:

1. `GET /api/external-governance/sources`: Listar fuentes con filtros de estado y proveedor.
2. `POST /api/external-governance/sources`: Registrar nuevo proveedor (requiere `COMPLIANCE_OFFICER` o `ADMIN`).
3. `GET /api/external-governance/sources/:id/datasets`: Listar datasets asociados.
4. `POST /api/external-governance/sources/:id/datasets`: Crear dataset con licencia y política de atribución.
5. `POST /api/external-governance/datasets/:id/releases`: Publicar un release o versión de volcado.
6. `GET /api/external-governance/licences`: Consultar catálogo oficial de licencias soportadas.
7. `POST /api/external-governance/assess`: Evaluar un dataset o registro para una finalidad dada. Retorna estado `PASS` / `BLOCKED`, todos los motivos de bloqueo y atribución generada.
8. `GET /api/external-governance/assessments/:id`: Obtener reporte detallado de un assessment previo con el desglose de reglas evaluadas.
9. `POST /api/external-governance/assessments/:id/manual-review`: Resolver y autorizar un override. Requiere rol `COMPLIANCE_OFFICER`, `justification` y `evidence_url` obligatoria.
10. `GET /api/external-governance/records/:id/provenance`: Consultar la cadena completa de eventos de procedencia y transformaciones de un registro.

---

## 7. Eventos Transaccionales (Outbox Bus)

Las mutaciones se escriben atómicamente en `scmOutboxMessages` usando `DomainEventEnvelope<T>`:

- `external_data.source.registered`: Registro de nuevo proveedor externo.
- `external_data.dataset.registered`: Creación de un dataset en el catálogo.
- `external_data.release.registered`: Incorporación de un nuevo release o volcado temporal.
- `external_data.record.ingested`: Ingesta de un registro externo individual con payload crudo y normalizado.
- `external_data.entity_link.created`: Vinculación entre registro externo y entidad interna de Atlas.
- `external_data.compliance.completed`: Evaluación completada exitosamente (`PASS`).
- `external_data.compliance.blocked`: Evaluación bloqueada por reglas incumplidas (`BLOCKED`).
- `external_data.manual_review.requested`: Solicitud de intervención a la mesa de cumplimiento.
- `external_data.manual_review.resolved`: Dictamen de aprobación o rechazo emitido por el oficial.

---

## 8. Arquitectura y Experiencia de Usuario (Frontend PWA)

- **Módulo Principal**: `packages/frontend/src/pages/ExternalDataGovernanceModule.tsx` (<1.000 líneas).
- **Subcomponentes Atómicos**:
  - `SourceCatalogTab.tsx`: Tarjetas de fuentes activas con indicador de salud de términos y documentación.
  - `DatasetDetailTab.tsx`: Árbol de datasets, releases activas y métodos de acceso.
  - `ComplianceMatrixTab.tsx`: Matriz interactiva de finalidades de uso con visualización inmediata de reglas bloqueantes y avisos.
  - `AttributionWorkbenchTab.tsx`: Área de generación y copia rápida de cadenas de atribución en texto plano y HTML.
  - `ProvenanceAuditTab.tsx`: Cronología visual de transformaciones y punteros de evidencia.
  - `modals/ManualReviewModal.tsx`: Diálogo para oficiales de cumplimiento con validación estricta de URL de evidencia.
- **Zero Mocks**: Todos los componentes consumen endpoints reales `/api/external-governance/*` respaldados por Drizzle y SQLite.
