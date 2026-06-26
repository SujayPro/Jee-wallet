import { EventEmitter } from 'events';
import { ContentBridge, NodeWalletMethod } from '@jeewallet/content';
import { PocketNetworkMethod } from '@jeewallet/content';
import * as uuid from 'uuid';

declare global {
  interface Window {
    jeeWallet: PocketNetwork
    pocketNetwork: any
    prevPocketNetwork: any
  }
}

// Security: pending callbacks keyed by request id.
// We do NOT store a reusable secret key because anything visible in the
// MAIN world JavaScript context can be read by any page script.
// Instead we rely on:
//   1. Each request carrying a unique UUID that only the content-bridge generates.
//   2. The content script (ISOLATED world) ignoring all messages it did not
//      initiate and echoing the same id in the response type so we can match it.
let callbacks: {[id: string]: (res: any) => void} = {};

window.addEventListener('message', async (event) => {
  // Only process responses from our own content script (same window origin).
  if (event.source !== window) {
    return;
  }
  const idPatt = /^pocket-network-([0-9a-f\-]+)$/;
  const { data } = event;
  const { type = '', response } = data as {type: string, response: any};
  const matches = type.match(idPatt);
  if(matches) {
    const [ , id ] = matches;
    if(callbacks[id]) {
      callbacks[id](response);
      delete callbacks[id];
    }
  }
});

export class PocketNetwork extends EventEmitter implements ContentBridge {

  async send(method: PocketNetworkMethod|NodeWalletMethod, params?: any[]): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const id = uuid.v4();
      callbacks[id] = (res) => {
        if('error' in res) {
          console.error(res.error);
          reject(new Error(res.error.message));
        } else if('result' in res) {
          resolve(res.result);
        } else {
          resolve({});
        }
      };
      window.postMessage({
        type: 'pocket-network',
        id,
        method,
        params: params || [],
      });
    });
  }

}

export const startContentBridge = () => {
  console.log('Inject JEE WALLET content script');
  if(window.jeeWallet || window.pocketNetwork) {
    window.prevPocketNetwork = window.jeeWallet || window.pocketNetwork;
  }
  window.jeeWallet = new PocketNetwork();
  window.pocketNetwork = window.jeeWallet;
};
