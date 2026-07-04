export function logAction(action: string, metadata: unknown) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    metadata
  };
  console.log('[AUDIT]', JSON.stringify(logEntry));
}
