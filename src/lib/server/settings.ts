import { createHmac, randomBytes } from "node:crypto";
import { query, queryOne } from "./db";

let cachedSecret: string | null = null;

/** Server-side secret for deriving anonymous aliases; generated once and kept in the database. */
export async function appSecret(): Promise<string> {
  const fromEnv = process.env.APP_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (cachedSecret) return cachedSecret;
  await query("INSERT INTO settings (key, value) VALUES ('app_secret', $1) ON CONFLICT (key) DO NOTHING", [
    randomBytes(32).toString("hex"),
  ]);
  const row = await queryOne<{ value: string }>("SELECT value FROM settings WHERE key = 'app_secret'");
  if (!row) throw new Error("app secret missing");
  cachedSecret = row.value;
  return cachedSecret;
}

export async function keyedHash(message: string): Promise<string> {
  return createHmac("sha256", await appSecret()).update(message).digest("hex");
}
