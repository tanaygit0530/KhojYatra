import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env or backend .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),
  JWT_ISSUER: z.string().default('supabase'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('*'),
  
  // Supabase
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Optional Integrations (fallbacks exist for all)
  ANTHROPIC_API_KEY: z.string().optional(),
  WEATHER_API_KEY: z.string().optional(),
  MAPS_API_KEY: z.string().optional(),
  WHATSAPP_BUSINESS_TOKEN: z.string().optional(),
  SARVAM_API_KEY: z.string().optional(),
  RAPIDAPI_KEY: z.string().optional()
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment validation failed:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
