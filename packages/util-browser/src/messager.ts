export class Messager {

  _runtime: typeof chrome.runtime;
  _handlers: {[eventName: string]: (res: any, sender: chrome.runtime.MessageSender)=>Promise<any>} = {};

  constructor(runtime: typeof chrome.runtime, listen = false) {
    this._runtime = runtime;
    if(listen) {
      this._listener = this._listener.bind(this);
      runtime.onMessage.addListener(this._listener);
    }
  }

  _listener(message: {eventName: string, body: any}, sender: chrome.runtime.MessageSender, sendResponse: (res: any)=>void) {
    // Security: only accept messages from our own extension (background ↔ popup/UI)
    // or from our own content scripts (which run in ISOLATED world).
    // Reject anything that arrives from an external web page or another extension.
    const ownId = chrome.runtime.id;
    const senderIsOwnExtension = sender.id === ownId;
    // Content scripts have a tab but no url starting with "chrome-extension://"
    const senderIsContentScript = !!(sender.tab && sender.id === ownId);
    if (!senderIsOwnExtension && !senderIsContentScript) {
      // Silently drop — don't give the caller any information
      return false;
    }

    const { eventName, body } = message;
    if(!eventName || !this._handlers[eventName]) {
      if(eventName && !this._handlers[eventName]) {
        sendResponse({
          error: {
            message: `Event ${eventName} not registered.`,
            stack: '',
          },
        });
      }
      return false;
    }
    let responded = false;
    const safeRespond = (payload: any) => {
      if (responded) {
        return;
      }
      responded = true;
      try {
        sendResponse(payload);
      } catch {
        // Channel may already be closed.
      }
    };
    this._handlers[eventName](body, sender)
      .then(res => safeRespond(res ?? {
        error: {
          message: 'Background handler returned no response.',
          stack: '',
        },
      }))
      .catch(err => safeRespond({
        error: {
          message: err?.message || 'Background handler failed.',
          stack: err?.stack || '',
        },
      }));
    return true;
  }

  unload(): void {
    this._handlers = {};
    this._runtime.onMessage.removeListener(this._listener);
  }

  register(eventName: string, callback: (res: any, sender: chrome.runtime.MessageSender)=>Promise<any>): void {
    if(this._handlers[eventName]) {
      throw new Error(`Event ${eventName} already registered.`);
    }
    this._handlers[eventName] = callback;
  }

  unregister(eventName: string): void {
    delete this._handlers[eventName]
  }

  private isRetryableConnectionError(message: string): boolean {
    return /receiving end does not exist|extension context invalidated|message channel closed|asynchronous response/i.test(message);
  }

  private sendOnce(eventName: string, body: unknown): Promise<{ ok: true, response: any } | { ok: false, error: string }> {
    return new Promise((resolve) => {
      try {
        this._runtime.sendMessage({ eventName, body }, (response) => {
          const lastError = this._runtime.lastError;
          if (lastError?.message) {
            resolve({ ok: false, error: lastError.message });
            return;
          }
          resolve({ ok: true, response: response ?? null });
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        resolve({ ok: false, error: message });
      }
    });
  }

  async send(eventName: string, body: any = {}): Promise<any> {
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
      }
      const result = await this.sendOnce(eventName, body);
      if (result.ok) {
        if (result.response == null) {
          if (attempt < maxAttempts - 1) {
            continue;
          }
          return {
            error: {
              message: 'Extension background did not respond. Reload the extension and try again.',
              stack: '',
            },
          };
        }
        return result.response;
      }
      if (attempt < maxAttempts - 1 && this.isRetryableConnectionError(result.error)) {
        continue;
      }
      return {
        error: {
          message: this.isRetryableConnectionError(result.error)
            ? 'Wallet is still starting. Wait a moment and try again.'
            : result.error,
          stack: '',
        },
      };
    }
    return {
      error: {
        message: 'Extension background did not respond. Reload the extension and try again.',
        stack: '',
      },
    };
  }

}
