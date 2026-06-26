import React, { useContext, useState } from 'react';
import { Container } from './shared/container';
import { useDispatch } from 'react-redux';
import { setUserAccount, setUserStatus } from '../reducers/app-reducer';
import { calledFromContentScript, isFullTab, isSidePanel, isValidPassword } from '../util';
import { ApiContext } from '../hooks/api-context';
import { ErrorHandlerContext } from '../hooks/error-handler-context';
import isNull from 'lodash/isNull';
import { UserStatus } from '@jeewallet/constants';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  findCryptoAccountInUserAccount,
  getAccountDetailParamsFromUserAccount,
  RouteBuilder
} from '@jeewallet/util-browser';

export const UnlockAccount = () => {

  const location = useLocation();
  const dispatch = useDispatch();
  const api = useContext(ApiContext);
  const errorHandler = useContext(ErrorHandlerContext);
  const navigate = useNavigate();
  const fromContentScript = calledFromContentScript(location);

  const [ disableSubmit, setDisableSubmit ] = useState(false);
  const [ passwordError, setPasswordError ] = useState('');
  const [ password, setPassword ] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    try {
      e.preventDefault();
      if(disableSubmit) {
        return;
      }
      setDisableSubmit(true);
      const res = await api.unlockUserAccount({password});
      if('error' in res) {
        setPasswordError(res.error.message);
        setDisableSubmit(false);
      } else if(isNull(res.result)) {
        setPasswordError('Invalid password.');
        setDisableSubmit(false);
      } else {
        if(fromContentScript) {
          window.close();
          return;
        }
        const userAccount = res.result;
        dispatch(setUserAccount({
          userAccount,
        }));
        dispatch(setUserStatus({userStatus: UserStatus.UNLOCKED}));
        if(userAccount.wallets.length === 0) {
          if(isFullTab()) {
            navigate(RouteBuilder.selectNewWalletType.fullPath());
          } else if(isSidePanel()) {
            await api.startNewWallet();
            navigate(RouteBuilder.openPopupInfo.fullPath());
          } else {
            await api.startNewWallet();
            window.close();
          }
        } else {
          const activeAccountRes = await api.getActiveAccount();
          if('error' in activeAccountRes) {
            errorHandler.handle(activeAccountRes.error);
          } else {
            if(activeAccountRes.result) {
              const account = findCryptoAccountInUserAccount(userAccount, activeAccountRes.result);
              if(account) {
                const accountDetailParams = getAccountDetailParamsFromUserAccount(userAccount, account.id);
                if(accountDetailParams) {
                  navigate(RouteBuilder.accountDetail.generateFullPath(accountDetailParams));
                } else {
                  navigate(RouteBuilder.wallets.fullPath());
                }
              } else {
                navigate(RouteBuilder.wallets.fullPath());
              }
            } else {
              navigate(RouteBuilder.wallets.fullPath());
            }
          }
        }
      }
    } catch(err: any) {
      errorHandler.handle(err);
      setDisableSubmit(false);
    }
  };

  return (
    <Container className="jee-shell jee-auth-page">
      <div className="jee-auth-card">
        <div className="text-center mb-3">
          <img src="https://jee.money/assets/logo/jee-chain.png" alt="JEE" height={48} width={48} style={{borderRadius: 8}} />
          <h1 className="jee-auth-title mt-3">Unlock Wallet</h1>
          <p className="jee-auth-copy mb-0">Enter your password to continue</p>
        </div>
        <form className="jee-auth-form" onSubmit={onSubmit}>
          <div className="jee-auth-field">
            <label htmlFor={'password'} className={'form-label'}>Password</label>
            <input
              type={'password'}
              className={'form-control'}
              id={'password'}
              value={password}
              placeholder={'Enter password'}
              autoFocus={true}
              disabled={disableSubmit}
              onBlur={() => {
                if(passwordError && isValidPassword(password)) {
                  setPasswordError('');
                }
              }}
              onChange={(e) => setPassword(e.target.value)}
            />
            {passwordError ? <div className={'form-text text-danger'}>{passwordError}</div> : null}
          </div>
          <button
            type={'submit'}
            className={'jee-btn-primary w-100 mt-3'}
            disabled={disableSubmit || !password}
          >{disableSubmit ? 'Unlocking…' : 'Unlock'}</button>
        </form>
      </div>
    </Container>
  );
};
