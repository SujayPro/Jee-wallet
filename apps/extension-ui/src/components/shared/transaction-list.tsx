import React, { useContext, useMemo, useState } from 'react';
import { truncateAddress } from '../../util';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { CryptoAccount, sortAccountTransactions } from '@jeewallet/types';
import { ErrorHandlerContext } from '../../hooks/error-handler-context';
import { CopyButton } from './copy-button';

export interface TransactionListProps {
  account: CryptoAccount,
  onSync?: () => Promise<void>,
}
export const TransactionList = ({ account, onSync }: TransactionListProps) => {

  const errorHandler = useContext(ErrorHandlerContext);
  const [ syncing, setSyncing ] = useState(false);
  const {
    accountTransactions,
  } = useSelector(({ appState }: RootState) => appState);

  const transactions = useMemo(() => {
    const list = accountTransactions[account.id] || [];
    return sortAccountTransactions(list);
  }, [accountTransactions, account.id]);

  const onSyncClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if(!onSync || syncing) {
      return;
    }
    setSyncing(true);
    try {
      await onSync();
    } catch(err: any) {
      errorHandler.handle(err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className={'flex-grow-1 position-relative'}>
      <div className={'position-absolute top-0 start-0 end-0 bottom-0 d-flex flex-column justify-content-start'}>
        <div className="d-flex align-items-center justify-content-between pe-2">
          <h4 className={'jee-section-label mb-0'}>Recent Transactions</h4>
          {onSync ?
            <a
              href="#"
              className={`jee-icon-btn jee-sync-btn ${syncing ? 'jee-sync-btn--active' : ''}`}
              title="Sync balance & transactions"
              onClick={onSyncClick}
            >
              <i className="mdi mdi-refresh" />
            </a>
            :
            null
          }
        </div>
        <div className={'flex-grow-1 position-relative mx-2 mb-2'}>
          <div className={'position-absolute top-0 start-0 end-0 bottom-0 overflow-x-hidden overflow-y-auto jee-panel'} style={{margin: 0}}>
            <table className={'jee-table'}>
              <thead>
              <tr>
                <th>Amount</th>
                <th>Type</th>
                <th>Tx</th>
              </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={3} className={'text-muted'} style={{padding: '1rem 0.75rem'}}>
                      No transactions yet
                      {onSync ? <span className="d-block mt-1" style={{fontSize: '0.7rem'}}>Tap sync when online</span> : null}
                    </td>
                  </tr>
                ) : transactions
                  .map((tx) => {
                    const  { received } = tx;
                    const amount = tx.amount;
                    return (
                      <tr key={tx.hash}>
                        <td className={'font-monospace'}>{amount || '—'}</td>
                        <td><strong className={received ? 'jee-tx-received' : 'jee-tx-sent'}>{received ? 'Received' : 'Sent'}</strong></td>
                        <td className={'font-monospace text-nowrap'}>
                          <a href={`https://jeescan.org/tx/${tx.hash}`} title={'Open in JEEScan'} target={'_blank'} rel="noreferrer">{truncateAddress(tx.hash)}</a>
                          {' '}
                          <CopyButton text={tx.hash} title="Copy txid" />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
