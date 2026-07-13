# Contributing to Atlas Logistics

¡Gracias por tu interés en contribuir a Atlas Logistics! Al ser un proyecto de tipo monorepo (Turborepo) con integraciones complejas de base de datos e IA, hemos establecido las siguientes pautas para asegurar la estabilidad del proyecto.

## Flujo de Trabajo (Git Flow)

1. **Ramificación**: Crea una rama a partir de `main` siguiendo la nomenclatura `tipo/descripcion-corta` (ej. `feat/gemini-integration`, `fix/camunda-worker`).
2. **Commits**: Utilizamos `commitlint`. Asegúrate de que tus mensajes sigan las [Conventional Commits](https://www.conventionalcommits.org/). Por ejemplo: `feat(dashboard): add predictive ETA badge`.
3. **Pull Requests**: Abre la PR contra `main`. Tu PR debe pasar todos los tests y el linter (`pnpm run lint`) en el pipeline de GitHub Actions. **NOTA:** No se aceptarán PRs si el pipeline de Code Scanning (CodeQL o njsscan) reporta vulnerabilidades o alertas abiertas.
4. **Testing**: Recomendamos encarecidamente correr localmente `pnpm run test:e2e` para validar la súper-app mediante **Playwright** antes de hacer push.

## Desarrollo en el Monorepo

Al trabajar en el proyecto unificado, puedes instalar dependencias directamente en la carpeta de la Súper-App o en el paquete deseado:

```bash
# Añadir una dependencia a la app principal:
pnpm add lucide-react --filter @atlas/frontend
```

### Reglas de Modificación de Base de Datos
- La base de datos es gestionada por **Firebase Data Connect** hacia Google Cloud SQL.
- Si necesitas alterar tablas, edita los archivos `.gql` en la carpeta `dataconnect/`.
- Tras realizar cambios, DEBES regenerar el SDK de cliente para que TypeScript atrape los errores y hacer el deploy:
  ```bash
  npx firebase dataconnect:sdk:generate
  npx firebase deploy --only dataconnect
  ```
- **Prohibido**: No edites manualmente ningún archivo dentro de las carpetas generadas de dataconnect.
- **Data Seeding**: Las inserciones en bloque deben realizarse mediante scripts invocando mutaciones seguras. Si el esquema usa directivas estrictas (`@auth(level: USER)`), asegúrate de testear tus scripts contra el entorno autenticado o cambiar los permisos a `PUBLIC` exclusivamente durante las operaciones automatizadas de mantenimiento y revertirlos de inmediato.

### Reglas para Funciones de Backend e IA
- El código de backend se ubica en `functions/src`.
- Para **procesos pesados o asíncronos**, utiliza *Cloud Tasks* (`onTaskDispatched`) en lugar de mantener en espera la solicitud HTTP. (Mira `erp.ts` como ejemplo).
- Para **módulos de Inteligencia Artificial**, centralizamos la lógica en `gemini.ts`. Al crear nuevos prompts, asegúrate de documentar y sanitizar cuidadosamente las entradas (especialmente si se construyen queries SQL).
- Las dependencias nativas en Python que necesite la IA se deben proporcionar mediante la herramienta de `code_execution` de Gemini, no agregando dependencias complejas al runtime de Node.js.

## Estilo y Diseño Visual
- Atlas Logistics utiliza un estilo riguroso de **Dark Premium Glassmorphism**.
- Por favor, utiliza los tokens CSS globales definidos en `packages/frontend/src/index.css`. No abuses de colores arbitrarios; confía en los fondos semitransparentes, los bordes sutiles y los efectos de desenfoque (`backdrop-blur`).
