import { createTRPCReact } from '@trpc/react-query';
// Importamos el tipo desde el backend (root src)
import type { AppRouter } from '../../../../src/trpc/routers/_app';

export const trpc = createTRPCReact<AppRouter>();
