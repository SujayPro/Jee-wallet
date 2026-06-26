import React, { useContext, useEffect } from 'react';
import { Container } from './shared/container';
import { WalletCard } from './shared/wallet-card';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { ApiContext } from '../hooks/api-context';
import { ErrorHandlerContext } from '../hooks/error-handler-context';

export interface ManageWalletsProps {
  selectAccount?: boolean
}
export const ManageWallets = ({ selectAccount = false }: ManageWalletsProps) => {

  const errorHandler = useContext(ErrorHandlerContext);
  const api = useContext(ApiContext);
  const dispatch = useDispatch();
  const {
    activeChain,
    userAccount,
  } = useSelector(({ appState }: RootState) => appState);

  useEffect(() => {
    if (!selectAccount) {
      return;
    }
    api.saveActiveAccount({
      accountId: '',
    }).catch((err) => {
      errorHandler.handle(err);
    })
  }, [api, errorHandler, selectAccount]);

  const onImportWalletClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    await api.startNewWallet();
    window.close();
  };

  return (
    <Container className="jee-shell">
      <h3 className="jee-page-title">{selectAccount ? 'Select Account' : 'Wallets'}</h3>
      <div className="jee-hero-bars">
        <div className="jee-hero-bar" />
        <div className="jee-hero-bar" />
        <div className="jee-hero-bar" />
      </div>
      {selectAccount ?
        <p className={'ps-3 pe-3 text-muted mb-0'} style={{fontSize: '0.8125rem'}}>Select an account to continue.</p>
        :
        null
      }
      <div className={'flex-grow-1 position-relative'}>
        <div className={'position-absolute top-0 start-0 end-0 bottom-0 overflow-x-hidden overflow-y-auto px-2 pt-2'}>
          {userAccount?.wallets
            .filter((wallet) => !wallet.legacy || wallet.accounts.some((account) => account.chain === activeChain))
            .map((wallet) => {
              return (
                <WalletCard wallet={wallet} selectAccount={selectAccount} />
              );
            })
          }
        </div>
      </div>
      {selectAccount ?
        null
        :
        <div className={'d-flex flex-row justify-content-center p-3'}>
          <button className={'jee-btn-secondary'} onClick={onImportWalletClick}><i className={'mdi mdi-upload'} /> Add / Import Wallet</button>
        </div>
      }
    </Container>
  );
};
