import { Secp256k1, ripemd160, sha256 } from '@cosmjs/crypto';
import { toBech32 } from '@cosmjs/encoding';
import { HDNodeWallet } from 'ethers';
import { Buffer } from 'buffer';
import { Account } from './key-utils/account';

export const hexToBytes = (hex: string): Uint8Array =>
  new Uint8Array(Buffer.from(hex.replace(/^0x/, ''), 'hex'));

export const utf8ToBytes = (text: string): Uint8Array =>
  new Uint8Array(Buffer.from(text, 'utf8'));

export const JEE_BECH32_PREFIX = 'jee';
export const JEE_CHAIN_ID = 'JEE';
export const JEE_DENOM = 'jeff';
export const JEE_DISPLAY_DENOM = 'JEE';
export const JEE_BIP44_COIN_TYPE = 118;
export const JEE_DECIMALS = 6;
export const JEE_BASE_MULTIPLIER = 1_000_000;

export const cosmosAddressFromPubkey = (pubkey: Uint8Array): string => {
  return toBech32(JEE_BECH32_PREFIX, ripemd160(sha256(pubkey)));
};

export const jeeDerivationPath = (index = 0): string => {
  return `m/44'/${JEE_BIP44_COIN_TYPE}'/0'/0/${index}`;
};

export const deriveJeeAccount = (seed: string, index = 0): Account => {
  const path = jeeDerivationPath(index);
  const node = HDNodeWallet.fromSeed(hexToBytes(seed)).derivePath(path);
  const privKeyHex = node.privateKey.slice(2);
  const pubKeyBytes = hexToBytes(node.publicKey.slice(2));
  const pubKeyCompressed = Secp256k1.compressPubkey(pubKeyBytes);
  return {
    address: cosmosAddressFromPubkey(pubKeyCompressed),
    privateKey: privKeyHex,
    publicKey: Buffer.from(pubKeyCompressed).toString('hex'),
    index,
  };
};

export const accountFromPrivateKey = async (privateKey: string): Promise<Account> => {
  const prepped = privateKey.replace(/^0x/, '').trim();
  if (prepped.length !== 64 || !/^[0-9a-f]+$/i.test(prepped)) {
    throw new Error('Invalid private key');
  }
  const keypair = await Secp256k1.makeKeypair(hexToBytes(prepped));
  const pubKeyCompressed = Secp256k1.compressPubkey(keypair.pubkey);
  return {
    address: cosmosAddressFromPubkey(pubKeyCompressed),
    privateKey: prepped,
    publicKey: Buffer.from(pubKeyCompressed).toString('hex'),
    index: 0,
  };
};
