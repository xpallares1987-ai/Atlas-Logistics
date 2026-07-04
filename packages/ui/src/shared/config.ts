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
