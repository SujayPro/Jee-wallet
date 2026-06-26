import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  findCryptoAccountInUserAccount,
  getAccountDetailParamsFromUserAccount,
  RouteBuilder,
} from '@jeewallet/util-browser';

export const SideNav = () => {

  const navigate = useNavigate();
  const location = useLocation();
  const {
    userAccount,
    activeAccount,
    version,
  } = useSelector(({ appState }: RootState) => appState);

  const walletsActive = RouteBuilder.wallets.generatePathPattern().test(location.pathname);
  const settingsActive = RouteBuilder.settings.generatePathPattern().test(location.pathname);
  const accountActive = RouteBuilder.accountDetail.generatePathPattern().test(location.pathname)
    || RouteBuilder.send.generatePathPattern().test(location.pathname);

  const goHome = (e: React.MouseEvent) => {
    e.preventDefault();
    if(!userAccount) {
      return;
    }
    if(activeAccount) {
      const account = findCryptoAccountInUserAccount(userAccount, activeAccount);
      if(account) {
        const params = getAccountDetailParamsFromUserAccount(userAccount, account.id);
        if(params) {
          navigate(RouteBuilder.accountDetail.generateFullPath(params));
          return;
        }
      }
    }
    navigate(RouteBuilder.wallets.fullPath());
  };

  const goWallets = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(RouteBuilder.wallets.fullPath());
  };

  const goSettings = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(RouteBuilder.settings.fullPath());
  };

  return (
    <nav className="jee-side-nav">
      <div className="jee-side-nav-brand">
        <img src="https://jee.money/assets/logo/jee-chain.png" alt="JEE" width={28} height={28} />
      </div>
      <div className="jee-side-nav-items">
        <a
          href="#"
          className={`jee-side-nav-item ${accountActive ? 'jee-side-nav-item--active' : ''}`}
          title="Account"
          onClick={goHome}
        >
          <i className="mdi mdi-home-outline" />
          <span>Home</span>
        </a>
        <a
          href="#"
          className={`jee-side-nav-item ${walletsActive ? 'jee-side-nav-item--active' : ''}`}
          title="Wallets"
          onClick={goWallets}
        >
          <i className="mdi mdi-wallet-outline" />
          <span>Wallets</span>
        </a>
        <a
          href="#"
          className={`jee-side-nav-item ${settingsActive ? 'jee-side-nav-item--active' : ''}`}
          title="Settings"
          onClick={goSettings}
        >
          <i className="mdi mdi-cog-outline" />
          <span>Settings</span>
        </a>
      </div>
      <div className="jee-side-nav-footer font-monospace">v{version}</div>
    </nav>
  );
};
