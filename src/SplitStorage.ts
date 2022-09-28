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
    let param = url.searchParams.get("param");

    switch (url.pathname) {
      /** Key-Value operations */

      case "/get":
        // Setting allowConcurrency to improve performance. By default, the system will prevent concurrent events from executing while awaiting a read operation
        result =
          (await this.storage.get<string>(param!, {
            allowConcurrency: true
          })) || null;
        break;

      case "/set":
        reqBody = await request.json<string>();
        // There is no need to await write operations. Any series of write operations with no intervening await will automatically be submitted atomically
        this.storage.put(param!, reqBody);
        break;

      case "/getAndSet":
        // Using default allowConcurrency (false), to guarantee atomic operation.
        // A series of reads followed by a series of writes are automatically atomic and behave like a transaction
        const getResult = this.storage.get<string>(param!);
        reqBody = await request.json<string>();
        this.storage.put(param!, reqBody);
        result = (await getResult) || null;
        break;

      case "/del":
        this.storage.delete(param!);
        break;

      case "/getKeysByPrefix":
        result = await this.storage.list<string>({
          prefix: param!,
          allowConcurrency: true
        });
        result = Array.from(result.keys());
        break;

      case "/getMany":
        const keys = param!.split(",");
        const map = await this.storage.get<string>(keys, {
          allowConcurrency: true
        });
        result = keys.map(key => map.get(key) || null);
        break;

      case "/incr":
        reqBody = await request.json<number>();
        result = await this.storage.get<number>(param!); // allowConcurrency false
        result = result ? result + reqBody : reqBody;
        this.storage.put(param!, result);
        break;

      case "/decr":
        reqBody = await request.json<number>();
        result = await this.storage.get<number>(param!); // allowConcurrency false
        result = result ? result - reqBody : -reqBody;
        this.storage.put(param!, result);
        break;

      /** Set operations */

      case "/itemContains":
        reqBody = await request.json<string>();
        result = await this.storage.get<Set<string>>(param!, {
          allowConcurrency: true
        });
        result = result && result.has(reqBody) ? true : false;
        break;

      case "/addItems":
        reqBody = await request.json<string[]>();
        result =
          (await this.storage.get<Set<string>>(param!)) || new Set<string>(); // allowConcurrency false
        for (let i = 0; i < reqBody.length; i++) result.add(reqBody[i]);
        this.storage.put(param!, result);
        break;

      case "/removeItems":
        reqBody = await request.json<string[]>();
        result = await this.storage.get<Set<string>>(param!); // allowConcurrency false
        if (result) {
          for (let i = 0; i < reqBody.length; i++) result.delete(reqBody[i]);
          this.storage.put(param!, result);
        }
        break;

      case "/getItems":
        result = await this.storage.get<Set<string>>(param!, {
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
