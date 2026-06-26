import { BigNumber, bignumber } from 'mathjs';
import isString from 'lodash/isString';
import { Secp256k1, sha256 } from '@cosmjs/crypto';
import { SigningStargateClient, GasPrice } from '@cosmjs/stargate';
import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import { Buffer } from 'buffer';
import { ChainMeta } from '../interfaces';
import { ChainType, CoinType, KeyType } from '@jeewallet/constants';
import { AccountTransaction, sortAccountTransactions } from '@jeewallet/types';
import { CosmosUtils } from '../protocol-utils/cosmos-utils';
import {
  accountFromPrivateKey,
  deriveJeeAccount,
  hexToBytes,
  utf8ToBytes,
  JEE_BECH32_PREFIX,
  JEE_CHAIN_ID,
  JEE_DENOM,
  JEE_BASE_MULTIPLIER,
  JEE_BIP44_COIN_TYPE,
} from '../cosmos-account';

export const JEE_LCD_MAINNET = 'https://api.jee.money';
export const JEE_RPC_MAINNET = 'https://rpc.jee.money';

export enum JeeDenom {
  JEE = 'JEE',
  JEFF = 'jeff',
}

interface CosmosMsg {
  '@type'?: string;
  from_address?: string;
  to_address?: string;
  amount?: Array<{ denom?: string; amount?: string }>;
}

interface LcdTxResponse {
  txhash?: string;
  height?: string;
  timestamp?: string;
  tx?: {
    body?: {
      messages?: CosmosMsg[];
    };
  };
}

export class JeeUtils {

  static network: CoinType = CoinType.JEE;

  static denom = JeeDenom.JEE;
  static baseDenom = JeeDenom.JEFF;
  static baseFee = bignumber('0');
  static baseMultiplier = bignumber(String(JEE_BASE_MULTIPLIER));

  static chain = {
    MAINNET: ChainType.MAINNET,
    TESTNET: ChainType.TESTNET,
  };

  static chainMeta: {[chainType: string]: ChainMeta} = {
    [ChainType.MAINNET]: {
      chain: ChainType.MAINNET,
      bip44Type: JEE_BIP44_COIN_TYPE,
      derivationPath: `m/44'/${JEE_BIP44_COIN_TYPE}'/0'/0`,
      keyType: KeyType.SECP256K1,
    },
    [ChainType.TESTNET]: {
      chain: ChainType.TESTNET,
      bip44Type: JEE_BIP44_COIN_TYPE,
      derivationPath: `m/44'/${JEE_BIP44_COIN_TYPE}'/0'/0`,
      keyType: KeyType.SECP256K1,
    },
  };

  static toBaseDenom(value: string|BigNumber): BigNumber {
    const bn = isString(value) ? bignumber(value) : value;
    return bn.mul(JeeUtils.baseMultiplier);
  }

  static fromBaseDenom(value: string|BigNumber): BigNumber {
    const bn = isString(value) ? bignumber(value) : value;
    return bn.div(JeeUtils.baseMultiplier);
  }

  static async getBlockHeight(lcdEndpoint: string): Promise<BigNumber> {
    return CosmosUtils.getBlockHeight(lcdEndpoint, JEE_CHAIN_ID);
  }

  static async getBalance(lcdEndpoint: string, address: string): Promise<BigNumber> {
    try {
      const res = await fetch(`${lcdEndpoint}/cosmos/bank/v1beta1/balances/${address}`);
      if (!res.ok) {
        return bignumber(0);
      }
      const body = await res.json();
      const balance = body.balances?.find((b: {denom: string}) => b.denom === JEE_DENOM);
      return bignumber(balance?.amount || '0');
    } catch {
      return bignumber(0);
    }
  }

  static async send(
    rpcEndpoint: string,
    privateKey: string,
    recipientAddress: string,
    amountJeff: string|BigNumber,
    memo = '',
  ): Promise<string> {
    const amountStr = isString(amountJeff) ? amountJeff : amountJeff.toString();
    const wallet = await DirectSecp256k1Wallet.fromKey(
      hexToBytes(privateKey),
      JEE_BECH32_PREFIX,
    );
    const client = await SigningStargateClient.connectWithSigner(rpcEndpoint, wallet, {
      gasPrice: GasPrice.fromString(`0${JEE_DENOM}`),
    });
    const [account] = await wallet.getAccounts();
    const result = await client.sendTokens(
      account.address,
      recipientAddress,
      [{ denom: JEE_DENOM, amount: amountStr }],
      'auto',
      memo,
    );
    return result.transactionHash;
  }

  static async sign(message: string, privateKey: string): Promise<string> {
    const key = hexToBytes(privateKey);
    const messageHash = sha256(utf8ToBytes(message));
    const signature = await Secp256k1.createSignature(messageHash, key);
    return Buffer.from(signature.toFixedLength()).toString('hex');
  }

  static async getAccountFromPrivateKey(privateKey: string): Promise<{address: string, privateKey: string, publicKey: string}> {
    const account = await accountFromPrivateKey(privateKey);
    return {
      address: account.address,
      privateKey: account.privateKey,
      publicKey: account.publicKey,
    };
  }

  static deriveFromSeed(seed: string, index: number) {
    return deriveJeeAccount(seed, index);
  }

  static async getTransactions(
    lcdEndpoint: string,
    address: string,
    total = 10,
    rpcEndpoint = JEE_RPC_MAINNET,
  ): Promise<AccountTransaction[]> {
    const seen = new Set<string>();
    const txs: AccountTransaction[] = [];

    const addTx = (tx: LcdTxResponse, hintReceived?: boolean) => {
      const hash = tx.txhash?.toUpperCase();
      if (!hash || seen.has(hash)) {
        return;
      }
      seen.add(hash);
      const transfer = JeeUtils.parseMsgSend(tx.tx?.body?.messages);
      const received = hintReceived ?? transfer.to.toLowerCase() === address.toLowerCase();
      const timestamp = tx.timestamp || '';
      const parsedTime = timestamp ? Date.parse(timestamp) : NaN;
      const heightNum = Number(tx.height || 0);
      const index = !Number.isNaN(parsedTime)
        ? parsedTime
        : (heightNum > 0 && heightNum < 1_000_000_000 ? heightNum * 1_000_000 : 0);
      txs.push({
        hash,
        height: String(tx.height || '0'),
        time: timestamp,
        received,
        amount: JeeUtils.formatDisplayAmount(transfer.amount),
        type: 'MsgSend',
        index,
      });
    };

    const searchLcd = async (event: string, received?: boolean) => {
      const url = `${lcdEndpoint}/cosmos/tx/v1beta1/txs?events=${encodeURIComponent(event)}&pagination.limit=${total}&order_by=ORDER_BY_DESC`;
      const res = await fetch(url);
      if (!res.ok) {
        return;
      }
      const body = await res.json();
      for (const tx of body.tx_responses || []) {
        addTx(tx, received);
      }
    };

    const searchRpc = async (query: string, received?: boolean) => {
      if (!rpcEndpoint) {
        return;
      }
      const url = `${rpcEndpoint}/tx_search?query="${encodeURIComponent(query)}"&per_page=${total}&order_by="desc"`;
      const res = await fetch(url);
      if (!res.ok) {
        return;
      }
      const body = await res.json();
      for (const item of body.result?.txs || []) {
        const hash = item.hash?.replace(/^0x/i, '').toUpperCase();
        if (!hash || seen.has(hash)) {
          continue;
        }
        try {
          const lcdRes = await fetch(`${lcdEndpoint}/cosmos/tx/v1beta1/txs/${hash}`);
          if (lcdRes.ok) {
            const lcdBody = await lcdRes.json();
            if (lcdBody.tx_response) {
              addTx(lcdBody.tx_response, received);
            }
          }
        } catch {
          addTx({
            txhash: hash,
            height: item.height,
          }, received);
        }
      }
    };

    await Promise.all([
      searchLcd(`transfer.recipient='${address}'`, true),
      searchLcd(`transfer.sender='${address}'`, false),
      searchLcd(`message.sender='${address}'`, false),
    ]);

    if (txs.length === 0) {
      await Promise.all([
        searchRpc(`transfer.recipient='${address}'`, true),
        searchRpc(`transfer.sender='${address}'`, false),
        searchRpc(`message.sender='${address}'`, false),
      ]);
    }

    return sortAccountTransactions(txs).slice(0, total);
  }

  private static parseMsgSend(messages?: CosmosMsg[]): { from: string; to: string; amount: string } {
    for (const msg of messages || []) {
      const type = msg['@type'] || '';
      if (!type.includes('MsgSend')) {
        continue;
      }
      const coin = msg.amount?.find((entry) => entry.denom === JEE_DENOM) ?? msg.amount?.[0];
      return {
        from: msg.from_address || '',
        to: msg.to_address || '',
        amount: coin?.amount || '0',
      };
    }
    return { from: '', to: '', amount: '0' };
  }

  private static formatDisplayAmount(baseAmount: string): string {
    const display = JeeUtils.fromBaseDenom(baseAmount);
    if (display.isZero()) {
      return '';
    }
    const text = display.toFixed(6).replace(/\.?0+$/, '');
    return `${text} JEE`;
  }

  static async getTransaction(lcdEndpoint: string, hash: string) {
    return CosmosUtils.getTransaction(lcdEndpoint, JEE_CHAIN_ID, hash);
  }

}
