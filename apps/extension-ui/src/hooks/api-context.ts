import { createContext } from 'react';
import { API } from '../modules/api';
import { ext, Messager } from '@jeewallet/util-browser';

export const ApiContext = createContext(new API(new Messager(ext.runtime)));
