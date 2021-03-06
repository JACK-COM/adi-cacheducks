export type Unsubscriber = { (): any };

export type ListQueryOpts = {
  cacheKey: string;
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

/** Cache (or db implementation) API */
export type ADIDBInterface<T> = Record<string, (...a: any[]) => any> & {
  clearItems?: () => any;
  listItems(opts: ListQueryOpts): Promise<PaginatedDBResults<T>>;
  getItem(id: any): Promise<T | null>;
  putItem(id: any, val: any): Promise<any | null>;
  removeItem(id: any): Promise<any>;
};

export type ADICacheDBMap = { [name: string]: ADIDBInterface<any> };

/**
 * INTERNAL: Interface for local `cache` read/write. Talks to underlying
 * `cache` property, which is expected to implement `ADIDBInterface`
 */
export type ADICacheInterface = {
  /** List items in a specific db or storage cache */
  listItems(opts: ListQueryOpts): Promise<PaginatedDBResults<any>>;
  /** Clear all items from a specific db or storage cache, or all if key "all" is provided */
  clearItems(cacheKey?: string | "all"): any;
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
