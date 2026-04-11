import { z } from "zod";
import path from "path";
import { createRequire } from "module";

try {
  const require = createRequire(import.meta.url);
  const dotenv = require("dotenv");
  if (dotenv && dotenv.config) {
    dotenv.config();
  }
} catch {}

const envSchema = z.object({
  PORT: z
    .string()
    .default("3000")
    .transform((val: string) => Number.parseInt(val, 10))
    .pipe(z.number().int().positive()),

  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  SOURCEMAP_ASSETS_PATH: z
    .string()
    .optional()
    .transform((val: string | undefined) =>
      val ? path.resolve(val) : path.resolve(process.cwd(), "assets")
    ),
});

const parseEnv = () => {
  try {
    return envSchema.parse({
      PORT: process.env.PORT,
      NODE_ENV: process.env.NODE_ENV,
      SOURCEMAP_ASSETS_PATH: process.env.SOURCEMAP_ASSETS_PATH,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Invalid environment variables:");
      error.issues.forEach((err) => {
        console.error(`  - ${err.path.join(".")}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};

const env = parseEnv();

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  sourcemapAssetsPath: env.SOURCEMAP_ASSETS_PATH,
} as const;

export default config;
