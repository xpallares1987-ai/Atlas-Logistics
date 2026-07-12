import { z } from 'zod';

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
    .enum(['', 'Listo', 'Retrasado', 'Bloqueado'], {
      message: 'Seleccione un estado válido',
    })
    .default(''),
  formKey: z.string().trim().default(''),
  decisionRef: z.string().trim().default(''),
});

export type SysMetadata = z.infer<typeof SysMetadataSchema>;

const extractRawData = (bo: any) => ({
  costHR: bo.get ? bo.get('sys:costHR') : bo.costHR,
  status: bo.get ? bo.get('sys:status') : bo.status,
  formKey: bo.get ? bo.get('sys:formKey') : bo.formKey,
  decisionRef: bo.get ? bo.get('sys:decisionRef') : bo.decisionRef,
});

export function getValidatedMetadata(bo: any): SysMetadata {
  return SysMetadataSchema.parse(extractRawData(bo));
}

export function safeGetMetadata(bo: any): SysMetadata {
  const result = SysMetadataSchema.safeParse(extractRawData(bo));

  if (!result.success) {
    console.warn('Metadata validation failed, using defaults:', result.error.format());
    return SysMetadataSchema.parse({});
  }

  return result.data;
}

export function validateProperty(key: string, value: any): any {
  const schemaKey = key.startsWith('sys:') ? key.slice(4) : key;
  const partialSchema = SysMetadataSchema.pick({ [schemaKey as any]: true } as any);

  const result = partialSchema.safeParse({ [schemaKey]: value });

  if (!result.success) {
    const firstError = result.error.issues[0]?.message || `Valor inválido para ${key}`;
    throw new Error(firstError);
  }

  return (result.data as any)[schemaKey];
}
