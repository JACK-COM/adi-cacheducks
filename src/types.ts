export type Unsubscriber = { (): any };

export type AppDataInterface = {
  initialized: boolean;
  onApplicationStart(opts: ADICacheDBMap): any;
  publishItem(
    key: string,
    cacheKey?: string | null,
    fallbackFetch?: () => Promise<any>
  ): any;
  cacheItem(key: string, value: any): any;
  subscribe(fn: KeyValConsumer): Unsubscriber;
  subscribeToCaches(
    fn: KeyValConsumer,
    keys: string[],
    cacheKey?: string | null
  ): Unsubscriber;
  onApplicationEnd(): void;
};

export type ListQueryOpts = {
  page?: number;
  resultsPerPage?: number;
  orderBy?: string;
};

export type PaginatedDBResults<T> = {
  totalResults?: number;
  totalPages?: number;
  resultsPerPage?: number;
  data: T[];
  page?: number;
};

export type ADIDBInterface<T> = {
  listItems(opts?: ListQueryOpts): Promise<PaginatedDBResults<T>>;
  getItem(id: any): Promise<T | null>;
  putItem(id: any, val: any): Promise<any | null>;
  removeItem(id: any): Promise<any>;
};

export type ADICacheDBMap = { [name: string]: ADIDBInterface<any> };

/**
 * A `cache` that can be used for long-term local data storage. The
 * underlying technology does not matter, as long as the supplied `cache`
 * property implements `ADICacheInterface`
 */
export type ADICacheInterface = {
  /** List items in a specific db or storage cache */
  listItems(cache: string): Promise<any[]>;
  /** Get an item from a db or storage cache */
  getItem(key: string, cache?: string): any | null;
  /** Add/Update an item in a db or storage cache */
  setItem(key: string, value: any, cache?: string): any;
  /** Remove an item from a db or storage cache */
  removeItem(key: string, cache?: string): any;
} & { [name: string]: (...args: any[]) => any };

export type CacheItemArgs = { key: string; value: any; cacheKey?: string };

export type KeyValConsumer = {
  (key: string, item: any, cacheKey?: string): any;
};
