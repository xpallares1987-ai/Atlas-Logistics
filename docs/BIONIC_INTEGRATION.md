# Guía Práctica de Integración: Bionic GPT + Atlas Logistics

Esta guía proporciona **plantillas de prompts y mejores prácticas** para interactuar con tu modelo de IA local (a través de Bionic GPT) en el desarrollo diario de **Atlas Logistics**.

---

## 1. Reglas de Contexto para Bionic

Al iniciar una sesión de trabajo con Bionic en este repositorio, proporciona primero este breve contexto inicial o asegúrate de que tenga acceso al archivo `.github/copilot-instructions.md`:

```text
Actúa como un desarrollador Senior especializado en Node 20, TypeScript, pnpm workspaces, React (Vite/PWA), PostgreSQL y Camunda 8 (Zeebe).
El repositorio actual es "Atlas Logistics". Sigue estas reglas estrictas:
1. Utiliza TypeScript estricto con validación de runtime usando Zod.
2. Los Workers de Zeebe usan `zeebe-node` directamente.
3. Respeta la estructura del monorepo pnpm (@atlas/frontend, @atlas/dashboard, @atlas/ui, @atlas/shared).
```

---

## 2. Plantillas de Prompts Listas para Usar

### 📄 Plantilla 1: Crear un Worker de Camunda Zeebe
Use esta plantilla para pedirle a Bionic que genere la implementación en TypeScript de un worker de proceso.

```text
Por favor, genera un Worker de Zeebe en TypeScript para el proceso BPMN de Camunda.
- Archivo BPMN objetivo: camunda-config/core/billing-choreography.bpmn
- Tipo de tarea (Job Type): "atlas.invoice.generate"
- Variables de entrada esperadas: shipmentId (string), customerId (string), totalAmount (number).
- Salida requerida: invoiceId (string), generatedAt (string ISO).
- Manejo de errores: Si totalAmount <= 0, debe lanzar un BPMError("INVALID_AMOUNT", "El monto debe ser mayor a 0").
Usa la sintaxis directa de `zeebe-node` compatible con `src/bpm/client.ts`.
```

---

### 🛡️ Plantilla 2: Schema de Zod y Tipos Compartidos (`@atlas/shared`)
Use esta plantilla para definir contratos de datos entre frontend y backend.

```text
Crea un esquema de Zod y exporta su tipo inferido de TypeScript para la entidad "ShipmentBooking".
Campos requeridos:
- id: UUID string
- originPort: string de 5 caracteres (UN/LOCODE, ej. ESBCN)
- destinationPort: string de 5 caracteres (UN/LOCODE, ej. USNYC)
- containerType: enum ("20GP", "40GP", "40HC", "45HC")
- weightKg: número positivo
- isDangerousGoods: boolean
- estimatedDeparture: string fecha válida ISO
Usa la librería `zod` y exporta la interfaz inferida `export type ShipmentBooking = z.infer<typeof shipmentBookingSchema>;`.
```

---

### 🧪 Plantilla 3: Generar Test Unitario en Vitest
Use esta plantilla para probar lógica pura en paquetes como `@atlas/rate-comparer` o `@atlas/shared`.

```text
Genera un archivo de test unitario en Vitest para la función `calculateFreightRate`.
La función recibe (origin, destination, weightKg, containerType) y retorna la tarifa total calculada.
Crea 4 casos de prueba:
1. Cálculo exitoso estándar para puerto ESBCN -> USNYC.
2. Recargo por contenedor de 40HC (+20%).
3. Recargo por carga peligrosa (+35%).
4. Error cuando el peso supera los 30,000 kg.
Usa las funciones `describe`, `it`, `expect` de `vitest`.
```

---

### 🎨 Plantilla 4: Componente React + Tailwind para `@atlas/ui`
Use esta plantilla para crear o refactorizar componentes visuales PWA.

```text
Crea un componente React funcional en TypeScript para la app PWA (`@atlas/ui`).
El componente se llamará `ShipmentStatusBadge`.
Props:
- status: "DRAFT" | "CONFIRMED" | "IN_TRANSIT" | "CUSTOMS_HOLD" | "DELIVERED" | "CANCELLED"
- showPulse: boolean opcional (por defecto true)
Requisitos:
- Usa estilos de Tailwind CSS con colores armoniosos e intensos (p. ej. emerald para DELIVERED, amber para CUSTOMS_HOLD, blue para IN_TRANSIT, rose para CANCELLED).
- Incluye un micro-indicador parpadeante (ping animation) si `showPulse` es verdadero.
- Accesible (roles ARIA adecuados).
```

---

## 3. Verificación Rápida Post-Generación

Después de copiar el código generado por Bionic a tu repositorio local, ejecuta estos comandos rápidos desde la terminal para verificar tipos y build sin errores:

```powershell
# 1. Verificar tipos en todo el proyecto
pnpm run type-check

# 2. Probar compilación del paquete afectado (ejemplo: frontend)
pnpm --filter @atlas/frontend build
```
