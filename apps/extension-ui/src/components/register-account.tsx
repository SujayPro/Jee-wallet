import React, { useContext, useState } from 'react';
import { Container } from './shared/container';
import { useDispatch } from 'react-redux';
import { setUserAccount, setUserStatus } from '../reducers/app-reducer';
import { PASSWORD_MIN_LENGTH } from '../constants';
import { isValidPassword } from '../util';
import { ApiContext } from '../hooks/api-context';
import { ErrorHandlerContext } from '../hooks/error-handler-context';
import { UserStatus } from '@jeewallet/constants';
import { useNavigate } from 'react-router-dom';
import { isApiError, RouteBuilder } from '@jeewallet/util-browser';

export const RegisterAccount = () => {

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const api = useContext(ApiContext);
  const errorHandler = useContext(ErrorHandlerContext);

  const [ disableSubmit, setDisableSubmit ] = useState(false);
  const [ passwordError, setPasswordError ] = useState('');
  const [ password, setPassword ] = useState('');
  const [ passwordRepeat, setPasswordRepeat ] = useState('');
  const [ passwordRecoveryNoticeChecked, setPasswordRecoveryNoticeChecked ] = useState(false);

  const onRegisterClick = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    try {
      e.preventDefault();
      if(disableSubmit) {
        return;
      }
      if(!isValidPassword(password)) {
        setPasswordError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters in length.`);
        return;
      }
      setDisableSubmit(true);
      setPasswordError('');
      const res = await api.registerUser({password});
      if(isApiError(res)) {
        errorHandler.handle(res.error);
        setDisableSubmit(false);
      } else {
        dispatch(setUserAccount({
          userAccount: res.result,
        }));
        dispatch(setUserStatus({userStatus: UserStatus.UNLOCKED}));
        navigate(RouteBuilder.selectNewWalletType.fullPath());
      }
    } catch(err: any) {
      errorHandler.handle(err);
      setDisableSubmit(false);
    }
  };

  return (
    <Container className="jee-shell jee-auth-page">
      <div className="jee-auth-card">
        <h1 className="jee-auth-title">Register User Account</h1>
        <p className="jee-auth-copy">
          All user data is encrypted locally on your device. Your password never leaves the extension — it is not sent to any website or third party. Minimum {PASSWORD_MIN_LENGTH} characters. JEE WALLET cannot recover lost passwords.
        </p>
        <form className="jee-auth-form" onSubmit={(e) => e.preventDefault()}>
          <div className="jee-auth-field">
            <label htmlFor={'password'} className={'form-label'}>Password</label>
            <input
              type={'password'}
              className={'form-control'}
              id={'password'}
              value={password}
              placeholder={'Enter password'}
              autoFocus={true}
              onBlur={() => {
                if(passwordError && isValidPassword(password)) {
                  setPasswordError('');
                }
              }}
              onChange={(e) => setPassword(e.target.value)}
            />
            {passwordError ? <div className={'form-text text-danger'}>{passwordError}</div> : null}
          </div>

          <div className="jee-auth-field">
            <label htmlFor={'password-repeat'} className={'form-label'}>Confirm password</label>
            <input
              type={'password'}
              className={'form-control'}
              id={'password-repeat'}
              value={passwordRepeat}
              placeholder={'Re-enter password'}
              onChange={(e) => setPasswordRepeat(e.target.value)}
            />
          </div>

          <div className={'form-check jee-auth-check'}>
            <input
              className={'form-check-input'}
              type={'checkbox'}
              id={'cannot-recover-password'}
              checked={passwordRecoveryNoticeChecked}
              onChange={(e) => setPasswordRecoveryNoticeChecked(e.target.checked)}
            />
            <label className={'form-check-label'} htmlFor={'cannot-recover-password'}>
              I understand that JEE WALLET cannot recover lost or forgotten passwords.
            </label>
          </div>

          <button
            type={'button'}
            className={'jee-btn-primary w-100 mt-3'}
            disabled={disableSubmit || !passwordRecoveryNoticeChecked || !password || password !== passwordRepeat}
            onClick={onRegisterClick}
          >{disableSubmit ? 'Securing vault…' : 'Register account'}</button>
          {disableSubmit ?
            <p className="jee-auth-copy mt-2 mb-0">Encrypting locally — usually a few seconds.</p>
            :
            null
          }
        </form>
      </div>
    </Container>
  );
};
