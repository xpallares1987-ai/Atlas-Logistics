export const isServerEnv = () =>
  typeof window === 'undefined' ||
  typeof Worker === 'undefined' ||
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE === 'test');
