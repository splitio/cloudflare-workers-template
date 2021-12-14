/**
 * Durable object to use as Split Storage
 */
export class SplitStorage {
  // https://developers.cloudflare.com/workers/runtime-apis/durable-objects#transactional-storage-api
  storage: DurableObjectStorage;

  constructor(state: DurableObjectState) {
    this.storage = state.storage!;
  }

  // Handle HTTP requests from clients.
  async fetch(request: Request) {
    let url = new URL(request.url);
    let reqBody, result;
    let key = url.searchParams.get("key");

    switch (url.pathname) {
      /** Key-Value operations */

      case "/get":
        // Setting allowConcurrency to improve performance. By default, the system will prevent concurrent events from executing while awaiting a read operation
        result =
          (await this.storage.get<string>(key!, { allowConcurrency: true })) ||
          null;
        break;

      case "/set":
        reqBody = await request.json<string>();
        // There is no need to await write operations. Any series of write operations with no intervening await will automatically be submitted atomically
        this.storage.put(key!, reqBody);
        break;

      case "/getAndSet":
        // Using default allowConcurrency (false), to guarantee atomic operation.
        // A series of reads followed by a series of writes are automatically atomic and behave like a transaction
        const getResult = this.storage.get<string>(key!);
        reqBody = await request.json<string>();
        this.storage.put(key!, reqBody);
        result = (await getResult) || null;
        break;

      case "/del":
        this.storage.delete(key!);
        break;

      case "/getKeysByPrefix":
        const prefix = url.searchParams.get("prefix")!;
        result = await this.storage.list<string>({
          prefix,
          allowConcurrency: true
        });
        result = Array.from(result.keys());
        break;

      case "/getMany":
        const keys = url.searchParams.get("keys")!.split(",");
        const map = await this.storage.get<string>(keys, {
          allowConcurrency: true
        });
        result = keys.map(key => map.get(key) || null);
        break;

      case "/incr":
        result = await this.storage.get<number>(key!); // allowConcurrency false
        result = result ? result + 1 : 1;
        this.storage.put(key!, result);
        break;

      case "/decr":
        result = await this.storage.get<number>(key!); // allowConcurrency false
        result = result ? result - 1 : -1;
        this.storage.put(key!, result);
        break;

      /** Set operations */

      case "/itemContains":
        const item = url.searchParams.get("item")!;
        result = await this.storage.get<Set<string>>(key!, {
          allowConcurrency: true
        });
        result = result && result.has(item) ? true : false;
        break;

      case "/addItems":
        reqBody = await request.json<string[]>();
        result =
          (await this.storage.get<Set<string>>(key!)) || new Set<string>(); // allowConcurrency false
        for (let i = 0; i < reqBody.length; i++) result.add(reqBody[i]);
        this.storage.put(key!, result);
        break;

      case "/removeItems":
        reqBody = await request.json<string[]>();
        result = await this.storage.get<Set<string>>(key!); // allowConcurrency false
        if (result) {
          for (let i = 0; i < reqBody.length; i++) result.delete(reqBody[i]);
          this.storage.put(key!, result);
        }
        break;

      case "/getItems":
        result = await this.storage.get<Set<string>>(key!, {
          allowConcurrency: true
        });
        result = Array.from(result || new Set<string>());
        break;

      /** Queue operations */
      // Since SDK must run in partial consumer mode, events and impressions are
      // not tracked and so there is no need to implement Queue operations

      case "/pushItems":
        break;

      case "/popItems":
        result = new Array<string>();
        break;

      case "/getItemsCount":
        result = 0;
        break;

      // Extra endpoint to clear the storage, for testing or fixing issues when migrating the durable object instance
      case "/deleteAll":
        await this.storage.deleteAll();
        break;

      default:
        return new Response("Not found", { status: 404 });
    }

    return new Response(
      result !== undefined ? JSON.stringify(result) : undefined
    );
  }
}
