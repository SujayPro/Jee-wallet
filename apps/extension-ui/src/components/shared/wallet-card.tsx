import React, { useContext, useEffect } from 'react';
import { truncateAddress } from '../../util';
import { useDispatch, useSelector } from 'react-redux';
import { setUserAccount, setActiveAccount } from '../../reducers/app-reducer';
import { UserWallet } from '@jeewallet/types';
import { RootState } from '../../store';
import { ApiContext } from '../../hooks/api-context';
import { ErrorHandlerContext } from '../../hooks/error-handler-context';
import { Link } from 'react-router-dom';
import { RouteBuilder, truncateAtDecimalPlace } from '@jeewallet/util-browser';
import { jeePrompt, jeeConfirm, jeeClose, jeePasswordPrompt, jeeError, jeeSecretReveal } from '../../modules/jee-dialog';

interface WalletCardProps {
  wallet: UserWallet,
  selectAccount?: boolean
}
export const WalletCard = ({ wallet, selectAccount = false }: WalletCardProps) => {

  const errorHandler = useContext(ErrorHandlerContext);
  const api = useContext(ApiContext);
  const dispatch = useDispatch();
  const {
    accountBalances,
    activeChain,
    activeAccount,
  } = useSelector(({ appState }: RootState) => appState);
  useEffect(() => {
    api.getActiveAccount()
      .then((res) => {
        if (!('error' in res) && res.result) {
          dispatch(setActiveAccount({ activeAccount: res.result }));
        }
      })
      .catch((err) => errorHandler.handle(err));
  }, [api, dispatch, errorHandler, wallet.id]);

  const onViewSeedPhraseClick = async (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    try {
      e.preventDefault();
      const password = await jeePasswordPrompt({
        title: 'Unlock seed phrase',
        confirmText: 'View Phrase',
        placeholder: 'Enter user password',
      });
      if(!password) {
        jeeClose();
        return;
      }
      const res = await api.exportMnemonic({
        walletId: wallet.id,
        password: password.trim(),
      });
      if('error' in res) {
        if(res.error.message === 'Invalid password.') {
          await jeeError('Wrong password', 'The password you entered is incorrect.');
        } else {
          await jeeError('Unable to show seed phrase', res.error.message);
        }
        return;
      }
      await jeeSecretReveal({
        title: 'Recovery Seed Phrase',
        text: 'Write these words down and keep them somewhere safe. Anyone with this phrase can access this wallet.',
        secret: res.result,
      });
    } catch(err: any) {
      errorHandler.handle(err);
    }
  };

  const onOpenAccountClick = async (e: React.MouseEvent, accountId: string) => {
    try {
      if(selectAccount) {
        e.preventDefault();
      }
      await api.saveActiveAccount({
        accountId,
      });
      dispatch(setActiveAccount({ activeAccount: accountId }));
      if(selectAccount) {
        window.close();
      }
    } catch(err: any) {
      errorHandler.handle(err);
    }
  };

  const onEditWalletNameClick = async (e: React.MouseEvent) => {
    try {
      e.preventDefault();
      const val = await jeePrompt({
        title: 'Update wallet name',
        placeholder: 'Enter wallet name',
        defaultValue: wallet.name,
        confirmText: 'Save',
      });
      const name = val ? val.trim() : '';
      if(!name || name === wallet.name) {
        jeeClose();
        return;
      }
      const res = await api.updateWalletName({
        id: wallet.id,
        name,
      });
      if('error' in res) {
        errorHandler.handle(res.error);
        return;
      } else {
        const updatedUserAccount = await api.getUserAccount();
        if('error' in updatedUserAccount) {
          errorHandler.handle(updatedUserAccount.error);
        } else if(updatedUserAccount.result) {
          dispatch(setUserAccount({userAccount: updatedUserAccount.result}));
        }
      }
      jeeClose();
    } catch(err: any) {
      errorHandler.handle(err);
    }
  };
  const onDeleteWalletClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    let confirmed = await jeeConfirm({
      title: `Delete ${wallet.name}`,
      text: 'Are you sure that you want to permanently delete this wallet? This action cannot be undone!',
      confirmText: 'Permanently Delete',
      closeOnConfirm: false,
    });
    if (!confirmed) {
      return;
    }
    confirmed = await jeeConfirm({
      title: `Delete ${wallet.name}`,
      text: 'Please confirm again that you want to permanently delete this wallet.\n\nTHIS ACTION CANNOT BE UNDONE.',
      confirmText: `Delete ${wallet.name}`,
      closeOnConfirm: false,
    });
    if (!confirmed) {
      return;
    }
    const res = await api.deleteWallet({
      id: wallet.id,
    });
    if ('error' in res) {
      errorHandler.handle(res.error);
      return;
    } else {
      const updatedUserAccount = await api.getUserAccount();
      if('error' in updatedUserAccount) {
        errorHandler.handle(updatedUserAccount.error);
      } else if(updatedUserAccount.result) {
        dispatch(setUserAccount({userAccount: updatedUserAccount.result}));
      }
    }
    // @ts-ignore
    swal.close();
  }

  const longestBalance = Object
    .values(accountBalances)
    .map(b => parseInt(b))
    .sort((a, b) => b - a)
    .shift() || 0;
  const numberLength = longestBalance.toString().length;

  return (
    <div className="jee-panel">
      <div className="jee-panel-header">
        <div className={'d-flex flex-row justify-content-between align-items-center'}>
          <h5 className={'mt-0 mb-0 fw-semibold'}>{wallet.name}
            <a href={'#'} className="jee-icon-btn ms-1" title={'Edit wallet name'} onClick={onEditWalletNameClick}><i className={'mdi mdi-pencil fs-6'}/></a>
            <a href={'#'} className="jee-icon-btn ms-1" title={'Delete Wallet'} onClick={onDeleteWalletClick}><i className={'text-danger mdi mdi-delete fs-6'}/></a>
          </h5>
          {!wallet.legacy && !selectAccount ? <a href={'#'} className="jee-icon-btn" onClick={onViewSeedPhraseClick} title={'View seed phrase'} style={{fontSize: '0.75rem'}}><i className={'mdi mdi-key-chain'} /> phrase</a> : null}
        </div>
      </div>
      <div className={'jee-panel-body pt-0 pb-0'}>
        <table className={'jee-table'}>
          <thead>
          <tr>
            <th>Address</th>
            <th style={{textAlign: 'right'}}>JEE</th>
          </tr>
          </thead>
          <tbody>
          {
            wallet.accounts
              .filter((a) => a.chain === activeChain)
              .reduce((arr, a) => {
                const cryptoAccounts = [...a.accounts]
                  .sort((a, b) => a.index - b.index)
                  .sort((left, right) => {
                    if (left.id === activeAccount) return -1;
                    if (right.id === activeAccount) return 1;
                    return 0;
                  })
                  .map((ca) => {

                    const accountDetailPath = RouteBuilder.accountDetail.generateFullPath({
                      walletId: wallet.id,
                      networkId: a.network,
                      chainId: a.chain,
                      address: ca.address,
                    });

                    const balance = truncateAtDecimalPlace(Number(accountBalances[ca.id] || '0'), 2);
                    const currentLength = parseInt(balance).toString().length;
                    const padding = new Array(numberLength - currentLength)
                      .fill('0')
                      .join('');
                    const isPinned = ca.id === activeAccount;

                    return (
                      <tr key={ca.id} className={isPinned ? 'jee-row-active' : ''}>
                        <td>
                          <Link to={accountDetailPath} title={isPinned ? 'Pinned default address' : 'View account details'} onClick={e => onOpenAccountClick(e, ca.id)}>
                            {isPinned ? <i className={'mdi mdi-pin text-warning me-1'} title={'Pinned default address'} /> : null}
                            {ca.name} (<span className={'font-monospace'} style={{fontSize: '0.75rem'}}>{truncateAddress(ca.address, 4)}</span>)
                          </Link>
                        </td>
                        <td style={{textAlign: 'right'}}><span className={'font-monospace'}><span className={'visibility-hidden'}>{padding}</span>{balance}</span></td>
                      </tr>
                    );
                  });
                return arr.concat(cryptoAccounts);
              }, [] as any)
          }
          </tbody>
        </table>
      </div>
    </div>
  );
};
