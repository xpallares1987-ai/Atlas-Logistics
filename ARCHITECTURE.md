# Arquitectura de Atlas Logistics

Este documento describe la topología y decisiones de diseño técnico detrás de Atlas Logistics, con el fin de guiar a nuevos desarrolladores y a los asistentes de inteligencia artificial.

## 1. Topología del Monorepo (Turborepo)
Atlas es una "Súper-App" que engloba varios módulos históricamente separados. Turborepo nos permite paralelizar el build y linting (`pnpm run build`) almacenando en caché los resultados.
- El anfitrión principal (`Host App`) está en `@atlas/frontend`. Este paquete importa y sirve a los demás (`dashboard`, `freight-comparer`, `bpmn-modeler`) mediante React Router.
- Las dependencias y versiones (como React 18, Tailwind, Lucide) se comparten centralizadamente.

## 2. Bases de Datos (Cloud SQL + DataConnect)
Hemos adoptado **Firebase Data Connect** como capa GraphQL fuertemente tipada sobre un clúster de **Google Cloud SQL (PostgreSQL)**.
- **Esquema Único:** Todo el diseño de datos (Usuarios, Cotizaciones, Envíos, Facturas) vive en `dataconnect/schema/schema.gql`.
- **Tipado Fuerte:** Al compilar el esquema, se generan SDKs en `src/dataconnect-generated/` que ofrecen hooks y funciones listas para usar en el frontend sin tener que escribir consultas SQL directas ni fetchers inseguros.

## 3. Orquestación de Procesos Logísticos (Camunda 8)
La logística moderna requiere flujos de trabajo resilientes. Hemos integrado **Camunda 8 (Zeebe)** para gestionar los *pipelines* de aduanas, cotizaciones y movimientos.
- **Frontend Modeler:** Los operadores pueden dibujar los flujos BPMN 2.0 en `@atlas/bpmn-modeler`.
- **Despliegue Serverless:** Al hacer clic en "Desplegar", se invoca una Firebase Cloud Function (`deployBPMN`) que usa el token OAuth de Camunda para inyectar el XML en el Zeebe Engine (SaaS).
- **Ejecución (Workers):** El backend de Node ejecuta workers en `functions/src/workers.ts` que se suscriben a tareas específicas (ej. `validate-customs`) para actuar como puentes entre el mundo digital y los estados del BPMN.

## 4. IA Predictiva (Gemini)
El módulo SCM no es reactivo, es predictivo.
- Empleamos **Google Gen AI (Gemini 2.5 Flash)** en el backend (`functions/src/gemini.ts`) para estimaciones. 
- Acepta objetos JSON complejos de embarques e inclemencias externas para emitir un cálculo de "Riesgo" y ajustar el Tiempo Estimado de Llegada (ETA).

## 5. Diseño Visual y UI
La directriz fundamental del diseño es **Premium Dark Glassmorphism**.
Todas las interfaces deben adherirse a esta estética:
- Uso extensivo de fondos translúcidos (`bg-white/5` a `bg-white/10`).
- Desenfoques de fondo (`backdrop-blur-xl` a `backdrop-blur-3xl`).
- Contornos suaves y brillantes (`border border-white/10` o `ring-white/10`).
- Textos y tipografías nítidas (`text-white`, `text-slate-300`).
- Micro-interacciones (fades, rebotes suaves al hacer hover).
