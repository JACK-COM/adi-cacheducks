declare type Unsubscriber = { (): any };
declare type CacheItemArgs<T> = { key: string; value: any; cacheKey?: keyof T };
/**
 * Function that accepts a recently-updated object `key`, the new
 * value for `key` (`item`), and an optional `cacheKey` to identify
 * the storage that was updated
 */
declare type KeyValConsumer = {
  (key: string, item: any, cacheKey?: string): any;
};
/** Map of DBs (or other caches) and their CRUD interfaces */
declare type ADICacheDBMap = { [name: string]: ADIDBInterface<any> };

/** Query options for listing all items in a db */
declare type ListQueryOpts = {
  page?: number;
  resultsPerPage?: number;
  orderBy?: string;
} & Record<string, any>;

/** Query options for listing all items through ADI */
declare type ADIListQueryOpts<T> = ListQueryOpts & { cacheKey: keyof T };

/** Query results for a "List items" request (allows pagination) */
declare type PaginatedDBResults<T> = {
  totalResults?: number;
  totalPages?: number;
  resultsPerPage?: number;
  data: T[];
  page?: number;
};

/** CRUD interface for a single database or other cache source */
declare type ADIDBInterface<T> = Record<string, (...a: any[]) => any> & {
  listItems(opts?: ListQueryOpts): Promise<PaginatedDBResults<T>>;
  getItem(id: any): Promise<T | null>;
  putItem(id: any, val: any): Promise<any | null>;
  removeItem(id: any): Promise<any>;
};

/** Data Interface (`ADI`) instance */
declare type AppDataInterface<T extends Record<string, any>> = {
  /** Write an incoming value to the supplied `cache`, or remove the supplied `key` if `value` is falsy (`undefined` or `null`). */
  cacheItem(key: string, value: any, cacheKey?: keyof T): any;
  /** Write incoming values to their respective `caches`, or remove the supplied `key` if `items[x].value` is falsy (`undefined` or `null`). */
  cacheMultiple(items: CacheItemArgs<T>[]): void;
  /** Asserts whether the `ADI` instance has been initialized with a call to` onApplicationStart()`. */
  isInitialized(): boolean;
  /** Retrieve (or optionally fetch, cache, and return) data from a db/cache */
  getItem(
    key: string,
    cacheKey?: keyof T,
    fallback?: () => Promise<any | null>
  ): Promise<any | null>;
  /** Retrieve a list from the specified cache. */
  listItems(
    opts: ADIListQueryOpts<T>,
    fallback?: () => Promise<any[]>
  ): Promise<PaginatedDBResults<any>>;
  /** Reset `ADI` to pre-initialized state. Disables reading from/writing to cache: use on [ user disconnect, app pause, etc ] */
  onApplicationEnd(): void;
  /** Initializes the `ADI` and gets it ready for front-end (or other app) interaction */
  onApplicationStart(): void;
  /** Notify subscribers with data from a db/cache */
  publishItem(
    key: string,
    cacheKey?: keyof T,
    fallback?: () => Promise<any | null>
  ): void;
  /** Notify subscribers with a retrieved list. */
  publishItems(
    opts: ADIListQueryOpts<T>,
    fallback?: () => Promise<any[]>
  ): void;
  /** Remove data from the cache (or localStorage if no `cacheKey`) */
  removeItem(key: string, cacheKey?: keyof T): any;
  /** Subscribe to `ADI` instance for notifications when a cached value (or a cache) is changed. */
  subscribe(listener: KeyValConsumer): Unsubscriber;
  /** Subscribe to `ADI` instance for notifications when a cached value (or a cache) is changed. */
  subscribeToCaches(
    listener: KeyValConsumer,
    caches: keyof T[],
    withinBounds?: (
      updatedKey: string,
      newVal?: any,
      cache?: keyof T
    ) => boolean
  ): Unsubscriber;
};

/**
 * Creates and returns an `ADI` instance, which can be used for
 * reading/writing/updating your application cache.
 */
declare function createDataCacheAPI<T extends ADICacheDBMap>(
  cacheMap: T
): AppDataInterface<T>;

export = createDataCacheAPI;
