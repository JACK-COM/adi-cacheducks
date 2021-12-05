import {
  ADICacheInterface,
  CacheItemArgs,
  KeyValConsumer,
  Unsubscriber,
} from "./types";

/** `Application Data Interface` initialization state */
let initialized = false;

/** `Application Data Interface` cache layer */
let cache: ADICacheInterface | null;

/** `ADI` update consumers */
let subscribers: KeyValConsumer[] = [];

/** Check if Cache Layer is initialized */
export function isInitialized() {
  return initialized;
}

/** Application data initializer */
export function onApplicationStart(config: ADICacheInterface) {
  if (isInitialized()) return;

  cache = config;
  initialized = true;
}

/** Notify subscribers (and callback fn) of data fetch/update */
export async function publishItem(
  key: string,
  cacheKey?: string,
  fallback = () => Promise.resolve(null as any)
) {
  if (!initialized) publishError("ADI is not initialized");

  let data = await cache?.getItem(key, cacheKey);
  if (!data) {
    data = await fallback();
    return cacheItem(key, data, cacheKey);
  }

  notifyAll(key, data, cacheKey);
  return data;
}

/** Fetch and return a list of items */
export async function listItems(
  cacheKey: string,
  fallback = () => Promise.resolve([] as any)
) {
  if (!initialized) publishError("ADI is not initialized");
  if (!cacheKey) return [];
  const data = (await cache?.listItems(cacheKey)) || (await fallback());
  notifyAll("all", data, cacheKey);
  return data;
}

/** Notify subscribers (and callback fn) of data fetch/update */
export function removeItem(key: string, cacheKey?: string) {
  if (!initialized) {
    publishError("ADI is not initialized");
  } else cache?.removeItem(key, cacheKey);
}

export function onApplicationEnd() {
  cache = null;
  initialized = false;
}

export function subscribe(listener: KeyValConsumer): Unsubscriber {
  if (typeof listener !== "function") publishError("Invalid ADI subscriber");
  if (subscribers.includes(listener)) return noOp;
  subscribers.push(listener);
  return unsubscribe(listener);
}

/* Subscribe to only specific updates */
export function subscribeToCaches(
  listener: KeyValConsumer,
  caches: string[],
  withinBounds = (...any: any[]) => Array.isArray(any)
): Unsubscriber {
  // Validate args (listener and keys)
  if (typeof listener !== "function") publishError("Invalid ADI subscriber");
  if (!caches.length) {
    publishError("Subscription requires at least one cache name");
  }

  // Trigger listener if the updated value is desirable
  const filter = (k: string, v: any, c?: any) => {
    const activate = caches.includes(c) && withinBounds(k, v, c);
    if (activate) listener(k, v, c);
  };

  subscribers.push(filter);
  return unsubscribe(filter);
}

export function cacheItem(key: string, value: any, cacheKey?: string) {
  if (!initialized) publishError("ADI is not initialized");
  if (!key) publishError("Item Key was not supplied for caching");

  if (value) cache?.setItem(key, value, cacheKey);
  else cache?.removeItem(key, cacheKey);

  notifyAll(key, value, cacheKey);
  return value;
}

export function cacheMultiple(items: CacheItemArgs[]) {
  if (!initialized) publishError("ADI is not initialized");
  if (!items.length) return;

  items.forEach(({ key, value, cacheKey }) => {
    cache?.setItem(key, value, cacheKey);
    notifyAll(key, value, cacheKey);
  });
}

function notifyAll(key: string, val: any, cacheKey?: string) {
  subscribers.forEach((listen) => listen(key, val, cacheKey));
}

function publishError(msg: any) {
  throw new Error(msg);
}

function unsubscribe(listener: KeyValConsumer): Unsubscriber {
  return () => {
    subscribers = subscribers.filter((s) => s !== listener);
  };
}

function noOp() {}
