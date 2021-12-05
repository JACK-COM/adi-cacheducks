import * as ADI from "./ADI";
import { ADIDBInterface, ADICacheDBMap } from "./types";
import createCacheInterface from "./create-cache-interface";

export default function createDataCacheAPI(cacheMap: ADICacheDBMap) {
  validateCacheMap(cacheMap);

  return {
    /** Data Cache Interface Methods */
    ...ADI,

    /** Check that ADI is initialized */
    get initialized() {
      return ADI.isInitialized();
    },

    /** Initialize ADI */
    onApplicationStart() {
      validateCacheMap(cacheMap);
      ADI.onApplicationStart(createCacheInterface(cacheMap));
    },
  };
}

export function validateCacheMap(cacheMap: ADICacheDBMap) {
  const dbNames = Object.keys(cacheMap);
  let invalidAt = "";
  const valid = dbNames.reduce((valid, dbName) => {
    if (!valid) return valid;
    const db = cacheMap[dbName];
    const validDB = validateCacheInterface(db, dbName);
    if (!validDB) invalidAt = dbName;
    return validDB;
  }, Object.keys(cacheMap).length > 0);

  if (valid) return valid;
  throw new Error(`Invalid ADI interface for CacheMap DB "${invalidAt}"`);
}

function validateCacheInterface(db: ADIDBInterface<any>, n: string) {
  const dbAPI = Object.keys(db);
  const required = ["listItems", "getItem", "putItem", "removeItem"];

  if (dbAPI.length === 0) {
    throw new Error(`Invalid ADI interface: DB "${n}" has no methods`);
  }

  // console.log({ db })
  return required.reduce(
    (v, fn) => v && dbAPI.includes(fn) && typeof db[fn] === "function",
    true
  );
}
