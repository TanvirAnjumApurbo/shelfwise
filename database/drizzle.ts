import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import config from "@/lib/config";

// Use WebSocket driver which supports transactions
const pool = new Pool({ connectionString: config.env.databaseUrl });

export const db = drizzle({ client: pool, casing: "snake_case" });
