import { Synchronizer } from "@splitsoftware/splitio-sync-tools";
// Documentation: https://help.split.io/hc/en-us/articles/360058730852-Browser-SDK
import {
  SplitFactory,
  PluggableStorage,
  ErrorLogger
} from "@splitsoftware/splitio-browserjs";
import { SplitStorageWrapper } from "./SplitStorageWrapper";
// In order for the workers runtime to find the class that implements
// our Durable Object namespace, we must export it from the root module.
export { SplitStorage } from "./SplitStorage";

/**
 * Worker script.
 *
 * Implemented using the new "Module Worker" syntax (See https://developers.cloudflare.com/workers/learning/migrating-to-module-workers).
 * This new syntax is required when using Durable Objects, because they are implemented by classes, and those classes need to be exported.
 *
 * To be deployed, this worker must be configured with a Durable Object namespace bindings call 'SplitStorage', which is already configured
 * in the wrangler.toml file. Take into account that Durable Objects are only available with a Workers paid subscription.
 */
export default {
  // Handle HTTP incoming requests
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    switch (url.pathname) {
      // Use Split SDK to evaluate a feature. Request example `/get-treatment?key=some_key&split=some_split`
      case "/get-treatment":
        return handleGetTreatmentRequest(url, env);

      // Synchronize your Split Storage, same as scheduled requests
      case "/sync":
        return handleSynchronization(env);

      // Clean up all data from your Split Storage. SDK instances will evaluate to 'control'
      case "/delete-all":
        const durableObjectStub = getSplitStorage(env);
        return durableObjectStub.fetch("https://dummy-url/deleteAll");

      default:
        return new Response("Not found", { status: 404 });
    }
  },

  // Handle scheduled requests by a cron trigger, use to synchronize your Split Storage periodically
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ) {
    return handleSynchronization(env);
  }
};

interface Env {
  SplitStorage: DurableObjectNamespace;
}

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

// Use Split SDK to evaluate a feature
async function handleGetTreatmentRequest(url: URL, env: Env) {
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
    startup: {
      // If for some reason `getSplitStorage` cannot retrieve an instance, the SDK will time out almost immediately
      readyTimeout: 0.001
    },
    // Disable or keep only ERROR log level in production, to minimize performance impact
    debug: ErrorLogger()
  });
  const client = factory.client();

  // Await until the SDK is ready or has timed out, for which treatment evaluations will be 'control'.
  // Timed out should never happen if SplitStorage durable object binding is properly configured.
  await new Promise(res => {
    client.on(client.Event.SDK_READY, res);
    client.on(client.Event.SDK_READY_TIMED_OUT, res);
  });

  // Async evaluation, because it access the rollout plan from the Split Storage
  const treatment = await client.getTreatment(split);

  // Flush data to Split backend. But not await, in order to reduce response latency
  client.destroy();

  // Do something with the treatment
  return new Response(`Treatment: ${treatment}`);
}

// Synchronize rollout plan data into Split Storage durable object
async function handleSynchronization(env: Env) {
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
  return new Response("Synchronization finished");
}
