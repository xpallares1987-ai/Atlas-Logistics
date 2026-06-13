# Atlas Logistics - Especificaciones Técnicas

Este documento define la arquitectura y estándares específicos para el proyecto `Atlas-Logistics`.

## Objetivos del Proyecto
- MVP para SCM funcional con orquestación de procesos Zeebe.
- Persistencia optimizada y segura.

## Stack Tecnológico
- **Node.js 20 / pnpm v10**.
- **Fastify + Zod**: API Type-safe.
- **Drizzle ORM**: PostgreSQL.
- **bpmn-js**: Visualización de procesos en frontend.

## Roadmap de Mejora
Este repositorio sigue el plan de 20 puntos detallado en el [Roadmap Maestro](../ROADMAP.md).

## Comandos Críticos
- `pnpm run db:generate`: Generar migraciones Drizzle.
- `pnpm run db:push`: Empujar cambios de esquema a base de datos de desarrollo.
