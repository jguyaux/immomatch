import dotenv from "dotenv";
import path from "path";
import fs from "fs";

const localEnvPath = path.resolve(process.cwd(), "../.env");
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
}

export const env = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
} as const;
