import { registerSW } from 'virtual:pwa-register';

export const initPWA = () => {
  const updateSW = registerSW({
    onNeedRefresh() {
      if (confirm('Nueva versión de Atlas-Logistics disponible. ¿Actualizar ahora?')) {
        updateSW(true);
      }
    },
    onOfflineReady() {
      console.info('Aplicación almacenada en caché. Lista para operar sin conexión.');
    },
  });
};