import { z } from 'zod';

/**
 * Schema for standard 'sys:*' metadata used in Logistics modeling.
 */
export const SysMetadataSchema = z.object({
  costHR: z.preprocess(
    (val) => {
      if (val === '' || val === undefined || val === null) return 0;
      return typeof val === 'string' ? parseFloat(val) : val;
    },
    z
      .number({ message: 'El costo debe ser un número' })
      .nonnegative({ message: 'El costo no puede ser negativo' })
      .default(0)
  ),
  status: z
    .enum(['', 'Listo', 'delayed', 'Retrasado', 'blocked', 'Bloqueado'], {
      message: 'Seleccione un estado válido',
    })
    .default(''),
  formKey: z.string().trim().default(''),
  decisionRef: z.string().trim().default(''),
});

export type SysMetadata = z.infer<typeof SysMetadataSchema>;

/**
 * Utility to extract and validate 'sys:*' metadata from a BPMN business object.
 */
export function getValidatedMetadata(bo: any): SysMetadata {
  const rawData = {
    costHR: bo.get ? bo.get('sys:costHR') : bo.costHR,
    status: bo.get ? bo.get('sys:status') : bo.status,
    formKey: bo.get ? bo.get('sys:formKey') : bo.formKey,
    decisionRef: bo.get ? bo.get('sys:decisionRef') : bo.decisionRef,
  };

  return SysMetadataSchema.parse(rawData);
}

/**
 * Safe version of getValidatedMetadata that returns defaults on error.
 */
export function safeGetMetadata(bo: any): SysMetadata {
  const result = SysMetadataSchema.safeParse({
    costHR: bo.get ? bo.get('sys:costHR') : bo.costHR,
    status: bo.get ? bo.get('sys:status') : bo.status,
    formKey: bo.get ? bo.get('sys:formKey') : bo.formKey,
    decisionRef: bo.get ? bo.get('sys:decisionRef') : bo.decisionRef,
  });

  if (!result.success) {
    console.warn('Metadata validation failed, using defaults:', result.error.format());
    return SysMetadataSchema.parse({});
  }

  return result.data;
}

/**
 * Validates a single property update and returns the parsed value.
 * Throws if the value is invalid for that key.
 */
export function validateProperty(key: string, value: any): any {
  // Map 'sys:prop' to 'prop' for Zod schema check
  const schemaKey = key.startsWith('sys:') ? key.slice(4) : key;
  const partialSchema = SysMetadataSchema.pick({ [schemaKey as any]: true } as any);

  const result = partialSchema.safeParse({ [schemaKey]: value });

  if (!result.success) {
    const firstError = result.error.issues[0]?.message || `Invalid value for ${key}`;
    throw new Error(firstError);
  }

  return (result.data as any)[schemaKey];
}
