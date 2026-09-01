import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, "migrations");

async function runMigrations() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await markInitialMigrationIfAlreadyApplied();

  const migrationFiles = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const migrationFile of migrationFiles) {
    const existingMigration = await db.query<{ filename: string }>(
      "SELECT filename FROM schema_migrations WHERE filename = $1",
      [migrationFile]
    );

    if (existingMigration.rows[0]) {
      console.log(`Skipped migration: ${migrationFile}`);
      continue;
    }

    const filePath = path.join(migrationsDir, migrationFile);
    const sql = await fs.readFile(filePath, "utf8");

    await db.query("BEGIN");
    try {
      await db.query(sql);
      await db.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [migrationFile]);
      await db.query("COMMIT");
      console.log(`Applied migration: ${migrationFile}`);
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    }
  }
}

async function markInitialMigrationIfAlreadyApplied() {
  const existingMigration = await db.query<{ filename: string }>(
    "SELECT filename FROM schema_migrations WHERE filename = $1",
    ["001_initial_schema.sql"]
  );

  if (existingMigration.rows[0]) {
    return;
  }

  const existingTables = await db.query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name IN ('canvases', 'tasks')`
  );

  if (existingTables.rows.length === 2) {
    await db.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [
      "001_initial_schema.sql",
    ]);
    console.log("Recorded existing migration: 001_initial_schema.sql");
  }
}

runMigrations()
  .then(async () => {
    await db.end();
  })
  .catch(async (error) => {
    console.error("Migration failed:", error);
    await db.end();
    process.exitCode = 1;
  });
