import _argon2 from 'argon2-browser';
import { pbkdf2 as _pbkdf2 } from '@ethersproject/pbkdf2';
import { toUtf8Bytes } from '@ethersproject/strings';
import crypto from 'crypto';

export const defaultSeedBits = 256;

export enum HashFunction {
  ARGON2 = 'argon2',
  PBKDF2 = 'pbkdf2',
}

export interface PBKDF2Config {
  algorithm: HashFunction;
  iterations: number;
  hashAlgorithm: string;
}
export const defaultPBKDF2Config: PBKDF2Config = {
  algorithm: HashFunction.PBKDF2,
  iterations: 60000,
  hashAlgorithm: 'sha512',
};

export enum EncryptionAlgorithm {
  AES_256_GCM = 'aes-256-gcm',
}
export interface AES256GCMConfig {
  algorithm: EncryptionAlgorithm.AES_256_GCM;
  keyLength: number; // bytes
  ivLength: number;  // bytes
}
export const defaultAES256GCMConfig: AES256GCMConfig = {
  algorithm: EncryptionAlgorithm.AES_256_GCM,
  keyLength: 32, // bytes
  ivLength: 12,  // bytes
}

export interface Argon2Config {
  algorithm: HashFunction.ARGON2;
  time: number;
  mem: number;
  parallelism: number;
  type: _argon2.ArgonType;
}
export const defaultArgon2Config: Argon2Config = {
  algorithm: HashFunction.ARGON2,
  time: 3,             // iterations
  mem: 64 * 1024,      // memory in KiB
  parallelism: 4,
  type: _argon2.ArgonType.Argon2id, // Argon2d, Argon2i, Argon2id
};

export const argon2 = async (password: string, salt: string, hashLength: number, config: Argon2Config = defaultArgon2Config): Promise<string> => {
  const { hashHex } = await _argon2.hash({
    pass: password,
    salt,
    hashLen: hashLength,  // hash length in bytes
    time: config.time,    // iterations
    mem: config.mem,      // memory in KiB
    parallelism: config.parallelism,
    type: config.type,    // Argon2d, Argon2i, Argon2id
  });
  return hashHex;
};

export const pbkdf2 = async (password: string, salt: string, hashLength: number, config: PBKDF2Config = defaultPBKDF2Config): Promise<string> => {
  // Prefer the native Web Crypto implementation. It is available on
  // `globalThis.crypto` in browsers, extension service workers, and modern Node,
  // and is orders of magnitude faster than the pure-JS fallback below (the same
  // 60k-iteration derivation drops from several seconds to tens of milliseconds).
  // The bundled `crypto` polyfill (crypto-browserify) has no `.subtle`, which is
  // why the slow fallback was being used. Output is byte-identical, so existing
  // encrypted accounts still decrypt.
  const globalCrypto: any =
    (typeof globalThis !== 'undefined' && (globalThis as any).crypto) ||
    (typeof crypto !== 'undefined' ? crypto : undefined);
  const subtle = globalCrypto?.subtle;
  if (subtle) {
    try {
      const enc = new TextEncoder();
      const hashName = config.hashAlgorithm === 'sha512' ? 'SHA-512' : 'SHA-256';
      const keyMaterial = await subtle.importKey(
        'raw',
        enc.encode(password),
        'PBKDF2',
        false,
        ['deriveBits'],
      );
      const bits = await subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: enc.encode(salt),
          iterations: config.iterations,
          hash: hashName,
        },
        keyMaterial,
        hashLength * 8,
      );
      return Buffer.from(bits).toString('hex');
    } catch {
      // fall back to pure JS implementation
    }
  }
  return _pbkdf2(
    toUtf8Bytes(password),
    toUtf8Bytes(salt),
    config.iterations,
    hashLength,
    config.hashAlgorithm,
  ).slice(2);
};

export const deriveKey = async (
  password: string,
  salt: string,
  hashLength: number,
  config: PBKDF2Config | Argon2Config,
): Promise<string> => {
  if (config.algorithm === HashFunction.PBKDF2) {
    return pbkdf2(password, salt, hashLength, config);
  }
  return argon2(password, salt, hashLength, config as Argon2Config);
};

/**
 * Generate a random hex string of the given size
 * @param size The size of the string in bytes
 */
export const generateRandom = async (size: number): Promise<string> => {
  return crypto.randomBytes(size).toString('hex');
};

/**
 * Generate a random hex-encoded salt
 * @param size The size of the salt in bytes
 */
export const generateSalt = async (size: number): Promise<string> => {
  return generateRandom(size);
};

export interface EncryptionResult {
  algorithm: EncryptionAlgorithm.AES_256_GCM
  ciphertext: string
  iv: string
  tag: string
}

export const encryptAES256GCM = async (data: any, key: string, config: AES256GCMConfig = defaultAES256GCMConfig): Promise<EncryptionResult> => {
  const { algorithm } = config;
  const plaintext = JSON.stringify(data);
  const iv = await generateRandom(config.ivLength);
  const cipher = crypto.createCipheriv(
    algorithm,
    Buffer.from(key, 'hex'),
    Buffer.from(iv, 'hex'),
  );
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return {
    algorithm,
    ciphertext: encrypted,
    iv,
    tag,
  };
};

export const decrypt = async (data: EncryptionResult, key: string): Promise<any> => {
  const { ciphertext, iv , tag} = data;
  const decipher = crypto.createDecipheriv(
    data.algorithm,
    Buffer.from(key, 'hex'),
    Buffer.from(iv, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
};
