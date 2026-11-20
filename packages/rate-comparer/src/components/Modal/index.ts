/**
 * @file index.ts
 * @description Canonical barrel for semantic modal components in `@atlas/rate-comparer`.
 * @module @atlas/rate-comparer/components/Modal
 * @see {@link docs/adr/0020-modular-frontend-decomposition-and-naming-standards.md}
 */

export {
  default as ColumnMapper,
  default as ColumnMapperModal,
} from "./ColumnMapper";
export {
  default as DrayageRoute,
  default as DrayageRouteModal,
  type DrayageRouteModalProps,
} from "./DrayageRoute";
export {
  default as RfqGenerator,
  default as RfqGeneratorModal,
} from "./RfqGenerator";
