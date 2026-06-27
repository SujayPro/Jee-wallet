import {
  APIEvent,
  ClientAPI,
  ConnectSiteParams,
  ConnectSiteResult, DeleteWalletParams, DeleteWalletResult,
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
  GetUserAccountResult,
  GetUserStatusResult,
  GetVersionResult,
  InsertCryptoAccountParams,
  InsertCryptoAccountResult,
  InsertHdWalletParams,
  InsertHdWalletResult,
  InsertLegacyWalletParams,
  InsertLegacyWalletResult,
  LockUserAccountResult,
  RegisterUserParams,
  RegisterUserResult,
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
  ValidateMnemonicParams,
  ValidateMnemonicResult,
} from '@jeewallet/types';
import { ext, Messager } from '@jeewallet/util-browser';

export class API implements ClientAPI {

  _messager: Messager;

  constructor(messager: Messager) {
    this._messager = messager;
  }

  private async request<T>(event: APIEvent, body?: unknown): Promise<T> {
    const res = await this._messager.send(event, body);
    if (res == null || typeof res !== 'object') {
      return {
        error: {
          message: 'Extension background did not respond. Reload the extension and try again.',
          stack: '',
        },
      } as T;
    }
    return res as T;
  }

  async startOnboarding(): Promise<StartOnboardingResult> {
    return await this.request(APIEvent.START_ONBOARDING);
  }

  async startNewWallet(): Promise<StartNewWalletResult> {
    return await this.request(APIEvent.START_NEW_WALLET);
  }

  async getUserStatus(): Promise<GetUserStatusResult> {
    return await this.request(APIEvent.GET_USER_STATUS);
  }

  async registerUser(params: RegisterUserParams): Promise<RegisterUserResult> {
    return await this.request(APIEvent.REGISTER_USER, params);
  }

  async unlockUserAccount(params: UnlockUserAccountParams): Promise<UnlockUserAccountResult> {
    return await this.request(APIEvent.UNLOCK_USER_ACCOUNT, params);
  }

  async getUserAccount(): Promise<GetUserAccountResult> {
    return await this.request(APIEvent.GET_USER_ACCOUNT);
  }

  async generateMnemonic(): Promise<GenerateMnemonicResult> {
    return await this.request(APIEvent.GENERATE_MNEMONIC);
  }

  async validateMnemonic(params: ValidateMnemonicParams): Promise<ValidateMnemonicResult> {
    return await this.request(APIEvent.VALIDATE_MNEMONIC, params);
  }

  async insertHdWallet(params: InsertHdWalletParams): Promise<InsertHdWalletResult> {
    return await this.request(APIEvent.INSERT_HD_WALLET, params);
  }

  async insertLegacyWallet(params: InsertLegacyWalletParams): Promise<InsertLegacyWalletResult> {
    return await this.request(APIEvent.INSERT_LEGACY_WALLET, params);
  }

  async insertCryptoAccount(params: InsertCryptoAccountParams): Promise<InsertCryptoAccountResult> {
    return await this.request(APIEvent.INSERT_CRYPTO_ACCOUNT, params);
  }

  async lockUserAccount(): Promise<LockUserAccountResult> {
    return await this.request(APIEvent.LOCK_USER_ACCOUNT);
  }

  async getAccountBalances(params?: GetAccountBalancesParams): Promise<GetAccountBalancesResult> {
    return await this.request(APIEvent.GET_ACCOUNT_BALANCES, params || {});
  }

  async getAccountTransactions(params?: GetAccountTransactionsParams): Promise<GetAccountTransactionsResult> {
    return await this.request(APIEvent.GET_ACCOUNT_TRANSACTIONS, params || {});
  }

  async sendTransaction(params: SendTransactionParams): Promise<SendTransactionResult> {
    return await this.request(APIEvent.SEND_TRANSACTION, params);
  }

  async stakeNode(params: StakeNodeParams): Promise<StakeNodeResult> {
    return await this.request(APIEvent.STAKE_NODE, params);
  }

  async signMessage(params: SignMessageParams): Promise<SignMessageResult> {
    return await this.request(APIEvent.SIGN_MESSAGE, params);
  }

  async saveActiveAccount(params: SaveActiveAccountParams): Promise<SaveActiveAccountResult> {
    return await this.request(APIEvent.SAVE_ACTIVE_ACCOUNT, params);
  }

  async getActiveAccount(): Promise<GetActiveAccountResult> {
    return await this.request(APIEvent.GET_ACTIVE_ACCOUNT);
  }

  async exportPrivateKey(params: ExportPrivateKeyParams): Promise<ExportPrivateKeyResult> {
    return await this.request(APIEvent.EXPORT_PRIVATE_KEY, params);
  }

  async exportKeyfile(params: ExportKeyfileParams): Promise<ExportKeyfileResult> {
    return await this.request(APIEvent.EXPORT_KEYFILE, params);
  }

  async exportMnemonic(params: ExportMnemonicParams): Promise<ExportMnemonicResult> {
    return await this.request(APIEvent.EXPORT_MNEMONIC, params);
  }

  async saveFile(params: SaveFileParams): Promise<void> {
    return await this.request(APIEvent.SAVE_FILE, params);
  }

  async connectSite(params: ConnectSiteParams): Promise<ConnectSiteResult> {
    return await this.request(APIEvent.CONNECT_SITE, params);
  }

  async disconnectSite(params: DisconnectSiteParams): Promise<DisconnectSiteResult> {
    return await this.request(APIEvent.DISCONNECT_SITE, params);
  }

  async getActiveTabOrigin(): Promise<GetActiveTabOriginResult> {
    return await this.request(APIEvent.GET_ACTIVE_TAB_ORIGIN);
  }

  async getVersion(): Promise<GetVersionResult> {
    try {
      const manifest = ext.runtime.getManifest();
      return {
        result: manifest.version,
      };
    } catch(err: any) {
      return {
        error: {
          message: err.message,
          stack: err.stack,
        },
      };
    }
  }

  async updateUserSettings(params: UpdateUserSettingsParams): Promise<UpdateUserSettingsResult> {
    return await this.request(APIEvent.UPDATE_USER_SETTINGS, params);
  }

  async updateWalletName(params: UpdateWalletNameParams): Promise<UpdateWalletNameResult> {
    return await this.request(APIEvent.UPDATE_WALLET_NAME, params);
  }

  async updateAccountName(params: UpdateAccountNameParams): Promise<UpdateAccountNameResult> {
    return await this.request(APIEvent.UPDATE_ACCOUNT_NAME, params);
  }

  async deleteWallet(params: DeleteWalletParams): Promise<DeleteWalletResult> {
    return await this.request(APIEvent.DELETE_WALLET, params);
  }

  async ping(): Promise<{ result: true } | { error: { message: string, stack: string } }> {
    return await this.request(APIEvent.PING);
  }

}
