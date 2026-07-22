import { z } from "zod";

export const createEnvValidator = <T extends z.ZodRawShape>(schema: T) => {
  return (env: Record<string, unknown>) => {
    const result = z.object(schema).safeParse(env);
    if (!result.success) {
      console.error("❌ Invalid environment variables:", result.error.format());
      throw new Error("Invalid environment variables");
    }
    return result.data;
  };
};

/**
 * Returns true if external shipping/carrier APIs (Maersk, INTTRA, Xeneta)
 * should run in mock mode for offline or sandbox development.
 */
export const isMockExternalApis = (): boolean => {
  return (
    process.env.MOCK_EXTERNAL_APIS === "true" || process.env.NODE_ENV === "test"
  );
};
