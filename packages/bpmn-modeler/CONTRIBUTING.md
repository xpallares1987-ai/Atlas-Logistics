# Contributing to BPMN-Modeler

Gracias por tu interés en contribuir a **BPMN-Modeler**. Este repositorio es un proyecto **100% independiente** dentro del ecosistema **Control Tower**.

## Proceso de Desarrollo

### 1. Preparación del Entorno

- Asegúrate de usar **Node.js v20** y **pnpm v10**.
- Clona el repositorio e instala las dependencias:
  ```bash
  pnpm install
  ```

### 2. Creación de Ramas

- Usa nombres descriptivos para tus ramas:
  - `feat/nombre-funcionalidad`
  - `fix/bug-fix`
  - `docs/update-documentation`

### 3. Estándares de Código

- **TypeScript:** Mantener tipado estricto. Evitar `any`.
- **Linting & Formatting:** Ejecutamos `eslint` y `prettier`. Se recomienda tener los plugins instalados en tu IDE.
- **Pre-commit:** Usamos `husky` para validar el mensaje de commit y ejecutar `lint-staged` sobre los archivos modificados.

### 4. Commits Convencionales

Obligatorio seguir el formato [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat(ui): añadir panel de propiedades para Zeebe"
git commit -m "fix(worker): corregir parseo de XML con namespaces"
```

### 5. Pruebas

Cualquier cambio significativo debe incluir pruebas:

- **Unitarias:** Localizadas en `src/**/*.test.ts`. Ejecutar con `pnpm run test`.
- **E2E:** Localizadas en `tests/e2e/`. Ejecutar con `pnpm run test:e2e`.

## Flujo de Trabajo (Pull Request)

1. Crea una rama desde `main`.
2. Realiza tus cambios y asegúrate de que todos los tests pasen.
3. Abre un Pull Request describiendo detalladamente los cambios.
4. Una vez aprobado por el equipo de Control Tower, se fusionará en `main`.

## Licencia

Al contribuir, aceptas que tu código será licenciado bajo la licencia **MIT** del proyecto.
