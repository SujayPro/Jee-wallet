import * as uuid from 'uuid';
import { PASSWORD_MIN_LENGTH } from './constants';
import { Location } from 'react-router-dom';
import { POPUP_WIDTH } from '@jeewallet/constants';

export const getRandomInt = (min: number, max: number) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min);
};

export const generateFakeAddress = () => {
  return uuid.v4().replace(/-/g, '');
};

export const truncateAddress = (address: string, num = 6) => {
  return `${address.slice(0, num)}\u2026${address.slice(-1 * num)}`;
};

export const isDev = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

export const isSidePanel = (): boolean => {
  const params = new URLSearchParams(window.location.search);
  return params.get('mode') === 'sidepanel';
};

export const isFullTab = (): boolean => {
  return !isSidePanel() && window.innerWidth > POPUP_WIDTH;
};

export const isTab = (): boolean => {
  return isSidePanel() || isFullTab();
};

export const isValidPassword = (password: string): boolean => {
  return !!password.trim() && password.length >= PASSWORD_MIN_LENGTH;
};

export const generateJeescanAccountUrl = (address: string) => {
  return `https://jeescan.org/account/${address}`;
}

export const calledFromContentScript = (location: Location): boolean => {
  const queryParams = new URLSearchParams(location.search);
  return queryParams.get('content') === 'true';
}

export const validateUrl = (url: string): string => {
  try {
    const res = new URL(url);
    return res.href.replace(/\/$/, '');
  } catch {
    return '';
  }
};
