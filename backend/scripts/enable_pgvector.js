import "dotenv/config";

import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is missing");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require" });

try {
  await sql`CREATE EXTENSION IF NOT EXISTS vector;`;
  console.log("✅ pgvector enabled (or already enabled).");
} catch (e) {
  console.error("❌ Failed to enable pgvector:", e);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
