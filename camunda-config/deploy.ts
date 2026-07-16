/**
 * Atlas Logistics — Deploy BPMN/DMN resources to Camunda 8.
 *
 * Supports both SaaS and local Self-Managed clusters.
 *
 * Usage:
 *   npx tsx camunda-config/deploy.ts                  # Deploy to configured cluster
 *   npx tsx camunda-config/deploy.ts --dry-run        # List resources only
 *   npx tsx camunda-config/deploy.ts --local          # Deploy to local Docker (localhost:26500)
 *   npx tsx camunda-config/deploy.ts --local --dry-run # Preview local deployment
 */

import { Camunda8 } from '@camunda8/sdk';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';
import * as dotenv from 'dotenv';

// Explicitly load .env.local which contains SaaS credentials
dotenv.config({ path: join(import.meta.dirname || __dirname, '../.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');
const LOCAL = process.argv.includes('--local');
const BASE_DIR = join(import.meta.dirname || __dirname, '.');

/** Recursively find all .bpmn, .dmn, and .form files */
function findResources(dir: string): string[] {
  const results: string[] = [];
  const extensions = ['.bpmn', '.dmn', '.form'];

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);

    if (stat.isDirectory()) {
      results.push(...findResources(full));
    } else if (extensions.includes(extname(entry))) {
      results.push(full);
    }
  }

  return results;
}

async function deploy() {
  const resources = findResources(BASE_DIR);
  const target = LOCAL ? 'Local Docker (localhost:26500)' : 'Camunda 8 SaaS';

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  Atlas Logistics — Camunda 8 Resource Deployer  ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log();
  console.log(`Target:  ${target}`);
  console.log(`Found ${resources.length} resources to deploy:`);

  for (const res of resources) {
    const rel = relative(BASE_DIR, res);
    const ext = extname(res).replace('.', '').toUpperCase();
    console.log(`  [${ext}] ${rel}`);
  }

  if (DRY_RUN) {
    console.log('\n🔍 Dry-run mode — no resources will be deployed.');
    return;
  }

  console.log(`\nDeploying to ${target}...\n`);

  // Configure environment based on target
  if (LOCAL) {
    // Clear any SaaS / conflicting vars first
    delete process.env.CAMUNDA_OAUTH_DISABLED;
    delete process.env.ZEEBE_AUTHORIZATION_SERVER_URL;
    delete process.env.CAMUNDA_AUTH_STRATEGY;
    delete process.env.CAMUNDA_TOKEN_SCOPE;
    delete process.env.ZEEBE_ADDRESS;
    delete process.env.ZEEBE_INSECURE_CONNECTION;
    delete process.env.CAMUNDA_SECURE_CONNECTION;

    // Set local self-managed vars (non-deprecated)
    process.env.ZEEBE_GRPC_ADDRESS = 'grpc://localhost:26500';
    process.env.ZEEBE_CLIENT_ID = 'orchestration';
    process.env.ZEEBE_CLIENT_SECRET = 'secret';
    process.env.CAMUNDA_OAUTH_URL =
      'http://localhost:18080/auth/realms/camunda-platform/protocol/openid-connect/token';
    process.env.ZEEBE_TOKEN_AUDIENCE = 'orchestration';
    process.env.CAMUNDA_ZEEBE_OAUTH_AUDIENCE = 'orchestration';
  } else {
    // For SaaS, just clear local conflict vars and force SDK to use Cluster ID logic
    delete process.env.CAMUNDA_OAUTH_DISABLED;
    delete process.env.ZEEBE_INSECURE_CONNECTION;
    delete process.env.ZEEBE_ADDRESS;
    delete process.env.ZEEBE_GRPC_ADDRESS;
    delete process.env.ZEEBE_REST_ADDRESS;
  }

  console.log("DEBUG: ZEEBE_CLIENT_ID =", process.env.ZEEBE_CLIENT_ID ? "***" : "missing");
  console.log("DEBUG: CAMUNDA_CLUSTER_ID =", process.env.CAMUNDA_CLUSTER_ID ? "***" : "missing");
  console.log("DEBUG: ZEEBE_ADDRESS =", process.env.ZEEBE_ADDRESS);

  let c8: Camunda8;
  if (LOCAL) {
    c8 = new Camunda8();
  } else {
    c8 = new Camunda8({
      CAMUNDA_CLUSTER_ID: process.env.CAMUNDA_CLUSTER_ID,
      CAMUNDA_CLIENT_ID: process.env.CAMUNDA_CLIENT_ID,
      CAMUNDA_CLIENT_SECRET: process.env.CAMUNDA_CLIENT_SECRET,
      CAMUNDA_CLUSTER_REGION: process.env.CAMUNDA_CLUSTER_REGION || 'bru-2',
    });
  }

  const zbc = c8.getZeebeGrpcApiClient();

  let deployed = 0;
  let failed = 0;

  for (const resourcePath of resources) {
    const rel = relative(BASE_DIR, resourcePath);
    try {
      const result = await zbc.deployResource({
        processFilename: resourcePath,
        process: readFileSync(resourcePath),
      });

      const deployments = (result as any).deployments || [];
      for (const dep of deployments) {
        const info = dep.process || dep.decision || dep.form || {};
        console.log(
          `  ✓ ${rel} → ${info.bpmnProcessId || info.decisionId || info.formId || 'deployed'} (v${info.version || '?'})`,
        );
      }
      deployed++;
    } catch (error: any) {
      console.error(`  ✗ ${rel} — ${error.message}`);
      failed++;
    }
  }

  await zbc.close();
  console.log(`\n✓ Deployment complete: ${deployed} succeeded, ${failed} failed.`);
}

deploy().catch((err) => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
