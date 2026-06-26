import React, { useContext } from 'react';
import { Container } from './shared/container';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import isNumber from 'lodash/isNumber';
import { defaultLockTimeout } from '@jeewallet/constants';
import { ErrorHandlerContext } from '../hooks/error-handler-context';
import { ApiContext } from '../hooks/api-context';
import { setUserAccount } from '../reducers/app-reducer';
import { ScrollContainer } from './shared/scroll-container';

export const Settings = () => {

  const errorHandler = useContext(ErrorHandlerContext);
  const api = useContext(ApiContext);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const {
    userAccount,
  } = useSelector(({ appState }: RootState) => appState);

  if(!userAccount) {
    return null;
  }

  const onBackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(-1);
  };

  const lockTimeout = isNumber(userAccount.settings.lockTimeout) ? userAccount.settings.lockTimeout : defaultLockTimeout;

  const onLockTimeoutChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    try {
      e.preventDefault();
      const lockTimeout = parseInt(e.target.value, 10);
      const res = await api.updateUserSettings({
        lockTimeout,
      });
      if('error' in res) {
        errorHandler.handle(res.error);
      } else {
        dispatch(setUserAccount({
          userAccount: {
            ...userAccount,
            settings: res.result,
          },
        }));
      }
    } catch(err: any) {
      errorHandler.handle(err);
    }
  };

  return (
    <Container className="jee-shell">

      <h3 className="jee-page-title">
        <a href={'#'} className="jee-icon-btn me-2" title={'Go back'} onClick={onBackClick}>
          <i className="mdi mdi-arrow-left" />
        </a>
        Settings
      </h3>

      <div className="jee-hero-bars">
        <div className="jee-hero-bar" />
        <div className="jee-hero-bar" />
        <div className="jee-hero-bar" />
      </div>

      <div className={'flex-grow-1 position-relative'}>

        <ScrollContainer className={'pt-2 ps-3 pe-3'}>

          <div className={'mb-3'}>
            <label htmlFor={'lockTimeout'} className={'form-label'}>Auto Lock</label>
            <select id={'lockTimeout'} className={'form-select'} value={lockTimeout.toString()}
                    onChange={onLockTimeoutChange}>
              <option value={'1'}>1 Minute</option>
              <option value={'5'}>5 Minutes</option>
              <option value={'10'}>10 Minutes</option>
              <option value={'30'}>30 Minutes</option>
              <option value={'60'}>60 Minutes</option>
            </select>
          </div>

        </ScrollContainer>

      </div>

    </Container>
  );
};
