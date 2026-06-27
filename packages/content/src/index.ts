import { PocketNetwork } from './pocket-network';
import { API } from './api';
import { ext, Messager } from '@jeewallet/util-browser';

declare global {
  interface Window {
    pocketNetwork: any
    prevPocketNetwork: any
  }
}

export const startContent = () => {
  const messager = new Messager(ext.runtime);
  const api = new API(messager);
  const pocketNetwork = new PocketNetwork(api);

  // Track request IDs we have already processed to prevent replay attacks.
  const processedIds = new Set<string>();

  window.addEventListener('message', async (event) => {
    // Security: only handle messages posted by the same window (our content-bridge).
    // This rejects messages from iframes, other origins, and cross-frame attacks.
    if (event.source !== window) {
      return;
    }
    // Security: only handle messages that actually came from the same origin.
    if (event.origin !== window.location.origin) {
      return;
    }

    const { data } = event;
    const { type = '', id = '' } = data;
    if(type === 'pocket-network') {
      const responseType = `${type}-${id}`;
      try {
        // Validate the id is a well-formed UUID to reject malformed messages.
        if(!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) {
          throw new Error('Invalid or missing request id');
        }
        // Replay protection: ignore duplicate ids.
        if (processedIds.has(id)) {
          return;
        }
        processedIds.add(id);
        // Keep the set bounded — evict oldest entries once it grows large.
        if (processedIds.size > 1000) {
          const first = processedIds.values().next().value as string;
          if (first) processedIds.delete(first);
        }

        const { method, params } = data;
        const res = await pocketNetwork.send(method, params);
        window.postMessage({
          type: responseType,
          response: {
            result: res,
          },
        });
      } catch(err: any) {
        window.postMessage({
          type: responseType,
          response: {
            error: {
              // Never leak internal stack traces to the web page
              message: err.message || 'An error occurred.',
            },
          },
        });
      }
    }
  });
};

export * from './pocket-network';
export * from './content-bridge';
