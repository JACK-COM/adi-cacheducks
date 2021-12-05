# **Application Data Cache API** Spec

## `ADI` Description
The **Data Cache API** (or *Application Data Interface* -- `ADI`) is a **pub-sub cache manager for the front-end**. It is used for predictable data-fetching and caching in a front-end application.\
The interface focuses on locally (and efficiently) storing and retrieving application data, while remaining independent of UI frameworks or programming paradigms. Developers can implement using either OOP or functional approaches, without penalties either way.

---
## Definitions

The terms below are kept deliberately vague so that the implementer can choose the best tools for their task.
* `ADI`: The **App data interface** instance generated for you by the library. 
* `cache`: any data cache implementation, such as `IndexedDB` or `localForage` in browsers, or `Redis` in the backend. This `MUST` be provided to `ADI` on initialization.

**Note that** the `cache` `MUST` be supplied to `ADI` on initialization, since the latter writes to/reads from the former during the application lifecycle. 

---

# **Application Data Interface** | Exports
The library contains a single export, `createDataCacheAPI( cacheMap: ADICacheDBMap )`\
This function expects a valid `cacheMap`, a key-value store where every `key` is the name of a `storage` or `cache` instance (e.g. name of a table in **IndexedDB**) and the *value* of the key is an object that implements `ADIDBInterface`, such that:
### Example
```typescript
// Example of a cacheMap implementation
const cacheMap = {
  // There can be an arbitrary number of tables that
  // follow any preferred naming conventions.
  usersTable: {
    listItems(): Promise<T[]>;
    getItem(id: any): Promise<T | null>;
    putItem(id: any, val: T): Promise<T | null>;
    removeItem(id: any): Promise<any>;
  }
}


const myAPI = createDataCacheAPI( cacheMap )
```

`createDataCacheAPI( ... )` returns an `AppDataInterface` with the following methods:

### ADI instance
```typescript
interface AppDataInterface {
  cacheItem(key: string, value: any, cacheKey?: string): any;
  cacheMultiple(items: CacheItemArgs[]): void
  isInitialized(): boolean
  listItems(
    cacheKey: string,
    fallback: () => Promise<any[]>
  )
  onApplicationEnd()
  onApplicationStart()
  publishItem(
    key: string,
    cacheKey?: string,
    fallback: () => Promise<any | null>
  )
  removeItem(key: string, cacheKey?: string)
  subscribe(listener: KeyValConsumer): Unsubscriber
  subscribeToCaches(
    listener: KeyValConsumer,
    caches: string[],
    withinBounds = (v: any, c = "1") => Boolean(v && c)
  )
}
```

# **Application Data Interface** | Methods

## Lifecycle

### `ADI.isInitialized(): boolean`
Asserts whether the `ADI` instance has been initialized with a call to` onApplicationStart()`. While this value is `false`, any call to a non-`subscribe` method on the `ADI` instance will throw a gigantic flaming error.

### `ADI.onApplicationStart(  )`
This function initializes the `ADI` and gets it ready for front-end (or other app) interaction. It must be called before using any instance methods (excluding `subscribe` and `subscribeToCaches`), or `ADI` will throw an error.

```typescript
const dataAPI = createDataCacheAPI( cacheMap );

dataAPI.onApplicationStart();
dataAPI.cacheItem( ... ) // no errors
```


### `ADI.onApplicationEnd()` 
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
const a = await dataAPI.listItems("someDB")

// Option 2: To enforce unidirectional data-flow (external -> cache -> state),
// call "publishItem" and wait for a subscription to be triggered.
dataAPI.listItems("someDB");
```
  

### `async ADI.publishItem( key: string, cache?: string, fb?: () => Promise<any> )`
Retrieve data from the cache, and publish to all subscribers. Takes an optional `fallback` function to fetch the data if it is not in cache. If used, the `fallback` response will be cached for future reference. 

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
const a = await dataAPI.publishItem("someKey")

// Option 2: To enforce unidirectional data-flow (external -> cache -> state),
// call "publishItem" and wait for a subscription to be triggered.
dataAPI.publishItem("someKey");
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

## Mutation watch (subscribing for changes)

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
  listItems(): Promise<T[]>;
  getItem(id: any): Promise<T | null>;
  putItem(id: any, val: T): Promise<T | null>;
  removeItem(id: any): Promise<any>;
} 
```
where the generic `<T>` represents your database model.\
(**Example:** if your database model is `User`, then `listItems` should return a list of type `User[]`)

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
