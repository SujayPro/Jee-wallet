import { AccountTransaction, sortAccountTransactions } from '@jeewallet/types';

/** Compact tx: [hash, received 0|1, amount, height, sortKey] — no private data */
export type CompactTx = [string, 0 | 1, string, string, number?];

export type TxLogStore = Record<string, CompactTx[]>;
export type BalanceLogStore = Record<string, string>;

const MAX_TX_PER_ACCOUNT = 20;

export function sortTransactions(txs: AccountTransaction[]): AccountTransaction[] {
  return sortAccountTransactions(txs);
}

export function compactTx(tx: AccountTransaction, sortKey?: number): CompactTx {
  const key = sortKey ?? tx.index ?? Date.now();
  return [tx.hash, tx.received ? 1 : 0, tx.amount || '', tx.height || '0', key];
}

export function expandTx(compact: CompactTx): AccountTransaction {
  const savedAt = compact[4] || 0;
  return {
    hash: compact[0],
    received: compact[1] === 1,
    amount: compact[2],
    type: compact[1] === 1 ? 'recv' : 'send',
    height: compact[3] || '0',
    index: savedAt,
  };
}

export function mergeTxLists(existing: CompactTx[], incoming: AccountTransaction[]): CompactTx[] {
  const byHash = new Map<string, CompactTx>();
  for (const c of existing) {
    byHash.set(c[0], c);
  }
  for (const tx of incoming) {
    const prev = byHash.get(tx.hash);
    const sortKey = tx.index || prev?.[4] || Date.now();
    byHash.set(tx.hash, compactTx(tx, sortKey));
  }
  const expanded = sortTransactions([...byHash.values()].map(expandTx));
  return expanded.map((tx) => compactTx(tx, tx.index)).slice(0, MAX_TX_PER_ACCOUNT);
}

export function expandTxLog(store: TxLogStore): Record<string, AccountTransaction[]> {
  const out: Record<string, AccountTransaction[]> = {};
  for (const [accountId, list] of Object.entries(store)) {
    out[accountId] = sortTransactions(list.map(expandTx));
  }
  return out;
}

export function mergeAccountMaps<T>(
  primary: Record<string, T[] | string>,
  fallback: Record<string, T[] | string>,
  isEmpty: (v: T[] | string | undefined) => boolean,
): Record<string, T[] | string> {
  const merged: Record<string, T[] | string> = {...fallback};
  for (const [id, val] of Object.entries(primary)) {
    if (!isEmpty(val)) {
      merged[id] = val;
    }
  }
  for (const id of Object.keys(fallback)) {
    if (isEmpty(merged[id])) {
      merged[id] = fallback[id];
    }
  }
  return merged;
}

export function sortTransactionMap(
  transactions: Record<string, AccountTransaction[]>,
): Record<string, AccountTransaction[]> {
  const sorted: Record<string, AccountTransaction[]> = {};
  for (const [accountId, txs] of Object.entries(transactions)) {
    sorted[accountId] = sortTransactions(txs);
  }
  return sorted;
}
