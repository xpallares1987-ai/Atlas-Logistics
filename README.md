# Atlas Logistics (SCM MVP)

[![CI](https://github.com/xpallares1987-ai/Atlas-Logistics/actions/workflows/ci.yml/badge.svg)](https://github.com/xpallares1987-ai/Atlas-Logistics/actions/workflows/ci.yml)

Sistema de gestión de cadena de suministro (SCM) y Freight Forwarding MVP. Este proyecto integra orquestación de procesos mediante **Zeebe (Camunda 8)**, persistencia robusta con **Drizzle ORM** y una arquitectura de alto rendimiento basada en **Fastify**.

## Características Principales

- **Orquestación de Procesos:** Integración nativa con Zeebe para el flujo de trabajo de carga.
- **Arquitectura Async:** Backend de alto rendimiento construido sobre Fastify.
- **Persistencia Type-Safe:** Uso de Drizzle ORM para consultas SQL seguras y eficientes.
- **Frontend Interactivo:** Interfaz basada en Vite con soporte de modelado BPMN integrado.
- **Infraestructura Dockerizada:** Entorno completo con PostgreSQL y Redis mediante Docker Compose.
- **Mantenimiento Automatizado:** Scripts integrados para la poda automatizada de logs de auditoría antiguos (mayores de 90 días) para mantener un alto rendimiento de consultas.

## Stack Tecnológico

- **Backend:** Fastify (TypeScript), Zod.
- **Frontend:** Vite, bpmn-js.
- **ORM:** Drizzle ORM (PostgreSQL).
- **Cache:** Redis (ioredis).
- **Orquestación:** Zeebe (zeebe-node).
- **Testing:** Vitest.
- **Gestor de Paquetes:** pnpm v10.

## Guía de Inicio

### Requisitos

- **Node.js:** v20+ (LTS).
- **pnpm:** v10+.
- **Docker & Docker Compose:** Para servicios de base de datos y cache.

### Instalación

```bash
pnpm install
```

### Infraestructura

Levanta los servicios necesarios:

```bash
docker-compose up -d
```

### Desarrollo

```bash
pnpm run dev
```

## Mantenimiento

Este repositorio es un proyecto independiente dentro del ecosistema **Control Tower** y sigue los estándares definidos en `Source/GEMINI.md`.

### Comandos de Calidad

```bash
pnpm run lint          # Verificación de tipos y estilo (ESLint)
pnpm run test          # Ejecución de pruebas unitarias
pnpm run build         # Compilación de frontend y backend
pnpm run db:clean-logs # Mantenimiento: Poda de logs de auditoría antiguos (90 días)
```

## Visión 2027: Resiliencia SCM
El proyecto escala hacia una arquitectura con JWT, documentación OpenAPI automática y balanceo dinámico de workers Zeebe. Consulta el [Roadmap Maestro](../ROADMAP.md) para más detalles.

## Licencia

MIT – Parte del ecosistema **Control Tower**.
