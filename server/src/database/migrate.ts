import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, "migrations");

async function runMigrations() {
  const migrationFiles = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const migrationFile of migrationFiles) {
    const filePath = path.join(migrationsDir, migrationFile);
    const sql = await fs.readFile(filePath, "utf8");

    await db.query("BEGIN");
    try {
      await db.query(sql);
      await db.query("COMMIT");
      console.log(`Applied migration: ${migrationFile}`);
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    }
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
