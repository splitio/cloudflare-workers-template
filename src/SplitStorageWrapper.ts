/**
 * Creates a storage wrapper for a given Split Storage Durable Object
 * https://developers.cloudflare.com/workers/runtime-apis/durable-objects#object-stubs
 *
 * @param {DurableObjectStub} durableObject durable object stub
 * @returns {import("@splitsoftware/splitio-commons/src/storages/types").IPluggableStorageWrapper} storage wrapper
 */
export function SplitStorageWrapper(durableObject: DurableObjectStub) {
  function doFetch(path: string, param: string, param2?: any) {
    // For now, fetch requires a valid URL. So we have to provide a dummy URL that will be ignored at the other end
    // See https://github.com/cloudflare/workers-chat-demo/blob/master/src/chat.mjs#L518
    return durableObject.fetch(
      `https://dummy-url/${path}?param=${param}`,
      param2 && {
        method: "POST",
        body: JSON.stringify(param2)
      }
    );
  }

  return {
    /** Key-Value operations */

    async get(key: string) {
      return (await doFetch("get", key)).json<string>();
    },
    async set(key: string, value: string) {
      return (await doFetch("set", key, value)).ok;
    },
    async getAndSet(key: string, value: string) {
      return (await doFetch("getAndSet", key, value)).json<string>();
    },
    async del(key: string) {
      return (await doFetch("del", key)).ok;
    },
    async getKeysByPrefix(prefix: string) {
      return (await doFetch("getKeysByPrefix", prefix)).json<string[]>();
    },
    async getMany(keys: string[]) {
      return (await doFetch("getMany", keys.join(","))).json<string[]>();
    },
    async incr(key: string) {
      return (await doFetch("incr", key)).json<number>();
    },
    async decr(key: string) {
      return (await doFetch("decr", key)).json<number>();
    },

    /** Set operations */

    async itemContains(key: string, item: string) {
      return (await doFetch("itemContains", key, item)).json<boolean>();
    },
    async addItems(key: string, items: string[]) {
      await doFetch("addItems", key, items);
    },
    async removeItems(key: string, items: string[]) {
      await doFetch("removeItems", key, items);
    },
    async getItems(key: string) {
      return (await doFetch("getItems", key)).json<string[]>();
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
