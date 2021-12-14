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

    async get(key: string) {
      // For now, fetch requires a valid URL. So we have to provide a dummy URL that will be ignored at the other end
      // See https://github.com/cloudflare/workers-chat-demo/blob/master/src/chat.mjs#L518
      const response = await durableObject.fetch(
        `https://dummy-url/get?key=${key}`
      );
      return response.json<string>();
    },
    async set(key: string, value: string) {
      const response = await durableObject.fetch(
        `https://dummy-url/set?key=${key}`,
        { method: "POST", body: JSON.stringify(value) }
      );
      return response.ok;
    },
    async getAndSet(key: string, value: string) {
      const response = await durableObject.fetch(
        `https://dummy-url/getAndSet?key=${key}`,
        { method: "POST", body: JSON.stringify(value) }
      );
      return response.json<string>();
    },
    async del(key: string) {
      const response = await durableObject.fetch(
        `https://dummy-url/del?key=${key}`
      );
      return response.ok;
    },
    async getKeysByPrefix(prefix: string) {
      const response = await durableObject.fetch(
        `https://dummy-url/getKeysByPrefix?prefix=${prefix}`
      );
      return response.json<string[]>();
    },
    async getMany(keys: string[]) {
      const response = await durableObject.fetch(
        `https://dummy-url/getMany?keys=${keys.join(",")}`
      );
      return response.json<string[]>();
    },
    async incr(key: string) {
      const response = await durableObject.fetch(
        `https://dummy-url/incr?key=${key}`
      );
      return response.json<number>();
    },
    async decr(key: string) {
      const response = await durableObject.fetch(
        `https://dummy-url/decr?key=${key}`
      );
      return response.json<number>();
    },

    /** Set operations */

    async itemContains(key: string, item: string) {
      const response = await durableObject.fetch(
        `https://dummy-url/itemContains?key=${key}&item=${item}`
      );
      return response.json<boolean>();
    },
    async addItems(key: string, items: string[]) {
      await durableObject.fetch(`https://dummy-url/addItems?key=${key}`, {
        method: "POST",
        body: JSON.stringify(items)
      });
    },
    async removeItems(key: string, items: string[]) {
      await durableObject.fetch(`https://dummy-url/removeItems?key=${key}`, {
        method: "POST",
        body: JSON.stringify(items)
      });
    },
    async getItems(key: string) {
      const response = await durableObject.fetch(
        `https://dummy-url/getItems?key=${key}`
      );
      return response.json<string[]>();
    },

    // No-op. No need to connect to DurableObject stub
    async connect() {
      if (!durableObject) throw new Error("Durable Object not provided");
    },

    // No-op. No need to disconnect from DurableObject stub
    async disconnect() {},

    /** Queue operations */
    // Since SDK must run in partial consumer mode, events and impressions are
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
