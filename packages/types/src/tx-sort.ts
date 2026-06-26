import { AccountTransaction } from './index';

/** Sort key: chain timestamp (ms) preferred, then block height, then local index. */
export function txSortKey(tx: AccountTransaction): number {
  if (tx.index > 1_000_000_000_000) {
    return tx.index;
  }
  if (tx.time) {
    const parsed = Date.parse(tx.time);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  const height = Number(tx.height || 0);
  if (height > 0 && height < 1_000_000_000) {
    return height * 1_000_000;
  }
  return tx.index || 0;
}

export function sortAccountTransactions(txs: AccountTransaction[]): AccountTransaction[] {
  return [...txs].sort((a, b) => {
    const keyA = txSortKey(a);
    const keyB = txSortKey(b);
    if (keyA !== keyB) {
      return keyB - keyA;
    }
    const heightA = Number(a.height || 0);
    const heightB = Number(b.height || 0);
    if (heightA !== heightB) {
      return heightB - heightA;
    }
    return b.hash.localeCompare(a.hash);
  });
}
