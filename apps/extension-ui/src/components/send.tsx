import React, { useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { ApiContext } from '../hooks/api-context';
import { ErrorHandlerContext } from '../hooks/error-handler-context';
import { Container } from './shared/container';
import { BalanceCard } from './shared/balance-card';
import * as math from 'mathjs';
import { ext, findCryptoAccountInUserAccountByAddress, isApiError, isJeeAddress, RouteBuilder, SendParams } from '@jeewallet/util-browser';
import { setAccountBalances, setAccountTransactions } from '../reducers/app-reducer';
import { jeeConfirm, jeeSuccess, jeeError } from '../modules/jee-dialog';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { calledFromContentScript } from '../util';

export const Send = () => {

  const {
    walletId,
    networkId,
    chainId,
    address,
  } = useParams<Partial<SendParams>>();

  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const api = useContext(ApiContext);
  const errorHandler = useContext(ErrorHandlerContext);
  const {
    accountBalances,
    userAccount,
  } = useSelector(({ appState }: RootState) => appState);
  const fromContentScript = calledFromContentScript(location);

  const [ toAddress, setToAddress ] = useState('');
  const [ toAddressError, setToAddressError ] = useState('');
  const [ amount, setAmount ] = useState('');
  // const [ amountError, setAmountError ] = useState('');
  const [ memo, setMemo ] = useState('');
  const [ disableSubmit, setDisableSubmit ] = useState(false);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const amount = queryParams.get('amount') || '';
    const recipient = queryParams.get('recipient') || '';
    const memo = queryParams.get('memo') || '';
    if(amount && recipient) {
      setAmount(amount);
      setToAddress(recipient);
      setMemo(memo);
    }
  }, []);

  if(!userAccount || !walletId || !networkId || !chainId || !address) {
    return null;
  }

  const cryptoAccount = findCryptoAccountInUserAccountByAddress(
    userAccount,
    walletId,
    networkId,
    chainId,
    address,
  );

  if(!cryptoAccount) {
    return null;
  }

  const accountDetailRoute = RouteBuilder.accountDetail.generateFullPath({
    walletId,
    networkId,
    chainId,
    address,
  })

  const onSubmit = async (e: React.FormEvent) => {
    try {
      e.preventDefault();
      if(disableSubmit) {
        return;
      } else {
        setDisableSubmit(true);
      }
      let preppedAmount = amount.trim();
      try {
        if(!math.largerEq(
          math.bignumber(balance),
          math.bignumber(preppedAmount),
        )) {
          throw new Error('Amount exceeds your balance.');
        }
      } catch(err) {
        setDisableSubmit(false);
        if(err instanceof Error && err.message === 'Amount exceeds your balance.') {
          throw err;
        }
        throw new Error('Invalid amount.');
      }

      const preppedAddress = toAddress.trim();
      if(!isJeeAddress(preppedAddress)) {
        setToAddressError('Invalid address.');
        setDisableSubmit(false);
        return;
      }

      const preppedMemo = memo.trim();

      const modalText = `You are about to send ${preppedAmount} JEE to the following address:\n\n${preppedAddress}\n\nPlease confirm that you want to continue.`;

      const confirmed = await jeeConfirm({
        title: 'Confirm Transaction',
        text: modalText,
        confirmText: 'Confirm',
        closeOnConfirm: false,
      });
      if(!confirmed) {
        setDisableSubmit(false);
        return;
      }
      const res = await api.sendTransaction({
        accountId: cryptoAccount.id,
        amount: preppedAmount,
        recipient: toAddress,
        memo: preppedMemo,
      });
      if(isApiError(res)) {
        if(fromContentScript) {
          await jeeError('Transaction failed', res.error.message);
          window.close();
        } else {
          errorHandler.handle(res.error);
          setDisableSubmit(false);
          return;
        }
      } else if(res.result.txid) {
        const [balancesRes, transactionsRes] = await Promise.all([
          api.getAccountBalances({ forceUpdate: true }),
          api.getAccountTransactions({ forceUpdate: true }),
        ]);
        if(!isApiError(balancesRes)) {
          dispatch(setAccountBalances({ accountBalances: balancesRes.result }));
        }
        if(!isApiError(transactionsRes)) {
          dispatch(setAccountTransactions({ accountTransactions: transactionsRes.result }));
        }
        // ToDo move to api
        await ext.runtime.sendMessage({
          type: 'txid',
          payload: res.result.txid,
        });
        await jeeSuccess(
          'Transaction successful',
          `Your transaction has been submitted to the network.\n\n${res.result.txid}`,
        );
        if(fromContentScript) {
          window.close();
        } else {
          navigate(accountDetailRoute);
        }
      }
      setDisableSubmit(false);
    } catch(err: any) {
      errorHandler.handle(err);
      setDisableSubmit(false);
    }
  };
  const onCancelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if(fromContentScript) {
      window.close();
    } else {
      navigate(-1);
    }
  };

  const balance = accountBalances[cryptoAccount.id] || '0';
  let amountGood: boolean;
  try {
    amountGood = !amount || !!(math.largerEq(
      math.bignumber(balance),
      math.bignumber(amount)
    ));
  } catch(err) {
    amountGood = false;
  }

  const styles = {
    buttonContainer: {
      gap: '.75em',
    },
    button: {
      flex: 1,
      flexBasis: '1px',
    },
  };

  return (
    <Container className="jee-shell">
      <BalanceCard
        walletId={walletId}
        account={cryptoAccount}
        hideButtons={true}
        backRoute={accountDetailRoute}
      />
      <h4 className={'jee-section-label'}>Send JEE</h4>
      <div className={'flex-grow-1 position-relative'}>
        <form onSubmit={onSubmit} className={'ps-3 pe-3 position-absolute top-0 bottom-0 start-0 end-0 overflow-y-auto overflow-x-hidden'}>
          <div className={'mb-3'}>

            <div className={'mb-2'}>
              <label htmlFor={'amount'} className={'form-label'}>Amount to send</label>
              <input
                type={'number'}
                className={'form-control font-monospace'}
                id={'amount'}
                value={amount}
                placeholder={'Enter amount of JEE to send'}
                autoFocus={true}
                readOnly={fromContentScript}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={() => {
                  if(toAddressError && isJeeAddress(toAddress)) {
                    setToAddressError('');
                  } else if(toAddress && !isJeeAddress(toAddress)) {
                    setToAddressError('Invalid address.');
                  }
                }}
              />
              {!amountGood ? <div className={'form-text text-danger'}>{'Amount exceeds your balance.'}</div> : null}
            </div>

            <div className={'mb-2'}>
              <label htmlFor={'address'} className={'form-label'}>Recipient Address</label>
              <input
                type={'text'}
                spellCheck={false}
                className={'form-control font-monospace'}
                id={'address'}
                value={toAddress}
                placeholder={'Enter recipient jee address'}
                readOnly={fromContentScript}
                onChange={(e) => setToAddress(e.target.value.trim())}
                onBlur={() => {
                  if(toAddressError && isJeeAddress(toAddress)) {
                    setToAddressError('');
                  } else if(toAddress && !isJeeAddress(toAddress)) {
                    setToAddressError('Invalid address.');
                  }
                }}
              />
              {toAddressError ? <div className={'form-text text-danger'}>{toAddressError}</div> : null}
            </div>

            <div className={'mb-3'}>
              <label htmlFor={'memo'} className={'form-label'}>Memo</label>
              <textarea
                className={'form-control'}
                id={'memo'}
                value={memo}
                placeholder={'Enter optional memo'}
                style={{resize: 'vertical'}}
                readOnly={fromContentScript}
                onChange={(e) => setMemo(e.target.value)}
              />
            </div>

            <div className={'d-flex flex-row justify-content-start gap-2'} style={styles.buttonContainer}>
              <button
                type={'button'}
                onClick={onCancelClick}
                className={'jee-btn-secondary flex-grow-1'}
                style={styles.button}
                disabled={disableSubmit}
              >Cancel</button>
              <button
                type={'submit'}
                className={'jee-btn-primary flex-grow-1'}
                style={styles.button}
                disabled={disableSubmit || !amountGood || !toAddress || !amount}
              >{amount ? `Send ${amount} JEE` : 'Send'}</button>
            </div>

          </div>
        </form>
      </div>
    </Container>
  );
};
