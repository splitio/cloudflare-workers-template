/**
 * Creates a storage wrapper for a given Split Storage Durable Object
 * https://developers.cloudflare.com/workers/runtime-apis/durable-objects#object-stubs
 *
 * @param {DurableObjectStub} durableObject durable object stub
 * @returns {import("@splitsoftware/splitio-commons/src/storages/types").IPluggableStorageWrapper} storage wrapper
 */
export function SplitStorageWrapper(durableObject: DurableObjectStub) {
  return {
    /** Key-Value operations */

    /**
     * Get the value of given `key`.
     *
     * @function get
     * @param {string} key Item to retrieve
     * @returns {Promise<string | null>} A promise that resolves with the element value associated with the specified `key`,
     * or null if the key does not exist.
     */
    async get(key: string) {
      // For now, fetch requires a valid URL. So we have to provide a dummy URL that will be ignored at the other end
      // See https://github.com/cloudflare/workers-chat-demo/blob/master/src/chat.mjs#L518
      const response = await durableObject.fetch(
        `https://dummy-url/get?key=${key}`
      );
      return response.json<string>();
    },

    /**
     * Add or update an item with a specified `key` and `value`.
     *
     * @function set
     * @param {string} key Item to update
     * @param {string} value Value to set
     * @returns {Promise<boolean>} A promise that resolves if the operation success, whether the key was added or updated.
     */
    async set(key: string, value: string) {
      const response = await durableObject.fetch(
        `https://dummy-url/set?key=${key}`,
        { method: "POST", body: JSON.stringify(value) }
      );
      return response.ok;
    },

    /**
     * Add or update an item with a specified `key` and `value`.
     *
     * @function getAndSet
     * @param {string} key Item to update
     * @param {string} value Value to set
     * @returns {Promise<string | null>} A promise that resolves with the previous value associated to the given `key`, or null if not set.
     */
    async getAndSet(key: string, value: string) {
      const response = await durableObject.fetch(
        `https://dummy-url/getAndSet?key=${key}`,
        { method: "POST", body: JSON.stringify(value) }
      );
      return response.json<string>();
    },

    /**
     * Removes the specified item by `key`.
     *
     * @function del
     * @param {string} key Item to delete
     * @returns {Promise<boolean>} A promise that resolves if the operation success, whether the key existed and was removed or it didn't exist.
     */
    async del(key: string) {
      const response = await durableObject.fetch(
        `https://dummy-url/del?key=${key}`
      );
      return response.ok;
    },

    /**
     * Returns all keys matching the given prefix.
     *
     * @function getKeysByPrefix
     * @param {string} prefix String prefix to match
     * @returns {Promise<string[]>} A promise that resolves with the list of keys that match the given `prefix`.
     */
    async getKeysByPrefix(prefix: string) {
      const response = await durableObject.fetch(
        `https://dummy-url/getKeysByPrefix?prefix=${prefix}`
      );
      return response.json<string[]>();
    },

    /**
     * Returns the values of all given `keys`.
     *
     * @function getMany
     * @param {string[]} keys List of keys to retrieve
     * @returns {Promise<(string | null)[]>} A promise that resolves with the list of items associated with the specified list of `keys`.
     * For every key that does not hold a string value or does not exist, null is returned.
     */
    async getMany(keys: string[]) {
      const response = await durableObject.fetch(
        `https://dummy-url/getMany?keys=${keys.join(",")}`
      );
      return response.json<string[]>();
    },

    /** Integer operations */

    /**
     * Increments in 1 the given `key` value or set it to 1 if the value doesn't exist.
     *
     * @function incr
     * @param {string} key Key to increment
     * @returns {Promise<number>} A promise that resolves with the value of key after the increment.
     */
    async incr(key: string) {
      const response = await durableObject.fetch(
        `https://dummy-url/incr?key=${key}`
      );
      return response.json<number>();
    },

    /**
     * Decrements in 1 the given `key` value or set it to -1 if the value doesn't exist.
     *
     * @function decr
     * @param {string} key Key to decrement
     * @returns {Promise<number>} A promise that resolves with the value of key after the decrement.
     */
    async decr(key: string) {
      const response = await durableObject.fetch(
        `https://dummy-url/decr?key=${key}`
      );
      return response.json<number>();
    },

    /** Set operations */

    /**
     * Returns if item is a member of a set.
     *
     * @function itemContains
     * @param {string} key Set key
     * @param {string} item Item value
     * @returns {Promise<boolean>} A promise that resolves with true boolean value if `item` is a member of the set stored at `key`,
     * or false if it is not a member or `key` set does not exist.
     */
    async itemContains(key: string, item: string) {
      const response = await durableObject.fetch(
        `https://dummy-url/itemContains?key=${key}&item=${item}`
      );
      return response.json<boolean>();
    },

    /**
     * Add the specified `items` to the set stored at `key`. Those items that are already part of the set are ignored.
     * If key does not exist, an empty set is created before adding the items.
     *
     * @function addItems
     * @param {string} key Set key
     * @param {string} items Items to add
     * @returns {Promise<boolean | void>} A promise that resolves if the operation success.
     */
    async addItems(key: string, items: string[]) {
      await durableObject.fetch(`https://dummy-url/addItems?key=${key}`, {
        method: "POST",
        body: JSON.stringify(items)
      });
    },

    /**
     * Remove the specified `items` from the set stored at `key`. Those items that are not part of the set are ignored.
     *
     * @function removeItems
     * @param {string} key Set key
     * @param {string} items Items to remove
     * @returns {Promise<boolean | void>} A promise that resolves if the operation success. If key does not exist, the promise also resolves.
     */
    async removeItems(key: string, items: string[]) {
      await durableObject.fetch(`https://dummy-url/removeItems?key=${key}`, {
        method: "POST",
        body: JSON.stringify(items)
      });
    },

    /**
     * Returns all the items of the `key` set.
     *
     * @function getItems
     * @param {string} key Set key
     * @returns {Promise<string[]>} A promise that resolves with the list of items. If key does not exist, the result is an empty list.
     */
    async getItems(key: string) {
      const response = await durableObject.fetch(
        `https://dummy-url/getItems?key=${key}`
      );
      return response.json<string[]>();
    },

    // No-op. No need to connect to DurableObject stub
    async connect() {
      // Never throws if Durable Object namespace binding is properly configured
      if (!durableObject) throw new Error("Durable Object stub not provided");
    },

    // No-op. No need to disconnect from DurableObject stub
    async disconnect() {},

    /** Queue operations */
    // Since Split SDK must run in partial consumer mode, events and impressions are
    // not tracked and so there is no need to implement Queue operations

    async pushItems(key: string, items: string[]) {},

    async popItems(key: string, count: number) {
      return [];
    },

    async getItemsCount(key: string) {
      return 0;
    }
  };
}
