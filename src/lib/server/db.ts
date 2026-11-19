import { MIGRATIONS } from "./migrations";

export type Row = Record<string, unknown>;

export interface Db {
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
}

export class DbUnavailableError extends Error {
  constructor() {
    super("database not configured");
  }
}

function connectionString(): string {
  return (process.env.DATABASE_URL || process.env.POSTGRES_URL || "").trim();
}

function usePglite(): boolean {
  if (process.env.USE_PGLITE === "1") return true;
  return connectionString() === "" && process.env.NODE_ENV !== "production";
}

/** Whether accounts, quotas and the community features can work in this deployment. */
export function dbConfigured(): boolean {
  return connectionString() !== "" || usePglite();
}

type PostgresSql = import("postgres").Sql;

function wrapPostgres(sql: PostgresSql | import("postgres").TransactionSql): Db {
  return {
    async query<T>(text: string, params: unknown[] = []) {
      // biome-ignore lint/suspicious/noExplicitAny: postgres.js parameter typing is stricter than our callers need.
      const rows = await sql.unsafe(text, params as any[]);
      return rows as unknown as T[];
    },
    async transaction<T>(fn: (tx: Db) => Promise<T>) {
      if (!("begin" in sql)) return fn(wrapPostgres(sql));
      return (await sql.begin((tx) => fn(wrapPostgres(tx)))) as T;
    },
  };
}

type PgliteLike = {
  query<T>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
  transaction<T>(fn: (tx: PgliteLike) => Promise<T>): Promise<T>;
};

function wrapPglite(pg: PgliteLike, inTransaction = false): Db {
  return {
    async query<T>(text: string, params: unknown[] = []) {
      return (await pg.query<T>(text, params)).rows;
    },
    async transaction<T>(fn: (tx: Db) => Promise<T>) {
      if (inTransaction) return fn(wrapPglite(pg, true));
      return pg.transaction((tx) => fn(wrapPglite(tx, true)));
    },
  };
}

async function connect(): Promise<Db> {
  if (usePglite()) {
    const { PGlite } = await import("@electric-sql/pglite");
    const dataDir = process.env.PGLITE_DIR || ".data/pglite";
    const pg = await PGlite.create(dataDir === "memory" ? undefined : dataDir);
    return wrapPglite(pg as unknown as PgliteLike);
  }
  const { default: postgres } = await import("postgres");
  const sql = postgres(connectionString(), {
    // Serverless platforms usually connect through a transaction-mode pooler (Neon, Supabase),
    // which does not support prepared statements.
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {},
  });
  return wrapPostgres(sql);
}

async function migrate(db: Db) {
  await db.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
  );
  await db.transaction(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock(72710401)");
    const applied = new Set(
      (await tx.query<{ version: number }>("SELECT version FROM schema_migrations")).map(
        (row) => row.version,
      ),
    );
    for (const migration of MIGRATIONS) {
      if (applied.has(migration.version)) continue;
      for (const statement of migration.statements) await tx.query(statement);
      await tx.query("INSERT INTO schema_migrations (version) VALUES ($1)", [migration.version]);
    }
  });
}

const globalForDb = globalThis as unknown as { __zjsDb?: Promise<Db> };

/** Lazily connects and migrates once per server instance. */
export function db(): Promise<Db> {
  if (!dbConfigured()) return Promise.reject(new DbUnavailableError());
  if (!globalForDb.__zjsDb) {
    globalForDb.__zjsDb = connect()
      .then(async (database) => {
        await migrate(database);
        return database;
      })
      .catch((error) => {
        globalForDb.__zjsDb = undefined;
        throw error;
      });
  }
  return globalForDb.__zjsDb;
}

export async function query<T = Row>(text: string, params?: unknown[]): Promise<T[]> {
  return (await db()).query<T>(text, params);
}

export async function queryOne<T = Row>(text: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
  return (await db()).transaction(fn);
}
