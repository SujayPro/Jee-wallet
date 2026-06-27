import {
  AlarmName,
  AppLang,
  ChainType,
  CoinType,
  defaultHideTestnets,
  defaultLockTimeout,
  LocalStorageKey,
  POPUP_HEIGHT,
  POPUP_WIDTH,
  SessionStorageKey,
  UserStatus
} from '@jeewallet/constants';
import { Logger } from './logger';
import { StorageManager } from './storage-manager';
import {
  AllowedOrigin,
  AccountTransaction,
  APIEvent,
  ConnectSiteParams,
  ConnectSiteResult,
  ContentAPIEvent,
  CryptoAccount, DeleteWalletParams, DeleteWalletResult,
  DisconnectSiteParams,
  DisconnectSiteResult,
  ExportKeyfileParams,
  ExportKeyfileResult,
  ExportMnemonicParams,
  ExportMnemonicResult,
  ExportPrivateKeyParams,
  ExportPrivateKeyResult,
  GenerateMnemonicResult,
  GetAccountBalancesParams,
  GetAccountBalancesResult,
  GetAccountTransactionsParams,
  GetAccountTransactionsResult,
  GetActiveAccountResult,
  GetActiveTabOriginResult,
  GetBalanceParams,
  GetBalanceResult,
  GetHeightParams,
  GetHeightResult, GetRpcEndpointParams, GetRpcEndpointResult,
  GetTransactionParams,
  GetTransactionResult,
  GetUserAccountResult,
  GetUserStatusResult,
  InsertCryptoAccountParams,
  InsertCryptoAccountResult,
  InsertHdWalletParams,
  InsertHdWalletResult,
  InsertLegacyWalletParams,
  InsertLegacyWalletResult,
  LockUserAccountResult,
  PoktRpcGetAccountParams,
  PoktRpcGetAccountResult,
  PoktRpcGetAppParams,
  PoktRpcGetAppResult,
  PoktRpcGetBalanceParams,
  PoktRpcGetBalanceResult,
  PoktRpcGetBlockNumberParams,
  PoktRpcGetBlockNumberResult,
  PoktRpcGetBlockParams,
  PoktRpcGetBlockResult,
  PoktRpcGetNodeParams,
  PoktRpcGetNodeResult,
  PoktRpcGetTransactionParams,
  PoktRpcGetTransactionResult,
  RegisterUserParams,
  RegisterUserResult,
  RequestAccountParams,
  RequestAccountResult,
  SaveActiveAccountParams,
  SaveActiveAccountResult,
  SaveFileParams,
  SendTransactionParams,
  SendTransactionResult,
  SignMessageParams,
  SignMessageResult,
  StakeNodeParams,
  StakeNodeResult,
  StartNewWalletResult,
  StartOnboardingResult,
  UnlockUserAccountParams,
  UnlockUserAccountResult,
  UpdateAccountNameParams,
  UpdateAccountNameResult,
  UpdateUserSettingsParams,
  UpdateUserSettingsResult,
  UpdateWalletNameParams,
  UpdateWalletNameResult,
  UserAccount,
  UserSettings,
  UserWallet,
  ValidateMnemonicParams,
  ValidateMnemonicResult,
  WalletAccount,
} from '@jeewallet/types';
import {
  getHostFromOrigin,
  ext,
  Messager,
  prepMnemonic,
  RouteBuilder
} from '@jeewallet/util-browser';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import {
  AES256GCMConfig,
  argon2,
  decrypt as generalDecrypt,
  defaultAES256GCMConfig,
  defaultPBKDF2Config,
  defaultArgon2Config,
  defaultSeedBits,
  deriveKey,
  encryptAES256GCM,
  EncryptionResult,
  generateSalt
} from '@jeewallet/util';
import {
  JEE_MAINNET_LCD,
  JEE_MAINNET_RPC,
} from './jee-endpoints';
import {
  generateMnemonic,
  isValidMnemonic,
  mnemonicToSeed,
  JeeUtils,
  CosmosUtils,
  seedToMasterId
} from '@jeewallet/wallet-utils';
import omit from 'lodash/omit';
import { SessionSecretManager } from './session-secret-manager';
import {
  BalanceLogStore,
  compactTx,
  expandTx,
  expandTxLog,
  mergeAccountMaps,
  mergeTxLists,
  sortTransactionMap,
  TxLogStore,
} from './local-cache';
import isNumber from 'lodash/isNumber';
import MessageSender = chrome.runtime.MessageSender;

interface ExtendedCryptoAccount extends CryptoAccount {
  privateKey: EncryptionResult
}
interface ExtendedWalletAccount extends WalletAccount {
  accounts: ExtendedCryptoAccount[]
}
interface ExtendedUserWallet extends UserWallet {
  seed: EncryptionResult
  // Encrypted recovery mnemonic. Optional because wallets created before this
  // field was introduced only stored the derived `seed` (mnemonic is not
  // recoverable from a seed).
  mnemonic?: EncryptionResult
  accounts: ExtendedWalletAccount[]
}
interface ExtendedLegacyUserWallet extends UserWallet {
  accounts: ExtendedWalletAccount[]
}
interface ExtendedUserAccount extends UserAccount {
  wallets: (ExtendedUserWallet|ExtendedLegacyUserWallet)[]
}

const findCryptoAccountInUserAccount = (userAccount: ExtendedUserAccount, accountId: string): ExtendedCryptoAccount|null => {
  let cryptoAccount: ExtendedCryptoAccount|null = null;
  for(const wallet of userAccount.wallets) {
    for(const walletAccount of wallet.accounts) {
      for(const ca of walletAccount.accounts) {
        if(ca.id === accountId) {
          cryptoAccount = ca;
          break;
        }
      }
    }
  }
  return cryptoAccount;
};

interface ExtendedCryptoAccountWithWalletId extends ExtendedCryptoAccount {
  walletId: string
}
const findCryptoAccountInUserAccountWithWalletId = (userAccount: ExtendedUserAccount, accountId: string): ExtendedCryptoAccountWithWalletId|null => {
  let cryptoAccount: ExtendedCryptoAccountWithWalletId|null = null;
  for(const wallet of userAccount.wallets) {
    for(const walletAccount of wallet.accounts) {
      for(const ca of walletAccount.accounts) {
        if(ca.id === accountId) {
          cryptoAccount = {
            ...ca,
            walletId: wallet.id,
          }
          break;
        }
      }
    }
  }
  return cryptoAccount;
};

const jeeEndpoints: {[network: string]: {[chain: string]: {lcd: string, rpc: string}}} = {
  [CoinType.JEE]: {
    [ChainType.MAINNET]: {
      lcd: process.env.JEE_MAINNET_LCD || JEE_MAINNET_LCD,
      rpc: process.env.JEE_MAINNET_RPC || JEE_MAINNET_RPC,
    },
    [ChainType.TESTNET]: {
      lcd: process.env.JEE_TESTNET_LCD || '',
      rpc: process.env.JEE_TESTNET_RPC || '',
    },
  }
};

const getLcdEndpoint = async (network: CoinType, chain: ChainType): Promise<string> => {
  return jeeEndpoints[network]?.[chain]?.lcd || '';
};

const getRpcEndpoint = async (network: CoinType, chain: ChainType): Promise<string> => {
  return jeeEndpoints[network]?.[chain]?.rpc || '';
};

const openTosTab = async () => {
  await ext.tabs.create({
    active: true,
    url: ext.runtime.getURL(`index.html#${RouteBuilder.tos.fullPath()}`),
  });
};
const openNewWalletTab = async () => {
  await ext.tabs.create({
    active: true,
    url: ext.runtime.getURL(`index.html#${RouteBuilder.selectNewWalletType.fullPath()}`),
  });
};
const generateCryptoAccountId = (network: CoinType, chain: ChainType, address: string): string => {
  return `${network}-${chain}-${address}`;
};
const splitCryptoAccountId = (accountId: string): {network: CoinType, chain: ChainType, address: string} => {
  const [ network, chain, address ] = accountId.split('-') as [CoinType, ChainType, string];
  return {
    network,
    chain,
    address,
  };
};

dayjs.extend(utc);

const messager = new Messager(ext.runtime, true);

const storageManager = new StorageManager(ext.storage.local);
const sessionManager = new StorageManager(ext.storage.session);

let loggerInstance: Logger|null = null;

const getLogger = (): Logger => {
  if(!loggerInstance) {
    loggerInstance = new Logger(ext.storage.local);
  }
  return loggerInstance;
};

const sessionSecretManager = new SessionSecretManager(sessionManager);
const sessionSecretReady = sessionSecretManager.initialize()
  .then(() => {
    const logger = getLogger();
    logger.info('SessionSecretManager initialized.');
  })
  .catch((err) => {
    console.error('SessionSecretManager initialization failed.', err);
    throw err;
  });

const sanitizeCryptoAccount = (account: ExtendedCryptoAccount): CryptoAccount => {
  return {
    ...omit(account, ['privateKey']),
  };
};
const sanitizeWalletAccount = (account: ExtendedWalletAccount): WalletAccount => {
  return {
    ...account,
    accounts: account.accounts
      .map((a): CryptoAccount => sanitizeCryptoAccount(a)),
  };
};
const sanitizeUserWallet = (wallet: ExtendedUserWallet|ExtendedLegacyUserWallet): UserWallet => {
  if('seed' in wallet) {
    return {
      ...omit(wallet, ['seed', 'mnemonic']),
      accounts: wallet.accounts
        .map((a): WalletAccount => sanitizeWalletAccount(a)),
    };
  } else {
    return {
      ...wallet,
      accounts: wallet.accounts
        .map((a): WalletAccount => sanitizeWalletAccount(a)),
    };
  }
};
const sanitizeUserAccount = (account: ExtendedUserAccount): UserAccount => {
  return {
    ...account,
    wallets: account.wallets
      .map((w): UserWallet => sanitizeUserWallet(w)),
  };
};

export const startBackground = () => {

  const logger = getLogger();

  const withServiceWorkerKeepAlive = async <T>(work: () => Promise<T>): Promise<T> => {
    const tick = () => {
      ext.runtime.getPlatformInfo().catch(() => {});
    };
    tick();
    const interval = setInterval(tick, 20_000);
    try {
      return await work();
    } finally {
      clearInterval(interval);
    }
  };

  const getUserAccount = async (): Promise<ExtendedUserAccount|null> => {
    return await sessionManager.get(SessionStorageKey.USER_ACCOUNT) || null;
  };
  const getUserKey = async (): Promise<string|null> => {
    return await sessionSecretManager.get(SessionStorageKey.USER_KEY) || null;
  };
  const getEncryptionSettings = async (): Promise<AES256GCMConfig|null> => {
    return await sessionManager.get(SessionStorageKey.ENCRYPTION_SETTINGS) || null;
  };

  const encrypt = async (data: any): Promise<EncryptionResult> => {
    const key = await getUserKey();
    const encryptionSettings = await getEncryptionSettings();
    if(!key || !encryptionSettings) {
      throw new Error('User account locked.');
    }
    return await encryptAES256GCM(data, key, encryptionSettings);
  };
  const decrypt = async (encrypted: EncryptionResult): Promise<any> => {
    const key = await getUserKey();
    if(!key) {
      throw new Error('User account locked.');
    }
    return await generalDecrypt(encrypted, key);
  };

  const verifyUserPassword = async (password: string): Promise<boolean> => {
    // Security: always run the full key-derivation + decryption path so that
    // a wrong password takes the same time as a correct one (timing side-channel
    // resistance).  We never short-circuit before the decrypt attempt.
    let success = false;
    try {
      const encrypted: EncryptionResult = await storageManager.get(LocalStorageKey.USER_ACCOUNT);
      if(!encrypted) {
        // No account stored — still derive a key against a dummy salt so the
        // timing profile matches the normal path.
        const hashSettings = await storageManager.get(LocalStorageKey.HASH_SETTINGS) || defaultPBKDF2Config;
        const encryptionSettings = await storageManager.get(LocalStorageKey.ENCRYPTION_SETTINGS) || defaultAES256GCMConfig;
        const dummySalt = new Array(encryptionSettings.keyLength).fill(0).join('');
        await deriveKey(password.trim(), dummySalt, encryptionSettings.keyLength, hashSettings);
        return false;
      }
      const hashSettings = await storageManager.get(LocalStorageKey.HASH_SETTINGS);
      const encryptionSettings = await storageManager.get(LocalStorageKey.ENCRYPTION_SETTINGS);
      const salt = await storageManager.get(LocalStorageKey.KEY_SALT);
      const key = await deriveKey(password.trim(), salt, encryptionSettings.keyLength, hashSettings);
      await generalDecrypt(encrypted, key);
      success = true;
    } catch {
      // Intentionally swallow — success remains false.
    }
    return success;
  };

  const loadTxLog = async (): Promise<TxLogStore> => {
    return await storageManager.get(LocalStorageKey.TX_LOG) || {};
  };

  const saveTxLog = async (store: TxLogStore): Promise<void> => {
    await storageManager.set(LocalStorageKey.TX_LOG, store);
  };

  const persistTransactions = async (transactions: Record<string, AccountTransaction[]>): Promise<void> => {
    const store = await loadTxLog();
    for (const [accountId, txs] of Object.entries(transactions)) {
      if (!txs.length) {
        continue;
      }
      store[accountId] = mergeTxLists(store[accountId] || [], txs);
    }
    await saveTxLog(store);
  };

  const appendLocalTx = async (accountId: string, tx: AccountTransaction): Promise<void> => {
    const store = await loadTxLog();
    store[accountId] = mergeTxLists(store[accountId] || [], [tx]);
    await saveTxLog(store);
    const sessionTx: Record<string, AccountTransaction[]> = await sessionManager.get(SessionStorageKey.TRANSACTIONS) || {};
    sessionTx[accountId] = mergeTxLists(
      (sessionTx[accountId] || []).map(compactTx),
      [tx],
    ).map(expandTx);
    await sessionManager.set(SessionStorageKey.TRANSACTIONS, sessionTx);
  };

  const loadBalanceLog = async (): Promise<BalanceLogStore> => {
    return await storageManager.get(LocalStorageKey.BALANCE_LOG) || {};
  };

  const persistBalances = async (balances: BalanceLogStore): Promise<void> => {
    const existing = await loadBalanceLog();
    await storageManager.set(LocalStorageKey.BALANCE_LOG, {...existing, ...balances});
  };

  const hydrateSessionFromLocalCache = async (): Promise<void> => {
    const cachedBalances = await loadBalanceLog();
    const cachedTxs = expandTxLog(await loadTxLog());
    const sessionBalances: BalanceLogStore = await sessionManager.get(SessionStorageKey.BALANCES) || {};
    const sessionTxs: Record<string, AccountTransaction[]> = await sessionManager.get(SessionStorageKey.TRANSACTIONS) || {};
    await sessionManager.set(SessionStorageKey.BALANCES, mergeAccountMaps(
      sessionBalances,
      cachedBalances,
      (v) => !v || v === '0',
    ) as BalanceLogStore);
    await sessionManager.set(SessionStorageKey.TRANSACTIONS, mergeAccountMaps(
      sessionTxs,
      cachedTxs,
      (v) => !Array.isArray(v) || v.length === 0,
    ) as Record<string, AccountTransaction[]>);
  };

  const mergeWithCachedTransactions = async (
    transactions: Record<string, AccountTransaction[]>,
  ): Promise<Record<string, AccountTransaction[]>> => {
    const cached = expandTxLog(await loadTxLog());
    const merged = mergeAccountMaps(
      transactions,
      cached,
      (v) => !Array.isArray(v) || v.length === 0,
    ) as Record<string, AccountTransaction[]>;
    return sortTransactionMap(merged);
  };

  const mergeWithCachedBalances = async (
    balances: BalanceLogStore,
  ): Promise<BalanceLogStore> => {
    const cached = await loadBalanceLog();
    return mergeAccountMaps(
      balances,
      cached,
      (v) => !v || v === '0',
    ) as BalanceLogStore;
  };

  const pinActiveAccount = async (accountId: string): Promise<void> => {
    const encrypted = await encrypt(accountId);
    await storageManager.set(LocalStorageKey.ACTIVE_ACCOUNT, encrypted);
  };

  const encryptSaveUserAccount = async (account: ExtendedUserAccount) => {
    const encrypted = await encrypt(account);
    await storageManager.set(LocalStorageKey.USER_ACCOUNT, encrypted);
  }

  const resetLockTimer = async () => {
    const userAccount = await getUserAccount();
    if(userAccount) {
      const timeout = isNumber(userAccount.settings.lockTimeout) ? userAccount.settings.lockTimeout : defaultLockTimeout;
      ext.alarms.clear(AlarmName.LOCK_USER_ACCOUNT)
        .then(() => {
          ext.alarms.create(AlarmName.LOCK_USER_ACCOUNT, {
            delayInMinutes: timeout,
          }).catch(err => {
            console.error(err);
          });
        })
        .catch(err => {
          console.error(err);
        });
    }
  };

  // messager.register(BackgroundListener.GET_LOGS, async () => {
  //   const logger = getLogger();
  //   const logs = logger.getLogs();
  //   return { logs };
  // });

  // Wake / health-check — registered first so UI can reach a sleeping service worker.
  messager.register(APIEvent.PING, async (): Promise<{ result: true }> => {
    return { result: true };
  });

  messager.register(APIEvent.START_ONBOARDING, async (): Promise<StartOnboardingResult> => {
    logger.info('Starting onboarding.');
    await openTosTab();
    return {
      result: true,
    };
  });

  messager.register(APIEvent.START_NEW_WALLET, async (): Promise<StartNewWalletResult> => {
    logger.info('Starting new wallet.');
    await openNewWalletTab();
    return {
      result: true,
    };
  });

  messager.register(APIEvent.GET_USER_STATUS, async (): Promise<GetUserStatusResult> => {
    const userAccount = await getUserAccount();
    if(userAccount) {
      return { result: UserStatus.UNLOCKED };
    }
    const res: EncryptionResult|undefined = await storageManager.get(LocalStorageKey.USER_ACCOUNT);
    if(res) {
      return { result: UserStatus.LOCKED };
    }
    return { result: UserStatus.NOT_REGISTERED };
  });

  messager.register(APIEvent.REGISTER_USER, async ({ password }: RegisterUserParams): Promise<RegisterUserResult> => {
    return withServiceWorkerKeepAlive(async () => {
    try {
      await sessionSecretReady;
      if(!sessionSecretManager.isInitialized()) {
        await sessionSecretManager.initialize();
      }
    logger.info('Registering user.');

    // Security: trim the password consistently before every use so that
    // "password" and "password " are treated identically everywhere.
    const trimmedPassword = password.trim();
    if(!trimmedPassword) {
      throw new Error('Password is required.');
    }

    const account: ExtendedUserAccount = {
      language: AppLang.en,
      tosAccepted: dayjs.utc().toISOString(),
      allowedOrigins: [],
      settings: {
        hideTestnets: defaultHideTestnets,
        lockTimeout: defaultLockTimeout,
      },
      wallets: [],
    };

    const hashSettings = {
      ...defaultPBKDF2Config,
    };
    logger.info('Saving hash settings.');
    await storageManager.set(LocalStorageKey.HASH_SETTINGS, hashSettings);

    const encryptionSettings = {
      ...defaultAES256GCMConfig,
    };
    logger.info('Saving encryption settings.');
    await storageManager.set(LocalStorageKey.ENCRYPTION_SETTINGS, encryptionSettings);
    await sessionManager.set(SessionStorageKey.ENCRYPTION_SETTINGS, encryptionSettings);

    const salt = await generateSalt(encryptionSettings.keyLength);
    logger.info('Saving salt.');
    await storageManager.set(LocalStorageKey.KEY_SALT, salt);

    // Use trimmedPassword — never the raw value — for key derivation.
    const key = await deriveKey(trimmedPassword, salt, encryptionSettings.keyLength, hashSettings);
    await sessionSecretManager.set(SessionStorageKey.USER_KEY, key);

    logger.info('Saving encrypted user account.');
    await encryptSaveUserAccount(account);

    await sessionManager.set(SessionStorageKey.USER_ACCOUNT, account);
    await resetLockTimer();
    return { result: sanitizeUserAccount(account) };
    } catch (err: any) {
      // Security: log the message only — never log the stack trace to persistent
      // storage because it may be surfaced to the UI or telemetry.
      logger.error(`Registration failed: ${err?.message || 'Unknown error'}`);
      return {
        error: {
          message: err?.message || 'Registration failed.',
          // Never return real stack traces to callers — send an empty string
          // to satisfy the ErrorResult type contract without leaking internals.
          stack: '',
        },
      };
    }
    });
  });

  messager.register(APIEvent.UNLOCK_USER_ACCOUNT, async ({ password }: UnlockUserAccountParams): Promise<UnlockUserAccountResult> => {
    return withServiceWorkerKeepAlive(async () => {
    logger.info('Unlocking user account.');

    // Security: trim consistently — same rule as registration so that a
    // password set with trailing whitespace still unlocks correctly.
    const trimmedPassword = password.trim();
    if(!trimmedPassword) {
      return {result: null};
    }

    const encrypted: EncryptionResult = await storageManager.get(LocalStorageKey.USER_ACCOUNT);
    if(!encrypted) {
      return {result: null};
    }
    const hashSettings = await storageManager.get(LocalStorageKey.HASH_SETTINGS);
    const encryptionSettings = await storageManager.get(LocalStorageKey.ENCRYPTION_SETTINGS);
    await sessionManager.set(SessionStorageKey.ENCRYPTION_SETTINGS, encryptionSettings);
    const salt = await storageManager.get(LocalStorageKey.KEY_SALT);
    const key = await deriveKey(trimmedPassword, salt, encryptionSettings.keyLength, hashSettings);
    await sessionSecretManager.set(SessionStorageKey.USER_KEY, key);

    try {
      const decrypted: ExtendedUserAccount = await decrypt(encrypted);
      await sessionManager.set(SessionStorageKey.USER_ACCOUNT, decrypted);

      await resetLockTimer();

      await Promise.all([
        updateBalances(),
        updateAccountTransactions(),
      ]);
      await hydrateSessionFromLocalCache();

      return { result: sanitizeUserAccount(decrypted) };
    } catch(err) {
      // Security: clear the bad key from session so it cannot be reused.
      await sessionSecretManager.remove(SessionStorageKey.USER_KEY);
      await sessionManager.remove(SessionStorageKey.ENCRYPTION_SETTINGS);
      return {result: null};
    }
    });
  });

  messager.register(APIEvent.GET_USER_ACCOUNT, async (): Promise<GetUserAccountResult> => {
    const userAccount = await getUserAccount();
    if(!userAccount) {
      return {result: null};
    }
    return {result: sanitizeUserAccount(userAccount)};
  });

  messager.register(APIEvent.GENERATE_MNEMONIC, async (): Promise<GenerateMnemonicResult> => {
    const mnemonic = await generateMnemonic(defaultSeedBits);
    return {result: mnemonic};
  });

  messager.register(APIEvent.VALIDATE_MNEMONIC, async ({ mnemonic }: ValidateMnemonicParams): Promise<ValidateMnemonicResult> => {
    const prepped = prepMnemonic(mnemonic);
    return {result: isValidMnemonic(prepped)};
  });

  messager.register(APIEvent.INSERT_HD_WALLET, async ({ mnemonic }: InsertHdWalletParams): Promise<InsertHdWalletResult> => {
    const userAccount = await getUserAccount();
    const prepped = prepMnemonic(mnemonic);
    const isValid = isValidMnemonic(prepped);
    if(!isValid) {
      throw new Error('Invalid mnemonic passphrase.');
    } else if(!userAccount) {
      throw new Error('User account locked.');
    }
    const seed = await mnemonicToSeed(prepped);
    const encryptedSeed = await encrypt(seed);
    const encryptedMnemonic = await encrypt(prepped);
    const id = seedToMasterId(seed);
    const found = userAccount.wallets.find(w => w.id === id);
    if(found) {
      throw new Error('Wallet already exists.');
    }
    const account0Node = JeeUtils.deriveFromSeed(seed, 0);
    const encryptedPrivateKey = await encrypt(account0Node.privateKey);
    let walletCount = userAccount.wallets.filter(w => !w.legacy).length;
    let walletName = '';
    while (!walletName || userAccount.wallets.some(w => w.name === walletName)) {
      walletCount++;
      walletName = `HD Wallet ${walletCount}`;
    }
    const firstAccountId = generateCryptoAccountId(CoinType.JEE, ChainType.MAINNET, account0Node.address);
    const newWallet: ExtendedUserWallet = {
      id,
      name: walletName,
      createdAt: dayjs.utc().toISOString(),
      legacy: false,
      seed: encryptedSeed,
      mnemonic: encryptedMnemonic,
      language: userAccount.language,
      accounts: [
        {
          network: CoinType.JEE,
          chain: ChainType.MAINNET,
          accounts: [
            {
              id: firstAccountId,
              name: `${CoinType.JEE} Account ${account0Node.index + 1}`,
              network: CoinType.JEE,
              chain: ChainType.MAINNET,
              derivationPath: JeeUtils.chainMeta[ChainType.MAINNET].derivationPath,
              index: account0Node.index,
              address: account0Node.address,
              privateKey: encryptedPrivateKey,
              publicKey: account0Node.publicKey,
            }
          ]
        },
      ],
    };
    userAccount.wallets.push(newWallet);
    await sessionManager.set(SessionStorageKey.USER_ACCOUNT, userAccount);
    await encryptSaveUserAccount(userAccount);
    await pinActiveAccount(firstAccountId);
    Promise
      .all([
        updateBalances(),
        updateAccountTransactions(),
      ])
      .catch(err => {
        console.error(err);
      });
    return {result: sanitizeUserWallet(newWallet)};
  });

  messager.register(APIEvent.INSERT_LEGACY_WALLET, async (params: InsertLegacyWalletParams): Promise<InsertLegacyWalletResult> => {
    const userAccount = await getUserAccount();
    if(!userAccount) {
      throw new Error('User account locked.');
    }
    const { network } = params;
    let privateKey: string;
    if('privateKeyEncrypted' in params) {
      throw new Error('Encrypted keyfile import is not supported for JEE wallets.');
    } else {
      privateKey = params.privateKey.trim();
    }
    const account = await JeeUtils.getAccountFromPrivateKey(privateKey);
    const encryptedPrivateKey = await encrypt(privateKey);
    const legacyAccountId = generateCryptoAccountId(CoinType.JEE, ChainType.MAINNET, account.address);
    const cryptoAccount: ExtendedCryptoAccount = {
      id: legacyAccountId,
      name: `${CoinType.JEE} Account ${account.address.slice(-4)}`,
      network,
      chain: ChainType.MAINNET,
      derivationPath: '',
      index: -1,
      address: account.address,
      privateKey: encryptedPrivateKey,
      publicKey: account.publicKey,
    };
    const walletId = account.address;
    const prev = userAccount.wallets.find(w => w.id === walletId);
    if(prev) {
      throw new Error('Wallet already exists.');
    }
    const legacyWalletCount = userAccount.wallets
      .filter(w => w.legacy)
      .filter(w => w.accounts.some(a => a.network === network && a.chain === ChainType.MAINNET))
      .length;
    const newWallet: ExtendedLegacyUserWallet = {
      id: walletId,
      name: `Legacy Wallet ${legacyWalletCount + 1}`,
      createdAt: dayjs.utc().toISOString(),
      legacy: true,
      language: userAccount.language,
      accounts: [
        {
          network,
          chain: ChainType.MAINNET,
          accounts: [
            cryptoAccount,
          ],
        },
        {
          network,
          chain: ChainType.TESTNET,
          accounts: [
            {
              ...cryptoAccount,
              id: generateCryptoAccountId(CoinType.JEE, ChainType.TESTNET, account.address),
              chain: ChainType.TESTNET,

            },
          ],
        },
      ],
    };
    userAccount.wallets.push(newWallet);
    await sessionManager.set(SessionStorageKey.USER_ACCOUNT, userAccount);
    await encryptSaveUserAccount(userAccount);
    await pinActiveAccount(legacyAccountId);
    Promise
      .all([
        updateBalances(),
        updateAccountTransactions(),
      ])
      .catch(err => {
        console.error(err);
      });
    return {result: sanitizeUserWallet(newWallet)};
  });

  messager.register(APIEvent.INSERT_CRYPTO_ACCOUNT, async ({ walletId, network, chain }: InsertCryptoAccountParams): Promise<InsertCryptoAccountResult> => {
    const userAccount = await getUserAccount();
    if(!userAccount) {
      throw new Error('User account locked.');
    }
    const walletIdx = userAccount.wallets.findIndex(w => w.id === walletId);
    if(walletIdx < 0) {
      throw new Error('Wallet not found.');
    }
    let walletAccountIdx = userAccount.wallets[walletIdx].accounts.findIndex(a => a.network === network && a.chain === chain);
    if(walletAccountIdx < 0) {
      const newLength = userAccount.wallets[walletIdx].accounts.push({
        network,
        chain,
        accounts: [],
      });
      walletAccountIdx = newLength - 1;
    }
    const lastDerivationIdx = userAccount.wallets[walletIdx].accounts[walletAccountIdx].accounts
      .reduce((num, a) => {
        return a.index > num ? a.index : num;
      }, -1);
    if('seed' in userAccount.wallets[walletIdx]) {
      // @ts-ignore
      const seed = await decrypt(userAccount.wallets[walletIdx].seed);
      if(!seed) {
        throw new Error('Wallet seed not found.');
      }
      const accountNode = JeeUtils.deriveFromSeed(seed, lastDerivationIdx + 1);
      const encryptedPrivateKey = await encrypt(accountNode.privateKey);
      const newCryptAccount: ExtendedCryptoAccount = {
        id: generateCryptoAccountId(network, chain, accountNode.address),
        name: `${network} Account ${accountNode.index + 1}`,
        network,
        chain,
        derivationPath: JeeUtils.chainMeta[chain].derivationPath,
        index: accountNode.index,
        address: accountNode.address,
        privateKey: encryptedPrivateKey,
        publicKey: accountNode.publicKey,
      };
      userAccount.wallets[walletIdx].accounts[walletAccountIdx].accounts.push(newCryptAccount);
      await sessionManager.set(SessionStorageKey.USER_ACCOUNT, userAccount);
      await encryptSaveUserAccount(userAccount);
      const activeAccount = await getActiveAccount();
      if (!activeAccount) {
        await pinActiveAccount(newCryptAccount.id);
      }
      return {result: sanitizeCryptoAccount(newCryptAccount)};
    } else {
      throw new Error('You cannot insert new accounts into legacy wallets.');
    }
  });

  const lockUserAccount = async (): Promise<void> => {
    await sessionManager.remove(SessionStorageKey.USER_ACCOUNT);
    await sessionSecretManager.remove(SessionStorageKey.USER_KEY);
    await sessionManager.remove(SessionStorageKey.ENCRYPTION_SETTINGS);
  };

  messager.register(APIEvent.LOCK_USER_ACCOUNT, async (): Promise<LockUserAccountResult> => {
    await lockUserAccount();
    return {result: true};
  });

  const rpcTries = 2;

  const jeeMultiSyncGetBalance = async (lcdEndpoint: string, address: string, inJeff = false): Promise<{ balance: string, ok: boolean }> => {
    for(let i = 0; i < rpcTries; i++) {
      try {
        const res = await JeeUtils.getBalance(lcdEndpoint, address);
        if(inJeff) {
          return { balance: res.toString(), ok: true };
        } else {
          return { balance: JeeUtils.fromBaseDenom(res).toString(), ok: true };
        }
      } catch(err) {
        // do nothing and let loop continue
      }
    }
    return { balance: '0', ok: false };
  };

  const updateBalances = async (): Promise<void> => {
    const userAccount = await getUserAccount();
    if(!userAccount) {
      return;
    }
    const balances: {[id: string]: string} = {};
    const cachedBalances = await loadBalanceLog();
    const prevBalances: {[id: string]: string} = await sessionManager.get(SessionStorageKey.BALANCES) || {};
    const persistUpdates: BalanceLogStore = {};
    const promises: Promise<void>[] = [];
    for(const wallet of userAccount.wallets) {
      for(const walletAccount of wallet.accounts) {
        for(const account of walletAccount.accounts) {
          promises.push((async () => {
            switch(account.network) {
              case CoinType.JEE: {
                const endpoint = await getLcdEndpoint(account.network, account.chain);
                if(!endpoint) {
                  balances[account.id] = prevBalances[account.id] || cachedBalances[account.id] || '0';
                } else {
                  const { balance, ok } = await jeeMultiSyncGetBalance(endpoint, account.address);
                  if(ok) {
                    balances[account.id] = balance;
                    persistUpdates[account.id] = balance;
                  } else {
                    balances[account.id] = prevBalances[account.id] || cachedBalances[account.id] || '0';
                  }
                }
                break;
              } default: {
                balances[account.id] = prevBalances[account.id] || cachedBalances[account.id] || '0';
              }
            }
          })());
        }
      }
    }
    await Promise.all(promises);
    if(Object.keys(persistUpdates).length) {
      await persistBalances(persistUpdates);
    }
    await sessionManager.set(SessionStorageKey.BALANCES, balances);
    const balanceChanged = Object.keys({...prevBalances, ...balances}).some((id) => balances[id] !== prevBalances[id]);
    if(balanceChanged) {
      updateAccountTransactions().catch(console.error);
    }
  };
  setInterval(updateBalances, 30000);

  messager.register(APIEvent.GET_ACCOUNT_BALANCES, async (params?: GetAccountBalancesParams): Promise<GetAccountBalancesResult> => {
    let balances = await sessionManager.get(SessionStorageKey.BALANCES);
    if(!balances || params?.forceUpdate) {
      await updateBalances();
      balances = await sessionManager.get(SessionStorageKey.BALANCES) || {};
    }
    return {result: await mergeWithCachedBalances(balances)};
  });

  const updateAccountTransactions = async (): Promise<void> => {
    const userAccount = await getUserAccount();
    if(!userAccount) {
      return;
    }
    const transactions: {[id: string]: AccountTransaction[]} = {};
    const cachedTxs = expandTxLog(await loadTxLog());
    const total = 10;
    const promises: Promise<void>[] = [];
    for(const wallet of userAccount.wallets) {
      for(const walletAccount of wallet.accounts) {
        for(const account of walletAccount.accounts) {
          promises.push((async () => {
            switch(account.network) {
              case CoinType.JEE: {
                const endpoint = await getLcdEndpoint(account.network, account.chain);
                const rpc = await getRpcEndpoint(account.network, account.chain);
                if(!endpoint) {
                  transactions[account.id] = cachedTxs[account.id] || [];
                } else {
                  try {
                    transactions[account.id] = await JeeUtils.getTransactions(endpoint, account.address, total, rpc);
                  } catch(err) {
                    transactions[account.id] = cachedTxs[account.id] || [];
                  }
                }
                break;
              } default: {
                transactions[account.id] = cachedTxs[account.id] || [];
              }
            }
          })());
        }
      }
    }
    await Promise.all(promises);
    await persistTransactions(transactions);
    const sorted = sortTransactionMap(transactions);
    await sessionManager.set(SessionStorageKey.TRANSACTIONS, sorted);
  };
  setInterval(updateAccountTransactions, 60000);

  messager.register(APIEvent.GET_ACCOUNT_TRANSACTIONS, async (params?: GetAccountTransactionsParams): Promise<GetAccountTransactionsResult> => {
    let transactions = await sessionManager.get(SessionStorageKey.TRANSACTIONS);
    if(!transactions || params?.forceUpdate) {
      await updateAccountTransactions();
      transactions = await sessionManager.get(SessionStorageKey.TRANSACTIONS) || {};
    }
    return {result: await mergeWithCachedTransactions(transactions)};
  });

  messager.register(APIEvent.SEND_TRANSACTION, async (params: SendTransactionParams): Promise<SendTransactionResult> => {
    const { accountId, amount, recipient, memo } = params;
    const userAccount = await getUserAccount();
    if(!userAccount) {
      throw new Error('User account locked.');
    }
    const cryptoAccount = findCryptoAccountInUserAccount(userAccount, accountId);
    if(!cryptoAccount) {
      throw new Error('Account not found.');
    }
    switch(cryptoAccount.network) {
      case CoinType.JEE: {
        const rpcEndpoint = await getRpcEndpoint(cryptoAccount.network, cryptoAccount.chain);
        if(!rpcEndpoint) {
          throw new Error(`${cryptoAccount.network} ${cryptoAccount.chain} RPC endpoint not found.`);
        } else if(!cryptoAccount.privateKey) {
          throw new Error('Private key not found.');
        }
        const privateKey = await decrypt(cryptoAccount.privateKey);
        const res = await JeeUtils.send(
          rpcEndpoint,
          privateKey,
          recipient,
          JeeUtils.toBaseDenom(amount),
          memo || '',
        );
        await appendLocalTx(accountId, {
          hash: res,
          received: false,
          amount: `${amount} JEE`,
          type: 'send',
          height: '0',
          index: Date.now(),
        });
        Promise.all([
          updateBalances(),
          updateAccountTransactions(),
        ]).catch(console.error);
        return {
          result: {
            txid: res,
          },
        };
      } default: {
        throw new Error('Unsupported network.');
      }
    }
  });

  messager.register(APIEvent.STAKE_NODE, async (params: StakeNodeParams): Promise<StakeNodeResult> => {
    const {
      accountId,
      operatorPublicKey = '',
      amount,
      chains,
      serviceURL,
    } = params;
    const userAccount = await getUserAccount();
    if(!userAccount) {
      throw new Error('User account locked.');
    }
    const cryptoAccount = findCryptoAccountInUserAccount(userAccount, accountId);
    if(!cryptoAccount) {
      throw new Error('Account not found.');
    }
    switch(cryptoAccount.network) {
      case CoinType.JEE: {
        throw new Error('Validator staking is not supported on JEE Chain.');
      } default: {
        throw new Error('Unsupported network.');
      }
    }
  });

  messager.register(ContentAPIEvent.STAKE_NODE, async (params: StakeNodeParams, sender): Promise<StakeNodeResult> => {
    const {
      accountId,
      operatorPublicKey = '',
      amount,
      chains,
      serviceURL,
    } = params;
    const userAccount = await unlockAndGetUserAccount();
    checkIfOriginAllowedAndThrow(userAccount, sender);
    const cryptoAccount = findCryptoAccountInUserAccountWithWalletId(userAccount, accountId);
    if(!cryptoAccount) {
      throw new Error('Account not found.');
    }
    const urlPath = RouteBuilder.stake.generateFullPath({
      walletId: cryptoAccount.walletId,
      networkId: cryptoAccount.network,
      chainId: cryptoAccount.chain,
      address: cryptoAccount.address,
    });
    const url = ext.runtime.getURL(`index.html#${urlPath}?amount=${encodeURIComponent(Number(amount) / 1000000)}&operator=${encodeURIComponent(operatorPublicKey)}${chains.length > 0 ? `&chains=${encodeURIComponent(chains.join(','))}` : ''}&serviceurl=${encodeURIComponent(serviceURL)}&content=true`);
    const popup = await createPopupWindow(url);
    let txid = '';
    const txidListener = (message: {type: string, payload: string}, sender: MessageSender) => {
      const { type, payload } = message;
      if(sender.tab?.windowId === popup.id && type === 'txid') {
        ext.runtime.onMessage.removeListener(txidListener);
        txid = payload;
      }
    };
    ext.runtime.onMessage.addListener(txidListener);
    await waitForWindowClose(popup);
    if(!txid) {
      ext.runtime.onMessage.removeListener(txidListener);
      throw new Error('Transaction cancelled.');
    }
    return {
      result: {
        txid,
      },
    };
  });

  messager.register(APIEvent.SIGN_MESSAGE, async (params: SignMessageParams): Promise<SignMessageResult> => {
    const { accountId, message } = params;
    const userAccount = await getUserAccount();
    if(!userAccount) {
      throw new Error('User account locked.');
    }
    const cryptoAccount = findCryptoAccountInUserAccount(userAccount, accountId);
    if(!cryptoAccount) {
      throw new Error('Account not found.');
    }
    switch(cryptoAccount.network) {
      case CoinType.JEE: {
        if(!cryptoAccount.privateKey) {
          throw new Error('Private key not found.');
        }
        const privateKey = await decrypt(cryptoAccount.privateKey);
        const signature = await JeeUtils.sign(message, privateKey);
        return {
          result: {
            signature,
          },
        };
      } default: {
        throw new Error('Unsupported network.');
      }
    }
  });

  messager.register(APIEvent.SAVE_ACTIVE_ACCOUNT, async (params: SaveActiveAccountParams): Promise<SaveActiveAccountResult> => {
    const { accountId } = params;
    const encrypted = await encrypt(accountId);
    await storageManager.set(LocalStorageKey.ACTIVE_ACCOUNT, encrypted);
    return {result: true};
  });

  const getActiveAccount = async (): Promise<string> => {
    const encrypted = await storageManager.get(LocalStorageKey.ACTIVE_ACCOUNT);
    if(!encrypted) {
      return '';
    }
    return await decrypt(encrypted);
  }

  messager.register(APIEvent.GET_ACTIVE_ACCOUNT, async (): Promise<GetActiveAccountResult> => {
    try {
      const result = await getActiveAccount();
      if(!result) {
        return {result: ''};
      }
      return {result};
    } catch(err) {
      return {result: ''};
    }
  });

  messager.register(APIEvent.EXPORT_PRIVATE_KEY, async (params: ExportPrivateKeyParams): Promise<ExportPrivateKeyResult> => {
    const { accountId } = params;
    const password = params.password.trim();
    if(!password) {
      throw new Error('Password is required.');
    }
    if(!(await verifyUserPassword(password))) {
      throw new Error('Invalid password.');
    }
    const userAccount = await getUserAccount();
    if(!userAccount) {
      throw new Error('User account locked.');
    }
    const cryptoAccount = findCryptoAccountInUserAccount(userAccount, accountId);
    if(!cryptoAccount) {
      throw new Error('Account not found.');
    }
    switch(cryptoAccount.network) {
      case CoinType.JEE: {
        if(!cryptoAccount.privateKey) {
          throw new Error('Private key not found.');
        }
        const privateKey = await decrypt(cryptoAccount.privateKey);
        return {
          result: privateKey,
        };
      } default: {
        throw new Error('Unsupported network.');
      }
    }
  });

  messager.register(APIEvent.EXPORT_KEYFILE, async (params: ExportKeyfileParams): Promise<ExportKeyfileResult> => {
    const { accountId } = params;
    const password = params.password.trim();
    if(!password) {
      throw new Error('Password is required.');
    }
    if(!(await verifyUserPassword(password))) {
      throw new Error('Invalid password.');
    }
    const userAccount = await getUserAccount();
    if(!userAccount) {
      throw new Error('User account locked.');
    }
    const cryptoAccount = findCryptoAccountInUserAccount(userAccount, accountId);
    if(!cryptoAccount) {
      throw new Error('Account not found.');
    }
    switch(cryptoAccount.network) {
      case CoinType.JEE: {
        if(!cryptoAccount.privateKey) {
          throw new Error('Private key not found.');
        }
        const privateKey = await decrypt(cryptoAccount.privateKey);
        return {
          result: JSON.stringify({
            address: cryptoAccount.address,
            privateKey,
            network: 'JEE',
          }),
        };
      } default: {
        throw new Error('Unsupported network.');
      }
    }
  });

  messager.register(APIEvent.EXPORT_MNEMONIC, async (params: ExportMnemonicParams): Promise<ExportMnemonicResult> => {
    const { walletId } = params;
    const password = params.password.trim();
    if(!password) {
      throw new Error('Password is required.');
    }
    if(!(await verifyUserPassword(password))) {
      throw new Error('Invalid password.');
    }
    const userAccount = await getUserAccount();
    if(!userAccount) {
      throw new Error('User account locked.');
    }
    const wallet = userAccount.wallets.find(w => w.id === walletId);
    if(!wallet) {
      throw new Error('Wallet not found.');
    }
    if(!('seed' in wallet)) {
      throw new Error('This wallet does not have a seed phrase.');
    }
    if(!wallet.mnemonic) {
      throw new Error('Seed phrase is not available for this wallet. It was created before seed phrase backup was supported.');
    }
    const mnemonic = await decrypt(wallet.mnemonic);
    return {
      result: mnemonic,
    };
  });

  messager.register(APIEvent.SAVE_FILE, async ({ filename, url }: SaveFileParams): Promise<void> => {
    await ext.downloads.download({
      saveAs: true,
      url,
      filename,
    });
  });

  messager.register(APIEvent.CONNECT_SITE, async ({ origin = '' }: ConnectSiteParams, sender): Promise<ConnectSiteResult> => {
    // Security: CONNECT_SITE must only be callable from the extension's own UI
    // (popup, side panel, options page).  Content scripts — and therefore web
    // pages — must NOT be able to silently self-authorize an origin by sending
    // this message directly to the background.
    const senderUrl = sender.url || '';
    const extensionOrigin = ext.runtime.getURL('').replace(/\/$/, '');
    if (!senderUrl.startsWith(extensionOrigin)) {
      throw new Error('Unauthorized: CONNECT_SITE can only be called from the extension UI.');
    }

    const userAccount = await getUserAccount();
    if(!userAccount) {
      throw new Error('User account locked.');
    }

    // Security: validate origin is a proper https:// or http://localhost URL
    // to prevent garbage or injected data from being stored.
    const trimmedOrigin = origin.trim().toLowerCase();
    if(!trimmedOrigin || !/^https?:\/\/[a-z0-9\-._~:/?#\[\]@!$&'()*+,;=%]+$/.test(trimmedOrigin)) {
      throw new Error('Invalid origin.');
    }

    const { allowedOrigins = [] } = userAccount;
    const found = allowedOrigins.some(o => o.origin === trimmedOrigin);
    if(found) { // origin has already been allowed
      return {
        result: true,
      };
    }

    // Security: cap the number of allowed origins to prevent storage DoS.
    const MAX_ALLOWED_ORIGINS = 200;
    if(allowedOrigins.length >= MAX_ALLOWED_ORIGINS) {
      throw new Error('Maximum number of connected sites reached. Disconnect some sites first.');
    }

    const host = getHostFromOrigin(trimmedOrigin).toLowerCase();
    const newOrigin: AllowedOrigin = {
      date: dayjs.utc().toISOString(),
      origin: trimmedOrigin,
      host,
    };
    if(userAccount.allowedOrigins) {
      userAccount.allowedOrigins.push(newOrigin);
    } else {
      userAccount.allowedOrigins = [newOrigin];
    }
    await sessionManager.set(SessionStorageKey.USER_ACCOUNT, userAccount);
    await encryptSaveUserAccount(userAccount);
    return {
      result: true,
    };
  });

  messager.register(APIEvent.DISCONNECT_SITE, async ({ origin = '' }: DisconnectSiteParams, sender): Promise<DisconnectSiteResult> => {
    // Security: only the extension's own UI can disconnect a site.
    const senderUrl = sender.url || '';
    const extensionOrigin = ext.runtime.getURL('').replace(/\/$/, '');
    if (!senderUrl.startsWith(extensionOrigin)) {
      throw new Error('Unauthorized: DISCONNECT_SITE can only be called from the extension UI.');
    }

    const userAccount = await getUserAccount();
    if(!userAccount) {
      throw new Error('User account locked.');
    }
    const trimmedOrigin = origin.trim().toLowerCase();
    const { allowedOrigins = [] } = userAccount;
    userAccount.allowedOrigins = allowedOrigins
      .filter(o => o.origin !== trimmedOrigin);
    await sessionManager.set(SessionStorageKey.USER_ACCOUNT, userAccount);
    await encryptSaveUserAccount(userAccount);
    return {
      result: true,
    };
  });

  messager.register(APIEvent.GET_ACTIVE_TAB_ORIGIN, async (): Promise<GetActiveTabOriginResult> => {
    const userAccount = await getUserAccount();
    if(!userAccount) {
      throw new Error('User account locked.');
    }
    const [ tab ] = await ext.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    const url = tab?.url || '';
    const originPatt = /^(https?:\/\/[^/?#]+)/;
    const matches = url
      .toLowerCase()
      .match(originPatt);
    return {
      result: matches ? matches[1] : '',
    };
  });

  messager.register(APIEvent.UPDATE_USER_SETTINGS, async (params: UpdateUserSettingsParams): Promise<UpdateUserSettingsResult> => {
    const userAccount = await getUserAccount();
    if(!userAccount) {
      throw new Error('User account locked.');
    }
    const newSettings: UserSettings = {
      ...userAccount.settings,
      ...params,
    };
    userAccount.settings = newSettings;
    await sessionManager.set(SessionStorageKey.USER_ACCOUNT, userAccount);
    await encryptSaveUserAccount(userAccount);
    await resetLockTimer();
    return {
      result: newSettings,
    };
  });

  messager.register(APIEvent.UPDATE_WALLET_NAME, async (params: UpdateWalletNameParams): Promise<UpdateWalletNameResult> => {
    const userAccount = await getUserAccount();
    if(!userAccount) {
      throw new Error('User account locked.');
    }
    const walletIdx = userAccount.wallets.findIndex(w => w.id === params.id);
    if(walletIdx < 0) {
      throw new Error(`Wallet ${params.id} not found.`);
    }
    userAccount.wallets[walletIdx].name = params.name;
    await sessionManager.set(SessionStorageKey.USER_ACCOUNT, userAccount);
    await encryptSaveUserAccount(userAccount);
    return {
      result: true,
    };
  });

  messager.register(APIEvent.UPDATE_ACCOUNT_NAME, async (params: UpdateAccountNameParams): Promise<UpdateAccountNameResult> => {
    const userAccount = await getUserAccount();
    if(!userAccount) {
      throw new Error('User account locked.');
    }
    for(let i = 0; i < userAccount.wallets.length; i++) {
      for(let j = 0; j < userAccount.wallets[i].accounts.length; j++) {
        for(let k = 0; k < userAccount.wallets[i].accounts[j].accounts.length; k++) {
          const account = userAccount.wallets[i].accounts[j].accounts[k];
          if(account.id === params.id) {
            account.name = params.name;
            await sessionManager.set(SessionStorageKey.USER_ACCOUNT, userAccount);
            await encryptSaveUserAccount(userAccount);
            return {
              result: true,
            };
          }
        }
      }
    }
    throw new Error(`Account ${params.id} not found.`);
  });

  messager.register(APIEvent.DELETE_WALLET, async (params: DeleteWalletParams): Promise<DeleteWalletResult> => {
    const userAccount = await getUserAccount();
    if(!userAccount) {
      throw new Error('User account locked.');
    }
    if (userAccount.wallets.length === 1) {
      throw new Error('Cannot delete only wallet.');
    }
    const { id } = params;
    const walletIdx = userAccount.wallets.findIndex(w => w.id === id);
    if(walletIdx < 0) {
      throw new Error(`Wallet ${id} not found.`);
    }
    userAccount.wallets = [
      ...userAccount.wallets.slice(0, walletIdx),
      ...userAccount.wallets.slice(walletIdx + 1),
    ];
    await sessionManager.set(SessionStorageKey.USER_ACCOUNT, userAccount);
    await encryptSaveUserAccount(userAccount);
    return {
      result: true,
    };
  });

  const createPopupWindow = async (url: string): Promise<chrome.windows.Window> => {
    const openWindowIds = await sessionManager.get(SessionStorageKey.OPEN_WINDOW_IDS) || [];
    for(const id of openWindowIds) {
      try {
        // close any previously opened NW windows
        await ext.windows.remove(id);
      } catch(err) {
        // do nothing
      }
    }
    const currentWindow = await ext.windows.getCurrent();
    // @ts-ignore
    const windowLeft = currentWindow.left + currentWindow.width - POPUP_WIDTH;
    // @ts-ignore
    const windowTop = currentWindow.top || 0;
    const openedWindow = await ext.windows.create({
      focused: true,
      url,
      width: POPUP_WIDTH,
      height: POPUP_HEIGHT + 35,
      type: 'popup',
      left: windowLeft,
      top: windowTop + 68,
    });
    await sessionManager.set(SessionStorageKey.OPEN_WINDOW_IDS, [openedWindow.id]);
    return openedWindow;
  };

  const waitForWindowClose = (window: chrome.windows.Window): Promise<void> => {
    return new Promise<void>(resolve => {
      const onRemovedCallback = (windowId: number): void => {
        if(windowId === window.id) {
          ext.windows.onRemoved.removeListener(onRemovedCallback);
          resolve();
        }
      };
      ext.windows.onRemoved.addListener(onRemovedCallback);
    });
  };

  const unlockAndGetUserAccount = async (): Promise<ExtendedUserAccount> => {
    let userAccount = await getUserAccount();
    if(userAccount) {
      return userAccount;
    }
    const urlPath = RouteBuilder.unlock.generateFullPath({});
    const url = ext.runtime.getURL(`index.html#${urlPath}?content=true`);
    const popup = await createPopupWindow(url);
    await waitForWindowClose(popup);
    userAccount = await getUserAccount();
    if(!userAccount) {
      throw new Error('User account locked.');
    }
    return userAccount;
  }

  const checkIfOriginAllowed = (userAccount: ExtendedUserAccount, sender: MessageSender): boolean => {
    const { origin = '' } = sender;
    if(!origin) {
      throw new Error('Invalid sender.');
    }
    const { allowedOrigins = [] } = userAccount;
    return allowedOrigins.some(o => o.origin === origin.toLowerCase());
  }

  const checkIfOriginAllowedAndThrow = (userAccount: ExtendedUserAccount, sender: MessageSender): void => {
    const allowed = checkIfOriginAllowed(userAccount, sender);
    if(!allowed) {
      throw new Error('Not allowed by user.');
    }
  }

  messager.register(ContentAPIEvent.REQUEST_ACCOUNT, async ({ network }: RequestAccountParams, sender): Promise<RequestAccountResult> => {
    let userAccount = await unlockAndGetUserAccount();
    const { origin = '', tab } = sender;
    if(!tab) {
      throw new Error('Invalid sender.');
    }

    let allowed = checkIfOriginAllowed(userAccount, sender);

    if(!allowed) {
      const { favIconUrl = '', title = '' } = tab;
      const urlPath = RouteBuilder.connect.generateFullPath({});
      const url = ext.runtime.getURL(`index.html#${urlPath}?content=true&favicon=${encodeURIComponent(favIconUrl)}&title=${encodeURIComponent(title)}&origin=${encodeURIComponent(origin.toLowerCase())}`);
      const popup = await createPopupWindow(url);
      await waitForWindowClose(popup);
      const updatedUserAccount = await getUserAccount();
      if(!updatedUserAccount) {
        throw new Error('Updated user account not found!');
      }
      userAccount = updatedUserAccount;
      checkIfOriginAllowedAndThrow(userAccount, sender);
    }

    let activeAccount = await getActiveAccount();
    if(!activeAccount) {
      const urlPath = RouteBuilder.selectAccount.generateFullPath({});
      const url = ext.runtime.getURL(`index.html#${urlPath}?content=true`);
      const popup = await createPopupWindow(url);
      await waitForWindowClose(popup);
      activeAccount = await getActiveAccount();
      if(!activeAccount) {
        throw new Error('No account selected.');
      }
    }

    const cryptoAccount = findCryptoAccountInUserAccount(userAccount, activeAccount);
    if(!cryptoAccount) {
      throw new Error('Account not found.');
    }
    return {
      result: sanitizeCryptoAccount(cryptoAccount),
    };
  });

  messager.register(ContentAPIEvent.GET_BALANCE, async ({ accountId }: GetBalanceParams, sender): Promise<GetBalanceResult> => {
    const userAccount = await unlockAndGetUserAccount();
    checkIfOriginAllowedAndThrow(userAccount, sender);
    const cryptoAccount = findCryptoAccountInUserAccount(userAccount, accountId);
    if(!cryptoAccount) {
      throw new Error('Account not found.');
    }
    let result: string;
    switch(cryptoAccount.network) {
      case CoinType.JEE: {
        const endpoint = await getLcdEndpoint(cryptoAccount.network, cryptoAccount.chain);
        if(!endpoint) {
          throw new Error(`No LCD endpoint found for ${cryptoAccount.network} ${cryptoAccount.chain}.`);
        } else {
          const { balance } = await jeeMultiSyncGetBalance(endpoint, cryptoAccount.address, true);
          result = balance;
        }
        return {
          result,
        };
      } default: {
        throw new Error('Unsupported network.');
      }
    }
  });

  // messager.register(ContentAPIEvent.RPC_GET_BALANCE, async ({ network, chain, address }: RpcGetBalanceParams, sender): Promise<RpcGetBalanceResult> => {
  //   const userAccount = await unlockAndGetUserAccount();
  //   checkIfOriginAllowedAndThrow(userAccount, sender);
  //   let result: string;
  //   switch(network) {
  //     case CoinType.POKT: {
  //       const endpoint = rpcEndpoints[network][chain];
  //       if(!endpoint) {
  //         throw new Error(`No RPC endpoint found for ${network} ${chain}.`);
  //       }
  //       const balance = await PoktUtils.getBalance(endpoint, address);
  //       return {
  //         result: balance.toString(),
  //       };
  //     } default: {
  //       throw new Error('Unsupported network.');
  //     }
  //   }
  // });

  async function jeeRpcRequestHandler(params: any): Promise<any> {
    const network = CoinType.JEE;
    const { chain } = params;
    const lcdEndpoint = await getLcdEndpoint(network, chain);
    if(!lcdEndpoint) {
      throw new Error(`No LCD endpoint found for ${network} ${chain}.`);
    }
    switch(params.method) {
      case 'getBalance': {
        const { address } = params.params;
        const balance = await JeeUtils.getBalance(lcdEndpoint, address);
        return {
          result: balance.toString(),
        };
      } case 'getTransaction': {
        const { hash } = params.params;
        const transaction = await JeeUtils.getTransaction(lcdEndpoint, hash);
        return {
          result: transaction,
        };
      } case 'getBlockNumber': {
        const blockNumber = await JeeUtils.getBlockHeight(lcdEndpoint);
        return {
          result: Number(blockNumber.toString()),
        };
      } case 'getAccount': {
        const { address } = params.params;
        const account = await CosmosUtils.getAccount(lcdEndpoint, 'JEE', address);
        return {
          result: account,
        };
      } default:
        throw new Error('Unsupported method.');
    }
  }

  messager.register(ContentAPIEvent.POKT_RPC_REQUEST, async (params: any, sender): Promise<any> => {
    const userAccount = await unlockAndGetUserAccount();
    checkIfOriginAllowedAndThrow(userAccount, sender);
    return await jeeRpcRequestHandler(params);
  });

  messager.register(ContentAPIEvent.GET_HEIGHT, async ({ network, chain }: GetHeightParams, sender): Promise<GetHeightResult> => {
    const userAccount = await unlockAndGetUserAccount();
    checkIfOriginAllowedAndThrow(userAccount, sender);
    let result: string;
    switch(network) {
      case CoinType.JEE: {
        const endpoint = await getLcdEndpoint(network, chain);
        if(!endpoint) {
          throw new Error(`No LCD endpoint found for ${network} ${chain}.`);
        } else {
          try {
            const res = await JeeUtils.getBlockHeight(endpoint);
            result = res.toString();
          } catch(err) {
            result = '0';
          }
        }
        return {
          result,
        };
      } default: {
        throw new Error('Unsupported network.');
      }
    }
  });

  messager.register(ContentAPIEvent.GET_TRANSACTION, async ({ txid, network, chain }: GetTransactionParams, sender): Promise<GetTransactionResult> => {
    const userAccount = await unlockAndGetUserAccount();
    checkIfOriginAllowedAndThrow(userAccount, sender);
    let result: string;
    switch(network) {
      case CoinType.JEE: {
        const endpoint = await getLcdEndpoint(network, chain);
        if(!endpoint) {
          throw new Error(`No LCD endpoint found for ${network} ${chain}.`);
        }
        return {
          result: await JeeUtils.getTransaction(endpoint, txid),
        };
      } default: {
        throw new Error('Unsupported network.');
      }
    }
  });

  messager.register(ContentAPIEvent.SEND_TRANSACTION, async ({ accountId, amount, recipient, memo }: SendTransactionParams, sender): Promise<SendTransactionResult> => {
    const userAccount = await unlockAndGetUserAccount();
    checkIfOriginAllowedAndThrow(userAccount, sender);
    const cryptoAccount = findCryptoAccountInUserAccountWithWalletId(userAccount, accountId);
    if(!cryptoAccount) {
      throw new Error('Account not found.');
    }
    const urlPath = RouteBuilder.send.generateFullPath({
      walletId: cryptoAccount.walletId,
      networkId: cryptoAccount.network,
      chainId: cryptoAccount.chain,
      address: cryptoAccount.address,
    });
    const url = ext.runtime.getURL(`index.html#${urlPath}?amount=${encodeURIComponent(Number(amount) / 1000000)}&recipient=${encodeURIComponent(recipient)}&memo=${encodeURIComponent(memo || '')}&content=true`);
    const popup = await createPopupWindow(url);
    let txid = '';
    const txidListener = (message: {type: string, payload: string}, sender: MessageSender) => {
      const { type, payload } = message;
      if(sender.tab?.windowId === popup.id && type === 'txid') {
        ext.runtime.onMessage.removeListener(txidListener);
        txid = payload;
      }
    };
    ext.runtime.onMessage.addListener(txidListener);
    await waitForWindowClose(popup);
    if(!txid) {
      ext.runtime.onMessage.removeListener(txidListener);
      throw new Error('Transaction cancelled.');
    }
    return {
      result: {
        txid,
      },
    };
  });


  messager.register(ContentAPIEvent.SIGN_MESSAGE, async ({ accountId, message }: SignMessageParams, sender): Promise<SignMessageResult> => {
    const userAccount = await unlockAndGetUserAccount();
    checkIfOriginAllowedAndThrow(userAccount, sender);
    const cryptoAccount = findCryptoAccountInUserAccountWithWalletId(userAccount, accountId);
    if(!cryptoAccount) {
      throw new Error('Account not found.');
    }
    const urlPath = RouteBuilder.sign.generateFullPath({
      walletId: cryptoAccount.walletId,
      networkId: cryptoAccount.network,
      chainId: cryptoAccount.chain,
      address: cryptoAccount.address,
    });
    const url = ext.runtime.getURL(`index.html#${urlPath}?message=${encodeURIComponent(message)}&content=true`);
    const popup = await createPopupWindow(url);
    let signature = '';
    const signatureListener = (message: {type: string, payload: string}, sender: MessageSender) => {
      const { type, payload } = message;
      if(sender.tab?.windowId === popup.id && type === 'signature') {
        ext.runtime.onMessage.removeListener(signatureListener);
        signature = payload;
      }
    };
    ext.runtime.onMessage.addListener(signatureListener);
    await waitForWindowClose(popup);
    if(!signature) {
      ext.runtime.onMessage.removeListener(signatureListener);
      throw new Error('Sign cancelled.');
    }
    return {
      result: {
        signature,
      },
    };
  });

  ext.runtime.onInstalled.addListener(async ({ reason }) => {
    const logger = getLogger();
    if(reason === 'install') {
      logger.info('Extension installed!');
      await openTosTab();
    }
  });

  ext.runtime.onMessage.addListener((message) => {
    if(message?.eventName) {
      return false;
    }
    resetLockTimer().catch(console.error);
    return false;
  });

  ext.alarms.onAlarm.addListener(async (alarm) => {
    switch(alarm.name) {
      case AlarmName.LOCK_USER_ACCOUNT: {
        await lockUserAccount();
        break;
      }
    }
  });

  if (ext.sidePanel) {
    ext.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch(console.error);
    ext.sidePanel.setOptions({ path: 'index.html?mode=sidepanel', enabled: true })
      .catch(console.error);
  }

};
