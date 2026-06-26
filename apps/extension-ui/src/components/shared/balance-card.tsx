import React, { useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CryptoAccount } from '@jeewallet/types';
import { calledFromContentScript, truncateAddress } from '../../util';
import { ErrorHandlerContext } from '../../hooks/error-handler-context';
import { RootState } from '../../store';
import { Link, useLocation } from 'react-router-dom';
import { RouteBuilder } from '@jeewallet/util-browser';
import { Pricing } from '../../modules/pricing';
import { jeePrompt, jeeClose } from '../../modules/jee-dialog';
import { setUserAccount } from '../../reducers/app-reducer';
import { ApiContext } from '../../hooks/api-context';
import { CopyButton } from './copy-button';

export interface BalanceCardProps {
  walletId: string
  account: CryptoAccount,
  hideButtons?: boolean,
  backRoute: string,
}
export const BalanceCard = ({ walletId, account, hideButtons, backRoute }: BalanceCardProps) => {

  const location = useLocation();
  const errorHandler = useContext(ErrorHandlerContext);
  const api = useContext(ApiContext);
  const {
    accountBalances,
    pricingMultipliers,
  } = useSelector(({ appState }: RootState) => appState);
  const dispatch = useDispatch();
  const fromContentScript = calledFromContentScript(location);

  const onEditAccountNameClick = async (e: React.MouseEvent) => {
    try {
      e.preventDefault();
      const val = await jeePrompt({
        title: 'Update account name',
        placeholder: 'Enter account name',
        defaultValue: account.name,
        confirmText: 'Save',
      });
      const name = val ? val.trim() : '';
      if(!name || name === account.name) {
        jeeClose();
        return;
      }
      const res = await api.updateAccountName({
        id: account.id,
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

  const sendPath = RouteBuilder.send.generateFullPath({
    walletId,
    networkId: account.network,
    chainId: account.chain,
    address: account.address,
  });

  const balance = accountBalances[account.id] || '0';

  return (
    <div className="jee-panel mb-0">
      <div className="jee-panel-header d-flex flex-row justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-1">
          <Link to={backRoute} className="jee-icon-btn" title={'View wallets'} onClick={e => fromContentScript ? e.preventDefault() : null}>
            <i className={`mdi mdi-arrow-left fs-5 ${fromContentScript ? 'd-none' : ''}`} />
          </Link>
          <span className="fw-semibold">{account.name}</span>
          <a className={`jee-icon-btn ${fromContentScript ? 'd-none' : ''}`} href={'#'} title={'Edit account name'} onClick={onEditAccountNameClick}>
            <i className="mdi mdi-pencil fs-6" />
          </a>
        </div>
        <div className="font-monospace d-flex align-items-center gap-1" style={{fontSize: '0.75rem'}}>
          <span className="text-muted">{truncateAddress(account.address)}</span>
          <CopyButton text={account.address} title="Copy address" />
          <a href={`https://jeescan.org/account/${account.address}`} className="jee-icon-btn" target={'_blank'} rel="noreferrer" title={'Open in JEEScan'}><i className="mdi mdi-open-in-new fs-6" /></a>
        </div>
      </div>
      <div className="jee-balance">
        <p className="jee-balance-amount">
          {balance} <span className="jee-balance-unit">JEE</span>
        </p>
        <div className="jee-balance-usd">${Pricing.toUSD(account.network, balance, pricingMultipliers)}</div>
      </div>
      {!hideButtons ?
        <div className="d-flex justify-content-center pb-3 px-3">
          <Link to={sendPath} className="jee-btn-primary w-100 text-center">Send JEE</Link>
        </div>
        :
        null
      }
    </div>
  );
}
