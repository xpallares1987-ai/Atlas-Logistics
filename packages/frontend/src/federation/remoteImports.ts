// src/federation/remoteImports.ts
// Utility to lazily load remote modules via Vite Module Federation

export const remoteModules = {
  // @ts-ignore
  dashboard: () => import("dashboard/Dashboard"),
};

export const loadRemote = async (name: keyof typeof remoteModules) => {
  const mod = await remoteModules[name]();
  return mod.default;
};
