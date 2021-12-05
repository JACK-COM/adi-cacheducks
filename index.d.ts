declare type Unsubscriber = { (): any };
declare type CacheItemArgs = { key: string; value: any; cacheKey?: string };
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

/** CRUD interface for a single database or other cache source */
declare type ADIDBInterface<T> = {
  listItems(): Promise<T[]>;
  getItem(id: any): Promise<T | null>;
  putItem(id: any, val: T): Promise<T | null>;
  removeItem(id: any): Promise<any>;
};

/** Data Interface (`ADI`) instance */
declare type AppDataInterface = {
  /** Write an incoming value to the supplied `cache` implementation, or remove any existing value with the supplied `key` if `value` is falsy (`undefined` or `null`). */
  cacheItem(key: string, value: any, cacheKey?: string): any;
  /** Write an incoming value to the supplied `cache` implementation, or remove any existing value with the supplied `key` if `value` is falsy (`undefined` or `null`). */
  cacheMultiple(items: CacheItemArgs[]): void;
  /** Asserts whether the `ADI` instance has been initialized with a call to` onApplicationStart()`. */
  isInitialized(): boolean;
  /** Retrieve a list from the specified cache. */
  listItems(cacheKey: string, fallback: () => Promise<any[]>): Promise<any[]>;
  /** Reset `ADI` to pre-initialized state. Disables reading from/writing to cache: use on [ user disconnect, app pause, etc ] */
  onApplicationEnd(): void;
  /** Initializes the `ADI` and gets it ready for front-end (or other app) interaction */
  onApplicationStart(): void;
  publishItem(
    key: string,
    cacheKey?: string,
    fallback?: () => Promise<any | null>
  ): Promise<any | null>;
  /** Remove data from the cache (or localStorage if no `cacheKey`) */
  removeItem(key: string, cacheKey?: string): any;
  /** Subscribe to `ADI` instance for notifications when a cached value (or a cache) is changed. */
  subscribe(listener: KeyValConsumer): Unsubscriber;
  /** Subscribe to `ADI` instance for notifications when a cached value (or a cache) is changed. */
  subscribeToCaches(
    listener: KeyValConsumer,
    caches: string[],
    withinBounds?: (updatedKey: string, newVal: any, cache?: string) => boolean
  ): Unsubscriber;
};

/**
 * Creates and returns an `ADI` instance, which can be used for
 * reading/writing/updating your application cache.
 */
declare function createDataCacheAPI(cacheMap: ADICacheDBMap): AppDataInterface;

export = createDataCacheAPI;
