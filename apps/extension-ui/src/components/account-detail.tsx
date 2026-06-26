import React, { useContext, useEffect } from 'react';
import { Container } from './shared/container';
import { BalanceCard } from './shared/balance-card';
import { TransactionList } from './shared/transaction-list';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AccountDetailParams,
  findCryptoAccountInUserAccountByAddress,
  isApiError,
  prepFilename,
  RouteBuilder
} from '@jeewallet/util-browser';
import { jeePasswordPrompt, jeeError, jeeAlert, jeeClose } from '../modules/jee-dialog';
import { ErrorHandlerContext } from '../hooks/error-handler-context';
import { ApiContext } from '../hooks/api-context';
import { ChainType } from '@jeewallet/constants';
import { setAccountBalances, setAccountTransactions } from '../reducers/app-reducer';

export const AccountDetail = () => {

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const errorHandler = useContext(ErrorHandlerContext);
  const api = useContext(ApiContext);
  const {
    walletId,
    networkId,
    chainId,
    address,
  } = useParams<Partial<AccountDetailParams>>();

  const {
    userAccount,
  } = useSelector(({ appState }: RootState) => appState);

  const cryptoAccount = userAccount && walletId && networkId && chainId && address
    ? findCryptoAccountInUserAccountByAddress(userAccount, walletId, networkId, chainId, address)
    : null;

  useEffect(() => {
    if(userAccount?.settings.hideTestnets && chainId === ChainType.TESTNET) {
      navigate(RouteBuilder.wallets.fullPath());
    }
  }, [chainId, navigate, userAccount?.settings.hideTestnets]);

  useEffect(() => {
    if(!cryptoAccount) {
      return;
    }
    Promise.all([
      api.getAccountTransactions({}),
      api.getAccountBalances({}),
    ]).then(([txRes, balRes]) => {
      if(!isApiError(txRes)) {
        dispatch(setAccountTransactions({ accountTransactions: txRes.result }));
      }
      if(!isApiError(balRes)) {
        dispatch(setAccountBalances({ accountBalances: balRes.result }));
      }
    }).catch((err) => errorHandler.handle(err));
  }, [api, cryptoAccount, dispatch, errorHandler]);

  const onSync = async () => {
    const [balancesRes, transactionsRes] = await Promise.all([
      api.getAccountBalances({ forceUpdate: true }),
      api.getAccountTransactions({ forceUpdate: true }),
    ]);
    if(isApiError(balancesRes)) {
      errorHandler.handle(balancesRes.error);
    } else {
      dispatch(setAccountBalances({ accountBalances: balancesRes.result }));
    }
    if(isApiError(transactionsRes)) {
      errorHandler.handle(transactionsRes.error);
    } else {
      dispatch(setAccountTransactions({ accountTransactions: transactionsRes.result }));
    }
  };

  if(!userAccount || !walletId || !networkId || !chainId || !address || !cryptoAccount) {
    return null;
  }

  const onViewClick = async (e: React.MouseEvent) => {
    try {
      e.preventDefault();
      if(!cryptoAccount) {
        return;
      }
      const password = await jeePasswordPrompt({
        title: 'Unlock private key',
        confirmText: 'View Key',
        placeholder: 'Enter user password',
      });
      if(password) {
        const prepped = password.trim();
        const res = await api.exportPrivateKey({
          password: prepped,
          accountId: cryptoAccount.id,
        });
        if('error' in res) {
          if(res.error.message === 'Invalid password.') {
            await jeeError('Wrong password', 'The password you entered is incorrect.');
          } else {
            errorHandler.handle(res.error);
          }
        } else {
          await jeeAlert('Private Key', res.result);
        }
      } else {
        jeeClose();
      }
    } catch(err: any) {
      errorHandler.handle(err);
    }
  };
  const onExportClick = async (e: React.MouseEvent) => {
    try {
      e.preventDefault();
      if(!cryptoAccount) {
        return;
      }
      const password = await jeePasswordPrompt({
        title: 'Unlock private key',
        confirmText: 'Export Key',
        placeholder: 'Enter user password',
      });
      if(password) {
        const prepped = password.trim();
        const res = await api.exportKeyfile({
          password: prepped,
          keyfilePassword: prepped,
          accountId: cryptoAccount.id,
        });
        if('error' in res) {
          if(res.error.message === 'Invalid password.') {
            await jeeError('Wrong password', 'The password you entered is incorrect.');
          } else {
            errorHandler.handle(res.error);
          }
        } else {
          const blob = new Blob([res.result], {type: 'application/json;charset=utf-8'});
          const url = URL.createObjectURL(blob);
          await api.saveFile({
            filename: `${prepFilename(cryptoAccount.name)}.json`,
            url,
          });
        }
      } else {
        jeeClose();
      }
    } catch(err: any) {
      errorHandler.handle(err);
    }
  };

  const styles = {
    bottomButton: {
      flexBasis: '1px',
    },
  };

  return (
    <Container className="jee-shell">
      <BalanceCard
        walletId={walletId}
        account={cryptoAccount}
        backRoute={RouteBuilder.wallets.fullPath()}
      />
      <TransactionList
        account={cryptoAccount}
        onSync={onSync}
      />
      <div className={'d-flex flex-row justify-content-start gap-2 p-3'}>
        <button className={'jee-btn-ghost flex-grow-1'} style={styles.bottomButton} onClick={onViewClick}><i className={'mdi mdi-key-variant'} /> View Key</button>
        <button className={'jee-btn-ghost flex-grow-1'} style={styles.bottomButton} onClick={onExportClick}><i className={'mdi mdi-export'} /> Export</button>
      </div>
    </Container>
  );
};
