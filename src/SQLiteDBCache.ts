import { parse, SQLiteDB } from "../deps.ts";
import type { SqliteOptions } from "../deps.ts";

export type TxMode = Exclude<SqliteOptions["mode"], undefined>;

export class SQLiteDBCache {
  #cache: Map<string, SQLiteDB>;
  #modes: Record<string, TxMode>;
  #options: SqliteOptions;

  constructor() {
    this.#cache = new Map();
    this.#modes = {};
    this.#options = { memory: true };
    addEventListener("unload", () => this.#close());
  }

  db(name: string, mode: TxMode): SQLiteDB {
    mode = this.#options.memory ? "create" : mode;
    const cached = this.#cache.get(name);

    if (cached === undefined) {
      return this.#make(name, mode);
    } else if (this.#modes[name] !== mode) {
      cached.close();
      this.#cache.delete(name);
      delete this.#modes[name];

      return this.#make(name, mode);
    }

    return cached;
  }

  configure(customOptions: SqliteOptions = {}): Readonly<SqliteOptions> {
    this.#options = {
      ...this.#options,
      ...customOptions,
    };

    return Object.freeze(structuredClone(this.#options) as SqliteOptions);
  }

  #make(name: string, mode: TxMode): SQLiteDB {
    if (!this.#options.memory) {
      const parsed = parse(name);

      if (parsed.dir !== "." && parsed.dir !== "") Deno.mkdirSync(parsed.dir);
    }
    const newDb = new SQLiteDB(name, { ...this.#options, mode });

    this.#cache.set(name, newDb);
    this.#modes[name] = mode;

    return newDb;
  }

  #close() {
    for (const db of this.#cache.values()) {
      db.close(true);
    }
  }
}

/** Global SQLite database cache to manage access mode and closing files on Deno unload. */
export const cache = new SQLiteDBCache();

/** Mutates module options for underlying SQLiteDB implementation, and returns an immutable clone of existing options. */
export function configureSQLiteDB(
  customOptions: SqliteOptions,
): Readonly<SqliteOptions> {
  return cache.configure(customOptions);
}
