import { ADICacheInterface, ADICacheDBMap, ListQueryOpts } from "./types";

const noop = () => null;
const fallback: Storage = {
  clear: noop,
  getItem: noop,
  key: noop,
  length: 0,
  removeItem: noop,
  setItem: noop,
};

/**
 * Creates and returns a `Cache Interface`, an object that reads from/
 * writes to * your custom cache implementation.
 */
export default function createCacheInterface(
  dbs: ADICacheDBMap
): ADICacheInterface {
  const local = window ? window.localStorage : fallback;

  return {
    /** Clear all items from (all or one) DB/localStorage */
    clearItems(cache?: string) {
      if (!cache) return local.clear();

      // Clear all
      if (cache === "all") {
        local.clear();
        return Promise.all(
          Object.values(dbs).map((db) => {
            return db.clearItems ? db.clearItems() : Promise.resolve(true);
          })
        );
      }

      const db = dbs[cache];
      if (db && db.clearItems) return db.clearItems();
      return null;
    },

    /** Get an item from DB */
    async getItem(key: string, cacheKey?: string) {
      if (!cacheKey) return local.getItem(key) || null;
      const db = dbs[cacheKey];
      return db
        ? await (key === "all" ? db.listItems({ cacheKey }) : db.getItem(key))
        : null;
    },

    async listItems(opts: ListQueryOpts) {
      const { cacheKey } = opts;
      const empty = { data: [] };
      const db = dbs[cacheKey];
      return db ? (await db.listItems(opts)) || empty : empty;
    },

    /** Remove an item from DB */
    async removeItem(key: string, cacheKey?: string) {
      if (!cacheKey) return local.removeItem(key);
      const db = dbs[cacheKey];
      return db ? db.removeItem(key) : null;
    },

    /** Add or update an item in DB */
    async setItem(key: string, value: any, cacheKey?: string) {
      if (!cacheKey) {
        local.setItem(key, value);
        return value;
      }

      const db = dbs[cacheKey];
      return db ? db.putItem(key, value) : null;
    },
  };
}
