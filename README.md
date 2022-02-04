# **Application Data Interface** (ADI)

## `ADI` Description
The *Application Data Interface* (`ADI`) is a **pub-sub cache manager for the front-end**. It is used for predictable data-fetching and caching in a front-end application.\
The `ADI` focuses on retrieving locally-stored application data, independent of UI frameworks, programming paradigms, or cache implementations. 

---
## Definitions/Terms

* `ADI`: The **App data interface** instance generated for you by the library. 
* `cache`: any data cache implementation, such as `IndexedDB` or `localForage` in browsers. This `MUST` be provided to `ADI` on initialization.

**Note that** the `cache` `MUST` be supplied to `ADI` on initialization, since the latter writes to/reads from the former during the application lifecycle. 

---

# **Application Data Interface** | Exports
The library contains a single export, `createDataCacheAPI( cacheMap: ADICacheDBMap )`\
This function expects a `cacheMap`, a key-value store where every `key` is the name of a `storage` or `cache` instance (e.g. name of a table in **IndexedDB**) and the `value` of the key is an object that implements `ADIDBInterface`, as below:
### Example implementation
```typescript
// Below, we create a cacheMap for a "users" table in indexedDB. 
// The "cachemap" is where you put ALL your local db APIs.
const cacheMap = {
  users: {
    async clearItems() { ... },
    async listItems(opts: ListQueryOpts) { ... },
    async getItem(id: any) { ... },
    async putItem(id: any, val: DBUser) { ... },
    async removeItem(id: any): { ... },
  }
}

// The fun part: create your ADI instance
const ADI = createDataCacheAPI( cacheMap )
ADI.onApplicationStart()

// Now you can asynchronously fetch or list items from the db
ADI.publishItem(someId, "users").then( ... )
ADI.listItems({ cacheKey: "users" }).then( ... )

// Get notified when the db is updated 
ADI.subscribeToCaches((key: string, val: any, cache: string) => {
  // ...
}, ["users"])
```

`createDataCacheAPI( ... )` returns an `AppDataInterface` with the following methods:

### ADI instance
```typescript
interface AppDataInterface {{
  /** Write an incoming value to the supplied `cache`, or remove the supplied `key` if `value` is falsy (`undefined` or `null`). */
  cacheItem(key: string, value: any, cacheKey?: string): any;
  
  /** Write incoming values to their respective `caches`, or remove the supplied `key` if `items[x].value` is falsy (`undefined` or `null`). */
  cacheMultiple(items: CacheItemArgs[]): void;
  
  /** Asserts whether the `ADI` instance has been initialized with a call to` onApplicationStart()`. */
  isInitialized(): boolean;
  
  /** Retrieve (or optionally fetch, cache, and return) data from a db/cache */
  getItem(
    key: string,
    cacheKey?: string,
    fallback?: () => Promise<any | null>
  ): Promise<any | null>;
  
  /** Retrieve a list from the specified cache. */
  listItems(
    opts: ListQueryOpts,
    fallback?: () => Promise<any[]>
  ): Promise<PaginatedDBResults<any>>;
  
  /** Reset `ADI` to pre-initialized state. Disables reading from/writing to cache: use on [ user disconnect, app pause, etc ] */
  onApplicationEnd(): void;
  
  /** Initializes the `ADI` and gets it ready for front-end (or other app) interaction */
  onApplicationStart(): void;
  
  /** Notify subscribers with data from a db/cache */
  publishItem(
    key: string,
    cacheKey?: string,
    fallback?: () => Promise<any | null>
  ): void;
  
  /** Notify subscribers with a retrieved list. */
  publishItems(opts: ListQueryOpts, fallback?: () => Promise<any[]>): void;
  
  /** Remove data from the cache (or localStorage if no `cacheKey`) */
  removeItem(key: string, cacheKey?: string): any;
  
  /** Subscribe to `ADI` instance for notifications when a cached value (or a cache) is changed. */
  subscribe(listener: KeyValConsumer): Unsubscriber;
  
  /** Subscribe to `ADI` instance for notifications when a cached value (or a cache) is changed. */
  subscribeToCaches(
    listener: KeyValConsumer,
    caches: string[],
    withinBounds?: (updatedKey: string, newVal?: any, cache?: string) => boolean
  ): Unsubscriber;
};
}
```

# **Application Data Interface** | Methods

## Lifecycle

### `ADI.isInitialized( ): boolean`
Asserts whether the `ADI` instance has been initialized with a call to` onApplicationStart()`. While this value is `false`, any call to a non-`subscribe` method on the `ADI` instance will throw a gigantic flaming error.

### `ADI.onApplicationStart(  )`
This function initializes the `ADI` and gets it ready for front-end (or other app) interaction. It must be called before using any instance methods (excluding `subscribe` and `subscribeToCaches`), or `ADI` will throw an error.

```typescript
const dataAPI = createDataCacheAPI( cacheMap );

dataAPI.onApplicationStart();
dataAPI.cacheItem( ... ) // no errors
```


### `ADI.onApplicationEnd( )` 
Reset `ADI` to pre-initialized state. Disables reading from/writing to cache: use on [ user disconnect, app pause, etc ]

#### Example - Vue (contrived)
```typescript
{
  beforeUnmount() {
    dataAPI.onApplicationEnd()
  }
} 
```

#### React - (functional -- also contrived)
```typescript
  useEffect(() => {
    // Return function ref for component/app cleanup
    return dataAPI.onApplicationEnd
  })
```

## Data Storage and Retrieval 

### `async ADI.clearItems( cache?: string | "all" )`
Clear all items from the specified cache. If no `cache` is specified, `ADI` will attempt to clear `localStorage`.\
If the key `all` is provided as the cache, `ADI` will attempt to clear both `localStorage` and all dbs that implement `clearItem`. 

### `async ADI.listItems( cache: string, fb?: () => Promise<any> )`
Retrieve a list from the specified cache. Takes an optional `fallback` function to fetch the data if it is not in cache. This will NOT write anything to cache or notify subscribers, since notification requires a single

#### Example
```typescript
const dataAPI = createDataCacheAPI( cacheMap );

dataAPI.onApplicationStart();

// Optional: subscribe either component or some global state to cache
const subscriber = (k, v, c) => {
  if (k === "someKey") // update view using value "v" ...
}
const unsubscribeCache = dataAPI.subscribe(subscriber);

// Option 1: await the response and use it right away
const a = await dataAPI.listItems({ cacheKey: "someDB" });

// Option 2: Unidirectional data-flow (cache -> state -> UI),
dataAPI.subscribeToCaches((k, v) => { ... }, ["someDB"]);
// Call "publishItem" and wait for a subscription to be triggered.
dataAPI.publishItems({ cacheKey: "someDB" });
```
  

### `async ADI.getItem( key: string, cache?: string, fb?: () => Promise<any> )`
Retrieve data from the cache. Takes an optional `fallback` function to fetch the data if it is not in cache. If used, the `fallback` response will be cached for future reference, and subscribers will be notified. 

**Note:** if a `cache` key is not supplied, `ADI` will attempt to read from `localStorage`.

```typescript
const dataAPI = createDataCacheAPI( cacheMap );

dataAPI.onApplicationStart();

// Optional: subscribe either component or some global state to cache
const subscriber = (k, v, c) => {
  if (k === "someKey") // update view using value "v" ...
}
const unsubscribeCache = dataAPI.subscribe(subscriber);

// Option 1: await the response and use it right away
const a = await dataAPI.getItem("someKey")

// Option 2: unidirectional data-flow (cache -> state -> UI),
// call "publishItem" and wait for a subscription to be triggered.
dataAPI.subscribeToCaches( ..., ["someCache"]);
dataAPI.publishItem("someKey", "someCache");

// Stop listening
unsubscribe();
```
  
### `ADI.cacheItem( key: string, value: any, cache?: string )`
### `ADI.cacheMultiple([ { key, value, cache? }, ... ])`
Write an incoming value to the supplied `cache` implementation, or remove any existing value with the supplied `key` if `value` is falsy (`undefined` or `null`).
```typescript
const dataAPI = createDataCacheAPI( cacheMap );
dataAPI.onApplicationStart();

// removes 'someKey' from localStorage
dataAPI.cacheItem("someKey"); 

// adds value 'someValue' with 'someKey' to localStorage
dataAPI.cacheItem("someKey", someValue);

// writes value 'someValue' of 'someKey' to 'someTable'
dataAPI.cacheItem("someKey", someValue, "someTable");
```

### `async ADI.removeItem( key: string, cache?: string )`
Remove data from the cache.\
**Note:** if a `cache` key is not supplied, `ADI` will attempt to remove the key from `localStorage`.

```typescript
const dataAPI = createDataCacheAPI( cacheMap );

dataAPI.onApplicationStart();

// Remove from localStorage
dataAPI.removeItem("someKey");

// Remove from some table
dataAPI.removeItem("someKey", "someTable");
```
---

## Publishing and subscribing to changes
Note that the `ADI` will always broadcast changes to cache (i.e. whenever `ADI.cacheItem` or `ADI.cacheMultiple` is called). Otherwise, you can selectively **retrieve and use data** from a cache, or **retrieve and publish data** to all subscribers without receiving a return value.

### `ADI.publishItems( opts: ListQueryOpts )`
Retrieve and broadcast a list using the options specified in `opts`. Supports paginated queries/responses if implemented.
### `ADI.publishItem( key: string, cache?: string, fallback:() => Promise<any> )`
Like `getItem`, retrieves a single item from cache, but broadcasts to all subscribers without returning the item.

### `ADI.subscribe( listener: ListenerFn )`
### `ADI.subscribeToCaches( listener: ListenerFn, caches: string[] )`
Subscribe to `ADI` instance for notifications when a cached value (or a cache) is changed. The `listener` function should expect the following args:
```typescript
type ListenerFn = { 
  ( updatedKey: string, newVal: any, cache?: string ): any 
}
```
If an updated key is `"all"`, then the `ADI` just fetched or updated all items in the specified `cache`. This should never be triggered for `localStorage`.

# **Application Data Interface** | Types and Interfaces
## `ADICacheDBMap`
A key-value store that is required to initialize an `ADI` instance.

```typescript
interface ADICacheDBMap = { [name: string]: ADIDBInterface<any> };
```
## `ADIDBInterface`
A key-value object that serves as an API for your local database (e.g. `IndexedDB` or `localForage`). The object *must* have the following methods, 

```typescript
type ADIDBInterface<T> = {
  listItems(opts: ListQueryOpts): Promise<PaginatedDBResults<T>>;
  getItem(id: any): Promise<T | null>;
  putItem(id: any, val: any): Promise<any | null>;
  removeItem(id: any): Promise<any>;
}
```
where the generic `<T>` represents your database model.\
(**Example:** if your database model is `User`, then `listItems` should return a list of type `User[]`)

## ListQueryOpts
A key-value object with options for enhanced storage queries. Allows the developer to implement paginated responses.


```typescript
type ListQueryOpts = {
  cacheKey: string,
  page?: number;
  resultsPerPage?: number;
  orderBy?: string;
};

const opts: ListQueryOpts = { ... }
ADI.listItems(opts).then( ... );
```
## ListQueryOpts
A key-value response (from local cache/db) to a "list-all" query.\
Allows the developer to implement paginated responses.

```typescript
type PaginatedDBResults<T> = {
  totalResults?: number;
  totalPages?: number;
  resultsPerPage?: number;
  data: T[];
  page?: number;
};

const opts: ListQueryOpts = { ... }
const response: PaginatedDBResult<DBUser> = await ADI.listItems(opts);

response.data.forEach( ... )
response.page ... 
```
---

# **Using the** `ADI` in an App

An in-memory store works well enough for small applications, but some additional caching is required as you begin to scale. This can come with issues you have multiple components either updating or reading from a cache store. 

For maximum profit, it is important to identify a single source of truth for your app data. 

The expected/assumed flow of data is:

    remote -> [ ADI -> (cache) -> ]  -> [ App state -> ] UI component

where `[ App state ]` represents some state manager like **Redux**, **Vuex**, or **raphsducks**. It is entirely optional, since a component can also subscribe to the `ADI` directly. As you can see, the `ADI` only deals with receiving the data from some source, caching, and then emitting it. 

Using the ADI, the following would have the same effect: 

> - Component subscribes to some global `state` using `onChange` listener
> - On load, check `state` for data
>   - If not found, call `ADI.publishItem( dataKey )`
> - Await `state` updates via `onChange` listener
>   - Use data from `state` in `onChange` listener

OR

> - Component subscribes to ADI using `onChange` listener
> - On load, Component calls `ADI.publishItem( dataKey )`
>   - `onChange` is triggered 
>     - Use data in `onChange` listener

OR

> - On load, Component calls `ADI.publishItem( dataKey )`
>   - Awaits response, and stores in a const `data`



## Development

First install dependencies:

```sh
npm install
```

To create a production build:

```sh
npm run build-prod
```

To create a development build:

```sh
npm run build-dev
```

## Running

```sh
node dist/bundle.js
```

## Testing

To run unit tests:

```sh
npm test
```

## Credits

Made with [createapp.dev](https://createapp.dev/)
