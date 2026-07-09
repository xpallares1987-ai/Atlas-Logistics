# Contributing to Atlas Logistics

¡Gracias por tu interés en contribuir a Atlas Logistics! Al ser un proyecto de tipo monorepo (Turborepo) con integraciones complejas de base de datos e IA, hemos establecido las siguientes pautas para asegurar la estabilidad del proyecto.

## Flujo de Trabajo (Git Flow)

1. **Ramificación**: Crea una rama a partir de `main` siguiendo la nomenclatura `tipo/descripcion-corta` (ej. `feat/gemini-integration`, `fix/camunda-worker`).
2. **Commits**: Utilizamos `commitlint`. Asegúrate de que tus mensajes sigan las [Conventional Commits](https://www.conventionalcommits.org/). Por ejemplo: `feat(dashboard): add predictive ETA badge`.
3. **Pull Requests**: Abre la PR contra `main`. Tu PR debe pasar todos los tests y el linter (`pnpm run lint`) en el pipeline de GitHub Actions.

## Desarrollo en el Monorepo

Al trabajar en un paquete específico (por ejemplo, el UI), **NO** instales dependencias navegando al directorio del paquete. Utiliza siempre `pnpm` desde la raíz con el flag `--filter`:

```bash
# Añadir una dependencia solo a un paquete:
pnpm add lucide-react --filter @atlas/ui
```

### Reglas de Modificación de Base de Datos
- La base de datos es gestionada por **Firebase Data Connect** hacia Google Cloud SQL.
- Si necesitas alterar tablas, edita los archivos `.gql` en la carpeta `dataconnect/schema/`.
- Tras realizar cambios, DEBES regenerar el SDK de cliente para que TypeScript atrape los errores:
  ```bash
  npx firebase dataconnect:sdk:generate
  ```
- **Prohibido**: No edites manualmente ningún archivo dentro de las carpetas `dataconnect-generated`.

## Estilo y Diseño Visual
- Atlas Logistics utiliza un estilo riguroso de **Dark Premium Glassmorphism**.
- Por favor, utiliza los tokens CSS globales definidos en `packages/ui/src/index.css`. No abuses de colores arbitrarios; confía en los fondos semitransparentes, los bordes sutiles y los efectos de desenfoque (`backdrop-blur`).
