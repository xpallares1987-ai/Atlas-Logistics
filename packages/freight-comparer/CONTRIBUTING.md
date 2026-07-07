# Contributing to Freight-Comparer

Gracias por tu interés en mejorar **Freight-Comparer**. Este repositorio es un proyecto **100% independiente** dentro del ecosistema **Control Tower**.

## Proceso de Desarrollo

### 1. Entorno Local

- Requiere **Node.js v20** y **pnpm v10**.
- Clona e instala:
  ```bash
  pnpm install
  ```

### 2. Flujo de Git

- Crea una rama descriptiva: `feat/mi-mejora` o `fix/correccion-bi`.
- Mantén tus commits pequeños y enfocados.

### 3. Commits Convencionales

Es obligatorio seguir la especificación de **Conventional Commits**:

- `feat(ui): añadir gráfico de barras D3 para rutas`
- `fix(api): corregir error de timeout en Gemini`
- `chore(deps): actualizar dependencias de seguridad`

### 4. Estándares Técnicos

- **TypeScript:** Tipado estricto. No se permite el uso de `any` sin justificación extrema.
- **TailwindCSS:** Usa las clases de utilidad siguiendo los componentes predefinidos para mantener consistencia visual.
- **Seguridad:** **NUNCA** incluyas claves de API o archivos `.env` en tus commits.

### 5. Validación

- Ejecuta `pnpm run lint` para verificar el estilo.
- Ejecuta `pnpm run test` para asegurar que no hay regresiones.
- Husky ejecutará automáticamente validaciones ligeras en cada commit.

## Pull Requests

1. Sincroniza tu rama con `main` antes de enviar.
2. Proporciona una descripción clara de qué cambia y por qué.
3. Adjunta capturas de pantalla si hay cambios visuales en el dashboard.

## Licencia

Al contribuir, aceptas que tu código sea licenciado bajo la licencia **MIT**.
