import dotenv from "dotenv";
import pg, { type Pool, type QueryResult } from "pg";

dotenv.config();

const { Pool: PgPool } = pg;

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  pool = new PgPool({
    connectionString: databaseUrl,
  });

  return pool;
}

export const db = {
  query: (text: string, values?: unknown[]): Promise<QueryResult> => getPool().query(text, values),
  end: () => (pool ? pool.end() : Promise.resolve()),
};
