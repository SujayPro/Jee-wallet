import React, { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navbar } from './components/shared/navbar';
import { SideNav } from './components/shared/side-nav';
import { Container } from './components/shared/container';
import { RootState } from './store';
import { MAX_BODY_WIDTH } from './constants';
import $ from 'jquery';
import { ext } from '@jeewallet/util-browser';
import { calledFromContentScript, isFullTab, isSidePanel, isTab } from './util';
import {
  setAccountBalances, setAccountTransactions,
  setActiveChain, setActiveTabOrigin, setPricingMultipliers,
  setUserAccount,
  setUserStatus, setVersion
} from './reducers/app-reducer';
import { GetActiveTabOriginResult, GetUserStatusResult, GetVersionResult } from '@jeewallet/types';
import { ApiContext } from './hooks/api-context';
import { ErrorHandlerContext } from './hooks/error-handler-context';
import { ChainType, LocalStorageKey, POPUP_HEIGHT, POPUP_WIDTH, SessionStorageKey, UserStatus } from '@jeewallet/constants';
import isNull from 'lodash/isNull';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  findCryptoAccountInUserAccount,
  getAccountDetailParamsFromUserAccount,
  isApiError,
  RouteBuilder
} from '@jeewallet/util-browser';
import { Pricing, PricingEvent, PricingMultipliers } from './modules/pricing';

export const App = () => {

  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const api = useContext(ApiContext);
  const errorHandler = useContext(ErrorHandlerContext);
  const fromContent = calledFromContentScript(location);

  const {
    userStatus,
    windowWidth,
  } = useSelector(({ appState }: RootState) => appState);

  useEffect(() => {

    if(isSidePanel() || isTab() || fromContent) {
      $('body').css({
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        position: 'absolute',
        width: '100%',
        height: '100%',
        minHeight: '100vh',
      });
      if(isSidePanel()) {
        $('html, body, #root').css({ height: '100%', minHeight: '100vh' });
      }
    } else {
      $('body').css({
        width: POPUP_WIDTH,
        height: POPUP_HEIGHT,
        position: 'relative',
      });
    }

    ext.storage.local.get([LocalStorageKey.SELECTED_CHAIN])
      .then((res) => {
        dispatch(setActiveChain({
          activeChain: res[LocalStorageKey.SELECTED_CHAIN] || ChainType.MAINNET,
        }));
      })
      .catch((err) => errorHandler.handle(err));

    api.getUserStatus()
      .then(async (res: GetUserStatusResult) => {
        if(isApiError(res)) {
          errorHandler.handle(res.error);
        } else {
          const { result } = res;
          const onboardingPatterns = [
            RouteBuilder.tos.generatePathPattern(),
            RouteBuilder.registerAccount.generatePathPattern(),
            RouteBuilder.selectNewWalletType.generatePathPattern(),
            RouteBuilder.newHdWallet.generatePathPattern(),
          ];
          if(result === UserStatus.NOT_REGISTERED) {
            const onOnboarding = onboardingPatterns.some((pattern) => pattern.test(location.pathname));
            if(isSidePanel()) {
              if(!RouteBuilder.openPopupInfo.generatePathPattern().test(location.pathname)) {
                await api.startOnboarding();
                navigate(RouteBuilder.openPopupInfo.fullPath());
              }
            } else if(isFullTab() && !onOnboarding) {
              navigate(RouteBuilder.tos.fullPath());
            } else if(!isTab()) {
              await api.startOnboarding();
              window.close();
            }
          } else if(result === UserStatus.LOCKED) {
            if(!fromContent) {
              navigate(RouteBuilder.unlock.fullPath());
            }
          } else if(result === UserStatus.UNLOCKED) {
            const getRes = await api.getUserAccount();
            if(isApiError(getRes)) {
              errorHandler.handle(getRes.error);
            } else if(isNull(getRes.result)) {
              dispatch(setUserStatus({userStatus: UserStatus.LOCKED}));
              navigate(RouteBuilder.unlock.fullPath());
            } else {
              const { result: account } = getRes;
              dispatch(setUserAccount({userAccount: account}));
              if(account.wallets.length === 0) {
                const walletCreationPatterns = [
                  RouteBuilder.selectNewWalletType.generatePathPattern(),
                  RouteBuilder.newHdWallet.generatePathPattern(),
                ];
                const onWalletCreation = walletCreationPatterns.some((pattern) => pattern.test(location.pathname));
                if(!onWalletCreation) {
                  if(isTab()) {
                    navigate(RouteBuilder.selectNewWalletType.fullPath());
                  } else if(!fromContent) {
                    await api.startNewWallet();
                    window.close();
                  }
                }
              } else {
                if(!fromContent && !isTab()) {
                  const activeAccountRes = await api.getActiveAccount();
                  if(isApiError(activeAccountRes)) {
                    errorHandler.handle(activeAccountRes.error);
                  } else {
                    if(activeAccountRes.result) {
                      const cryptoAccount = findCryptoAccountInUserAccount(account, activeAccountRes.result);
                      if(cryptoAccount) {
                        const accountDetailParams = getAccountDetailParamsFromUserAccount(account, cryptoAccount.id);
                        if(location.pathname === '/') {
                          if(accountDetailParams) {
                            navigate(RouteBuilder.accountDetail.generateFullPath(accountDetailParams));
                          } else {
                            navigate(RouteBuilder.wallets.fullPath());
                          }
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
            }
          }
          dispatch(setUserStatus({
            userStatus: result,
          }));
        }
      })
      .catch(err => errorHandler.handle(err));

  }, [dispatch, api, errorHandler, location.pathname, navigate, fromContent]);

  useEffect(() => {
    ext.storage.session.get([SessionStorageKey.PRICING_MULTIPLIERS])
      .then((res) => {
        if(res) {
          dispatch(setPricingMultipliers({
            pricingMultipliers: res[SessionStorageKey.PRICING_MULTIPLIERS] || {},
          }));
        }
      })
      .catch((err) => errorHandler.handle(err));
    const pricing = new Pricing();
    const listener = (multipliers: PricingMultipliers) => {
      ext.storage.session.set({
        [SessionStorageKey.PRICING_MULTIPLIERS]: multipliers,
      }).catch(err => errorHandler.handle(err));
      dispatch(setPricingMultipliers({pricingMultipliers: multipliers}));
    };
    pricing.on(PricingEvent.UPDATE, listener);
    const updatePricing = () => {
      pricing.update()
        .catch(err => errorHandler.handle(err));
    };
    const interval = setInterval(updatePricing, 300000);
    updatePricing();
    return () => {
      pricing.off(PricingEvent.UPDATE, listener);
      clearInterval(interval);
    }
  }, [dispatch, errorHandler]);

  useEffect(() => {

    const getAccountBalances = async (forceUpdate = false) => {
      try {
        const res = await api.getAccountBalances(forceUpdate ? { forceUpdate: true } : {});
        if(isApiError(res)) {
          errorHandler.handle(res.error);
        } else {
          dispatch(setAccountBalances({accountBalances: res.result}));
        }
      } catch(err: any) {
        errorHandler.handle(err);
      }
    };

    const getAccountTransactions = async (forceUpdate = false) => {
      try {
        const res = await api.getAccountTransactions(forceUpdate ? { forceUpdate: true } : {});
        if(isApiError(res)) {
          errorHandler.handle(res.error);
        } else {
          dispatch(setAccountTransactions({accountTransactions: res.result}));
        }
      } catch(err: any) {
        errorHandler.handle(err);
      }
    };

    let balancesInterval: ReturnType<typeof setInterval> | undefined;
    let transactionsInterval: ReturnType<typeof setInterval> | undefined;
    if(userStatus === UserStatus.UNLOCKED) {
      balancesInterval = setInterval(() => getAccountBalances(), 30000);
      transactionsInterval = setInterval(() => getAccountTransactions(true), 60000);
      getAccountBalances(true)
        .catch(err => errorHandler.handle(err));
      getAccountTransactions(true)
        .catch(err => errorHandler.handle(err));

      api.getActiveTabOrigin()
        .then(async (res: GetActiveTabOriginResult) => {
          if(isApiError(res)) {
            errorHandler.handle(res.error);
          } else {
            dispatch(setActiveTabOrigin({activeTabOrigin: res.result}));
          }
        })
        .catch(err => errorHandler.handle(err));

      api.getVersion()
        .then(async (res: GetVersionResult) => {
          if(isApiError(res)) {
            errorHandler.handle(res.error);
          } else {
            dispatch(setVersion({version: res.result}));
          }
        })
        .catch(err => errorHandler.handle(err));

    }
    return () => {
      if (balancesInterval) clearInterval(balancesInterval);
      if (transactionsInterval) clearInterval(transactionsInterval);
    };
  }, [dispatch, api, errorHandler, userStatus]);

  const styles = {
    outerFlexContainer: {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
    innerFlexContainer: {
      width: isFullTab() ? '100%' : (windowWidth > MAX_BODY_WIDTH ? MAX_BODY_WIDTH : windowWidth),
      maxWidth: isFullTab() ? MAX_BODY_WIDTH : undefined,
      minWidth: isFullTab() ? undefined : POPUP_WIDTH,
      margin: isFullTab() ? '0 auto' : undefined,
    },
  };

  const hideNavbarPatterns = [
    RouteBuilder.tos.generatePathPattern(),
    RouteBuilder.registerAccount.generatePathPattern(),
    RouteBuilder.selectNewWalletType.generatePathPattern(),
    RouteBuilder.unlock.generatePathPattern(),
    RouteBuilder.newHdWallet.generatePathPattern(),
    RouteBuilder.openPopupInfo.generatePathPattern(),
    RouteBuilder.connect.generatePathPattern(),
  ];

  const sidePanel = isSidePanel();
  const showNavbar = userStatus && !hideNavbarPatterns.some(p => p.test(location.pathname));
  const showSideNav = sidePanel && showNavbar && userStatus === UserStatus.UNLOCKED;

  if (sidePanel) {
    return (
      <div className="jee-side-layout" style={styles.outerFlexContainer as React.CSSProperties}>
        {showSideNav ? <SideNav /> : null}
        <div className="jee-side-main">
          {showNavbar ? <Navbar /> : null}
          <div className="jee-side-main-content position-relative flex-grow-1">
            <Outlet />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={'position-absolute d-flex flex-column justify-content-center align-items-center'}
      style={styles.outerFlexContainer as React.CSSProperties}
    >
      <div
        className={'position-relative flex-grow-1'}
        style={styles.innerFlexContainer as React.CSSProperties}
      >
        <Container>
          {!showNavbar ? null : <Navbar />}
          <div className={'flex-grow-1 position-relative'}>
            <Outlet />
          </div>
        </Container>
      </div>
    </div>
  );
};
