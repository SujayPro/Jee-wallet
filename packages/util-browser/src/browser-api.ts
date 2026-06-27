type BrowserGlobal = typeof globalThis & {
  browser?: typeof chrome;
  chrome: typeof chrome;
};

const browserGlobal = globalThis as BrowserGlobal;

/** Cross-browser WebExtension API (`browser` on Firefox, `chrome` on Chromium). */
export const ext: typeof chrome = browserGlobal.browser ?? browserGlobal.chrome;

export const getExtensionOrigin = (): string =>
  ext.runtime.getURL('').replace(/\/$/, '');

export const isFirefox = (): boolean =>
  typeof browserGlobal.browser !== 'undefined' &&
  typeof browserGlobal.chrome?.sidePanel === 'undefined';
