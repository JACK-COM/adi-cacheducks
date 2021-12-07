/**
 * @jest-environment jsdom
 */
import createDataCacheAPI from ".";

/** db/localStorage CRUD Helper */
const makeDBCache = () => ({
  getItem(id: string) {
    return Promise.resolve(id);
  },
  putItem(val: any) {
    return Promise.resolve(val);
  },
  listItems() {
    return Promise.resolve({ data: [] });
  },
  removeItem(id: any) {
    return Promise.resolve(id);
  },
});

/** User-created interface for db/localStorage CRUD */
const cacheMap = {
  items: makeDBCache(),
  users: makeDBCache(),
};

/** Test API */
const testAPI = createDataCacheAPI(cacheMap);

describe("Application Data Interface API", () => {
  afterEach(() => testAPI.onApplicationEnd());

  it("Won't cache unless initialized", () => {
    expect(() => {
      testAPI.cacheItem("hello", "123");
    }).toThrow("ADI is not initialized");
  });

  it("Won't cache multiple unless initialized", () => {
    expect(() => {
      testAPI.cacheMultiple([{ key: "hello", value: "123" }]);
    }).toThrow("ADI is not initialized");
  });

  it("Won't retrieve/fetch/publish unless initialized", () => {
    expect.assertions(1);
    return testAPI
      .publishItem("hello")
      .catch((e) => expect(e.message).toBe("ADI is not initialized"));
  });

  it("Won't remove from cache unless initialized", () => {
    expect(() => {
      testAPI.removeItem("hello");
    }).toThrow("ADI is not initialized");
  });

  it("Requires a compliant cache map", () => {
    expect(() => {
      // @ts-ignore
      const someAPI = createDataCacheAPI({ yes: {} });
      someAPI.onApplicationStart();
      someAPI.cacheItem("hello", "123");
    }).toThrow(`Invalid ADI interface: DB "yes" has no methods`);
  });

  it("Requires every key in the 'init' Cache Map to be a compliant cache interface", () => {
    expect(() => {
      const bad = { ...makeDBCache(), listItems: null };
      // @ts-ignore
      const someAPI = createDataCacheAPI({ bad });
      someAPI.onApplicationStart();
      someAPI.publishItem("all", "bad");
    }).toThrow(`Invalid ADI interface for CacheMap DB "bad"`);
  });

  it("Requires subscribers to be functions", () => {
    expect(() => {
      // @ts-ignore (deliberately invalid args)
      testAPI.subscribe(null);
    }).toThrow("Invalid ADI subscriber");

    expect(() => {
      // @ts-ignore (deliberately invalid args)
      testAPI.subscribeToCaches(null, []);
    }).toThrow("Invalid ADI subscriber");
  });

  it("Requires a list of names for cache subscriptions", () => {
    expect(() => {
      testAPI.subscribeToCaches(jest.fn, []);
    }).toThrow("Subscription requires at least one cache name");
  });

  it("Requires a key to cache an item", () => {
    expect(() => {
      testAPI.onApplicationStart();
      // @ts-ignore (deliberately invalid args)
      testAPI.cacheItem();
    }).toThrow("Item Key was not supplied for caching");
  });

  it("Tracks initialization", () => {
    expect(testAPI.initialized).toBe(false);

    testAPI.onApplicationStart();
    expect(testAPI.initialized).toBe(true);

    testAPI.onApplicationEnd();
    expect(testAPI.initialized).toBe(false);
  });

  it("Notifies subscribers when a value is cached", async () => {
    const listener = jest.fn();
    const unsubscribe = testAPI.subscribe(listener);

    testAPI.onApplicationStart();
    testAPI.cacheItem("user1", "12345XXXXX");
    expect(listener).toHaveBeenCalledWith("user1", "12345XXXXX", undefined);

    unsubscribe();
    testAPI.cacheItem("user2", "67890XXXXX");
    expect(listener).toHaveBeenCalledTimes(1);

    localStorage.clear();
    testAPI.onApplicationEnd();
  });

  it("Notifies cache subscribers when a value is cached", async () => {
    const listener1 = jest.fn();
    const spy1 = jest.spyOn(cacheMap.users, "putItem");
    const unsubscribe = testAPI.subscribeToCaches(listener1, ["users"]);

    const listener2 = jest.fn();
    const spy2 = jest.spyOn(cacheMap.items, "putItem");
    const unsubscribe2 = testAPI.subscribeToCaches(listener2, ["items"]);

    testAPI.onApplicationStart();
    testAPI.cacheItem("user1", "12345XXXXX", "users");
    expect(spy1).toBeCalledWith("user1", "12345XXXXX");
    expect(listener1).toHaveBeenCalledWith("user1", "12345XXXXX", "users");

    expect(spy2).not.toHaveBeenCalled();
    expect(listener2).not.toHaveBeenCalled();

    unsubscribe();
    unsubscribe2();
    testAPI.onApplicationEnd();
  });

  it("Notifies subscribers when a value is retrieved", async () => {
    const listener = jest.fn();
    const unsubscribe = testAPI.subscribe(listener);

    testAPI.onApplicationStart();
    localStorage.setItem("hello", "123");

    return testAPI.publishItem("hello").then(() => {
      expect(listener).toHaveBeenCalledWith("hello", "123", undefined);
      localStorage.clear();
      unsubscribe();
    });
  });

  it("Attempts to retrieve a value from the correct db", async () => {
    const listener = jest.fn();
    const unsubscribe = testAPI.subscribe(listener);
    const spy = jest
      .spyOn(cacheMap.users, "getItem")
      // @ts-ignore
      .mockImplementation(() => Promise.resolve(null));
    const spy2 = jest.spyOn(cacheMap.items, "getItem");

    testAPI.onApplicationStart();

    return testAPI.getItem("doesNotExist", "users").then((val) => {
      expect(val).toBe(null);
      expect(spy).toHaveBeenCalled();
      expect(spy2).not.toHaveBeenCalled();
      expect(listener).toHaveBeenCalledWith("doesNotExist", null, "users");
      localStorage.clear();
      unsubscribe();
    });
  });

  it("Returns 'null' when a value cannot be retrieved", async () => {
    const listener = jest.fn();
    const unsubscribe = testAPI.subscribe(listener);

    testAPI.onApplicationStart();

    return testAPI.publishItem("hello").then((val) => {
      expect(val).toBe(undefined);
      expect(listener).toHaveBeenCalledWith("hello", null, undefined);
      localStorage.clear();
      unsubscribe();
    });
  });

  it("Returns an empty list when a db name is not supplied", async () => {
    const listener = jest.fn();
    const unsubscribe = testAPI.subscribe(listener);

    testAPI.onApplicationStart();

    // @ts-ignore (deliberately naughty)
    return testAPI.listItems({ cacheKey: undefined }).then((val) => {
      expect(JSON.stringify(val)).toBe(JSON.stringify([]));
      expect(listener).not.toHaveBeenCalled();
      unsubscribe();
    });
  });

  it("Returns an empty list when a db cannot be found", async () => {
    const listener = jest.fn();
    const unsubscribe = testAPI.subscribe(listener);

    testAPI.onApplicationStart();

    return testAPI.getItem("hello", "doesNotExist").then((val) => {
      expect(val).toBe(null);
      expect(listener).toHaveBeenCalledWith("hello", null, "doesNotExist");
      unsubscribe();
    });
  });

  it("Attempts to list all db items", async () => {
    const listener = jest.fn();
    const unsubscribe = testAPI.subscribe(listener);

    testAPI.onApplicationStart();

    return testAPI.listItems({ cacheKey: "users" }).then((val) => {
      expect(val.data).toBeDefined();
      expect(Array.isArray(val.data)).toBe(true);
      expect(listener).not.toHaveBeenCalled();
      unsubscribe();
    });
  });

  it("Uses a fallback to fetch data before notifying subscribers", async () => {
    const listener = jest.fn();
    const unsubscribe = testAPI.subscribe(listener);

    testAPI.onApplicationStart();
    const fallback = () => Promise.resolve("123");

    return testAPI.publishItem("hello", undefined, fallback).then(() => {
      expect(listener).toHaveBeenCalledWith("hello", "123", undefined);
      expect(localStorage.getItem("hello")).toBe("123");
      localStorage.clear();
      unsubscribe();
    });
  });

  it("Writes to localStorage when a cacheKey is not provided", async () => {
    testAPI.onApplicationStart();
    expect(localStorage.getItem("hello")).toBe(null);
    testAPI.cacheItem("hello", "123");
    expect(localStorage.getItem("hello")).toBe("123");

    localStorage.clear();
  });

  it("Writes to a local db when a cacheKey is provided", async () => {
    const spy = jest.spyOn(cacheMap.items, "putItem");
    testAPI.onApplicationStart();
    expect(localStorage.getItem("hello")).toBe(null);
    expect(spy).not.toHaveBeenCalled();

    testAPI.cacheItem("hello", "123", "items");
    expect(localStorage.getItem("hello")).toBe(null);
    expect(spy).toHaveBeenCalledWith("hello", "123");
  });

  it("Removes from localStorage when a cacheKey is NOT provided", async () => {
    const spy = jest.spyOn(cacheMap.items, "removeItem");
    const spy2 = jest.spyOn(cacheMap.users, "removeItem");

    localStorage.setItem("hello", "123");
    expect(localStorage.getItem("hello")).toBe("123");
    expect(spy).not.toHaveBeenCalled();
    expect(spy2).not.toHaveBeenCalled();

    testAPI.onApplicationStart();
    testAPI.removeItem("hello");
    expect(spy).not.toHaveBeenCalled();
    expect(spy2).not.toHaveBeenCalled();
    expect(localStorage.getItem("hello")).toBe(null);
  });

  it("Removes from local db when a cacheKey is provided", async () => {
    const spy = jest.spyOn(cacheMap.items, "removeItem");
    const spy2 = jest.spyOn(cacheMap.users, "removeItem");
    testAPI.onApplicationStart();
    expect(spy).not.toHaveBeenCalled();
    expect(spy2).not.toHaveBeenCalled();

    testAPI.removeItem("hello", "items");
    expect(spy).toHaveBeenCalledWith("hello");
    expect(spy2).not.toHaveBeenCalled();
  });
});
