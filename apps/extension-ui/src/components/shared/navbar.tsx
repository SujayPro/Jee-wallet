import React, { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { ErrorHandlerContext } from '../../hooks/error-handler-context';
import { ApiContext } from '../../hooks/api-context';
import * as bootstrap from 'bootstrap';
import { setUserAccount } from '../../reducers/app-reducer';
import { useLocation, useNavigate } from 'react-router-dom';
import { RouteBuilder } from '@jeewallet/util-browser';
import { calledFromContentScript, isSidePanel } from '../../util';
import { jeeConfirm, jeeSuccess } from '../../modules/jee-dialog';

export const Navbar = () => {

  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const errorHandler = useContext(ErrorHandlerContext);
  const api = useContext(ApiContext);
  const {
    activeTabOrigin,
    userAccount,
    version,
  } = useSelector(({ appState }: RootState) => appState);
  const fromContentScript = calledFromContentScript(location);

  const [ originAllowed, setOriginAllowed ] = React.useState(false);

  useEffect(() => {
    const { allowedOrigins = [] } = userAccount ? userAccount : {};
    setOriginAllowed(allowedOrigins.some(o => o.origin === activeTabOrigin));
  }, [userAccount, activeTabOrigin]);

  const onLockClick = async (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    try {
      e.preventDefault();
      const res = await api.lockUserAccount();
      if('error' in res) {
        errorHandler.handle(res.error);
      } else {
        window.close();
      }
    } catch(err: any) {
      errorHandler.handle(err);
    }
  };
  const onSettingsClick = async (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    try {
      e.preventDefault();
      navigate(RouteBuilder.settings.fullPath());
    } catch(err: any) {
      errorHandler.handle(err);
    }
  };
  const onOriginAllowedClick = async (e: React.MouseEvent) => {
    try {
      e.preventDefault();
      const confirmed = await jeeConfirm({
        title: 'Revoke Wallet Access?',
        text: `Would you like to revoke wallet access for ${activeTabOrigin}?`,
        icon: 'warning',
        confirmText: 'Revoke Access',
        closeOnConfirm: false,
      });
      if(!confirmed) {
        return;
      }
      const res = await api.disconnectSite({origin: activeTabOrigin});
      if('error' in res) {
        errorHandler.handle(res.error);
      } else if(res) {
        const userAccountRes = await api.getUserAccount();
        if('error' in userAccountRes) {
          errorHandler.handle(userAccountRes.error);
        } else {
          if(!userAccountRes.result) {
            throw new Error('User account not found.');
          }
          dispatch(setUserAccount({userAccount: userAccountRes.result}));
          await jeeSuccess('Wallet Access Revoked', `Wallet access for ${activeTabOrigin} has been revoked.`);
        }
      }
    } catch(err: any) {
      errorHandler.handle(err);
    }
  };

  const showMenuDropdown = !fromContentScript;
  const sidePanel = isSidePanel();

  return (
    <nav className="navbar jee-navbar d-flex flex-row justify-content-between align-items-center">
      <a href={'#'} className="jee-brand" onClick={e => e.preventDefault()}>
        {!sidePanel ?
          <img src={'https://jee.money/assets/logo/jee-chain.png'} alt="JEE" height={28} width={28} />
          :
          null
        }
        <span className="jee-brand-title">JEE WALLET</span>
      </a>
      <div className="d-flex align-items-center gap-2">
        <span className="jee-badge">
          <span className="jee-badge-dot" />
          Mainnet
        </span>
        {originAllowed ?
          <a href={'#'} className="jee-icon-btn" title={'Tab allowed access to wallet'} onClick={onOriginAllowedClick}><i className={`mdi mdi-link fs-5 text-success ${fromContentScript ? 'd-none' : ''}`} /></a>
          :
          <span className="jee-icon-btn" title={'Tab not allowed access to wallet'}><i className={`mdi mdi-link-off fs-5 ${fromContentScript ? 'd-none' : ''}`} /></span>
        }
        {showMenuDropdown ?
          <div className="position-relative">
            <a
              href={'#'}
              className="jee-icon-btn"
              title={'Menu'}
              data-bs-toggle="dropdown"
              ref={(node) => {
                if(node) {
                  new bootstrap.Dropdown(node);
                }
              }}
            ><i className={'mdi mdi-menu fs-5'} /></a>
            <ul className={'dropdown-menu dropdown-menu-end'}>
              <li><a className="dropdown-item" href="#" onClick={onSettingsClick}><i className={'mdi mdi-cog'}/> Settings</a></li>
              <li><a className="dropdown-item" href="https://jee.money/wallet" target={'_blank'} rel="noreferrer"><i className={'mdi mdi-wallet'}/> Wallet</a></li>
              <li><a className="dropdown-item" href="https://jeescan.org" target={'_blank'} rel="noreferrer"><i className={'mdi mdi-open-in-new'}/> JEEScan</a></li>
              <li><a className="dropdown-item" href="#" onClick={onLockClick}><i className={'mdi mdi-lock-outline'}/> Lock Wallet</a></li>
              <li><hr className="dropdown-divider"/></li>
              <li><span className="dropdown-item disabled">v<span className={'font-monospace'}>{version}</span></span></li>
            </ul>
          </div>
          :
          null
        }
      </div>
    </nav>
  );
};
