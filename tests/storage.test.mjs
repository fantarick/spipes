import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { LEVELS } from "../src/levels.js";
import { STORAGE_KEY } from "../src/constants.js";

const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
let moduleId = 0;

afterEach(() => {
  if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
  else delete globalThis.localStorage;
});

function setStorage(storage) {
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
}

function freshStorage() {
  return import(`../src/storage.js?test=${moduleId++}`);
}

test("a blocked storage getter does not prevent startup or session progress", async () => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() { throw new Error("Storage is blocked"); },
  });
  const storage = await freshStorage();
  assert.equal(storage.getHighestUnlocked(), 0);
  storage.saveHighestUnlocked(2);
  assert.equal(storage.getHighestUnlocked(), 2);
});

test("an unavailable storage API still permits session progress", async () => {
  delete globalThis.localStorage;
  const storage = await freshStorage();
  assert.equal(storage.getHighestUnlocked(), 0);
  storage.saveHighestUnlocked(1);
  assert.equal(storage.getHighestUnlocked(), 1);
});

test("failed writes preserve progress even when later reads return stale data", async () => {
  setStorage({
    getItem: () => "1",
    setItem() { throw new Error("Storage quota exceeded"); },
  });
  const storage = await freshStorage();
  assert.equal(storage.getHighestUnlocked(), 1);
  storage.saveHighestUnlocked(3);
  assert.equal(storage.getHighestUnlocked(), 3);
});

test("failed reads preserve previously loaded progress", async () => {
  setStorage({ getItem: () => "2" });
  const storage = await freshStorage();
  assert.equal(storage.getHighestUnlocked(), 2);
  setStorage({ getItem() { throw new Error("Read denied"); } });
  assert.equal(storage.getHighestUnlocked(), 2);
});

test("available storage persists and reloads progress under the existing key", async () => {
  const data = new Map([[STORAGE_KEY, "1"]]);
  setStorage({ getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value) });
  const storage = await freshStorage();
  storage.saveHighestUnlocked(3);
  assert.equal(data.get(STORAGE_KEY), "3");
  const reloaded = await freshStorage();
  assert.equal(reloaded.getHighestUnlocked(), 3);
});

test("lower saves never erase existing unlocked levels", async () => {
  const data = new Map([[STORAGE_KEY, "3"]]);
  setStorage({ getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value) });
  const storage = await freshStorage();
  storage.saveHighestUnlocked(1);
  assert.equal(storage.getHighestUnlocked(), 3);
  assert.equal(data.get(STORAGE_KEY), "3");
});

test("saved values remain finite, floored and bounded to existing levels", async () => {
  for (const [value, expected] of [
    [null, 0], ["", 0], ["broken", 0], ["Infinity", 0],
    ["-2", 0], ["2.9", 2], ["999", LEVELS.length - 1],
  ]) {
    setStorage({ getItem: () => value });
    const storage = await freshStorage();
    assert.equal(storage.getHighestUnlocked(), expected, String(value));
  }
});
