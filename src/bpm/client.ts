/**
 * Atlas Logistics — Zeebe gRPC Client.
 *
 * Supports both Camunda 8 SaaS and local Self-Managed via env vars.
 *
 * For local Docker:
 *   ZEEBE_ADDRESS=localhost:26500
 *   CAMUNDA_OAUTH_DISABLED=true
 *   ZEEBE_INSECURE_CONNECTION=true
 */
import { Camunda8 } from '@camunda8/sdk';

const isLocal = process.env.ZEEBE_ADDRESS?.includes('localhost') ||
                process.env.CAMUNDA_OAUTH_DISABLED === 'true';

if (isLocal) {
  console.log('[Zeebe] Connecting to local Self-Managed cluster...');
} else {
  console.log('[Zeebe] Connecting to Camunda 8 SaaS...');
}

const c8 = new Camunda8();
const zbc = c8.getZeebeGrpcApiClient();

zbc.on('ready', () => {
  console.log(`[Zeebe] ✓ Connected successfully (${isLocal ? 'local' : 'SaaS'})`);
});

zbc.on('connectionError', () => {
  console.warn(`[Zeebe] ✗ Connection error (${isLocal ? 'local — is Docker running?' : 'SaaS — check credentials'})`);
});

export { zbc, c8 };
