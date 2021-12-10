import { Synchronizer } from "@splitsoftware/splitio-sync-tools";
import {
  SplitFactory,
  PluggableStorage,
  ErrorLogger
} from "@splitsoftware/splitio-browserjs";
import { SplitStorageWrapper } from "./SplitStorageWrapper";
// In order for the workers runtime to find the class that implements
// our Durable Object namespace, we must export it from the root module.
export { SplitStorage } from "./SplitStorage";

// Server-side API key is required for Synchronizer and sufficient for JS Browser SDK
const apiKey = "<YOUR SERVER-SIDE API KEY>";

// Get reference to Split Storage durable object
function getSplitStorage(env: Env) {
  // Here we use Split API key as durable object name, but any name can be used.
  // Actually, multiple SDKs with different API keys could access the same durable object,
  // as long as they set different storage prefixes to avoid data collisions.
  const id = env.SplitStorage.idFromName(apiKey);
  return env.SplitStorage.get(id);
}

// Synchronize rollout plan data into Split Storage durable object
async function synchronizeSplitStorage(env: Env) {
  const synchronizer = new Synchronizer({
    core: {
      authorizationKey: apiKey
    },
    storage: {
      type: "PLUGGABLE",
      wrapper: SplitStorageWrapper(getSplitStorage(env))
    },
    // Disable or keep only ERROR log level in production, to minimize performance impact
    debug: "ERROR"
  });

  await synchronizer.execute();
}

/**
 * Worker
 */
export default {
  // Handle user requests. Use Split SDK to evaluate features and track events
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    // Request example `/get-treatment?key=some_key&split=some_split`
    if (url.pathname === `/get-treatment`) {
      const key = url.searchParams.get("key");
      if (!key) return new Response("No key provided", { status: 400 });

      const split = url.searchParams.get("split");
      if (!split) return new Response("No split provided", { status: 400 });

      // SDK instances are created in 'consumer_partial' mode, which access
      // the Split Storage to get the rollout plan data for evaluations
      const factory = SplitFactory({
        core: {
          authorizationKey: apiKey,
          key
        },
        mode: "consumer_partial",
        storage: PluggableStorage({
          wrapper: SplitStorageWrapper(getSplitStorage(env))
        }),
        // Disable or keep only ERROR log level in production, to minimize performance impact
        debug: ErrorLogger()
      });
      const client = factory.client();

      await client.ready();

      // Async evaluation, because it access the rollout plan from the Split Storage
      const treatment = await client.getTreatment(split);

      // Flush data to Split backend. But not await, in order to reduce response latency
      client.destroy();

      // Do something with the treatment
      return new Response(`Treatment: ${treatment}`);
    }

    /** Control endpoints. Use them to synchronize and clean up the Split Storage */

    // Requests to `/sync` will synchronize your Split Storage, same as cron trigger requests
    if (url.pathname === "/sync") {
      try {
        await synchronizeSplitStorage(env);
        return new Response("Synchronization success");
      } catch (e) {
        return new Response(`Synchronization fail: ${e}`);
      }
    }

    // Requests to `/delete-all` will clean up all data from your Split Storage. SDK instances will evaluate to 'control'
    if (url.pathname === "/delete-all") {
      const durableObjectStub = getSplitStorage(env);
      return durableObjectStub.fetch("https://dummy-url/deleteAll");
    }

    return new Response("Not found", { status: 404 });
  },

  // Scheduled requests by a cron trigger, use to synchronize your Split Storage periodically
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ) {
    await synchronizeSplitStorage(env);
  }
};

interface Env {
  SplitStorage: DurableObjectNamespace;
}
