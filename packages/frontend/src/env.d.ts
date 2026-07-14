/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Declaraciones de módulos para archivos de assets
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare module '*.svg' {
  import type { FunctionComponent, SVGAttributes } from 'react';
  const ReactComponent: FunctionComponent<SVGAttributes<SVGElement>>;
  export { ReactComponent };
  const src: string;
  export default src;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

// Variables de entorno de Vite (type-safe)
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_BASE_PATH: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
