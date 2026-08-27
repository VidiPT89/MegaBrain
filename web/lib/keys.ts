import { sql } from "./db";
import { decryptSecret } from "./crypto";

export async function getUserApiKey(userId: string, provider: "openai" | "anthropic"): Promise<string | null> {
  const db = sql();
  const rows = (await db`
    SELECT encrypted_key FROM api_keys WHERE user_id = ${userId} AND provider = ${provider}
  `) as { encrypted_key: string }[];
  if (rows.length === 0) return null;
  return decryptSecret(rows[0].encrypted_key);
}
