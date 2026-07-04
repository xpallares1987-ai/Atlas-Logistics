import { z } from 'zod';

export const FeatureSchema = z.object({
  enableSysMetadata: z.boolean().default(false),
  enableCloudSync: z.boolean().default(true),
  enableTemplateManager: z.boolean().default(true),
});

export type Features = z.infer<typeof FeatureSchema>;

// Default configuration
const config: Features = {
  enableSysMetadata: true,
  enableCloudSync: true,
  enableTemplateManager: true,
};

export const getFeatures = (): Features => {
  // In a real scenario, this could read from localStorage or an external API
  return config;
};
