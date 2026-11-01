import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const SCHEMA_VERSION = 1;
const ALGORITHM = "A256GCM";
const DEFAULT_MAX_CREDENTIAL_BYTES = 64 * 1024;

export class CredentialVaultError extends Error {
  constructor(code) {
    super(code);
    this.name = "CredentialVaultError";
    this.code = code;
  }
}

function fail(code) {
  return new CredentialVaultError(code);
}

function requireIdentifier(value) {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= 128 &&
    value.trim() === value &&
    !/[\u0000-\u0020\u007F]/.test(value);
}

function requireTenantId(value) {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= 256 &&
    value.trim() === value &&
    !/[\u0000-\u001F\u007F]/.test(value);
}

function validateKey(key) {
  if (!(Buffer.isBuffer(key) || key instanceof Uint8Array) || key.byteLength !== 32) {
    throw fail("CREDENTIAL_KEY_UNAVAILABLE");
  }
  return Buffer.from(key);
}

function associatedData(credentialId, tenantId, keyId, version) {
  return Buffer.from(JSON.stringify([
    "meepsheep-credential",
    SCHEMA_VERSION,
    tenantId,
    credentialId,
    keyId,
    version
  ]), "utf8");
}

function serializeSecret(secret, maxBytes) {
  if (secret === undefined || secret === null) throw fail("CREDENTIAL_INVALID");
  let serialized;
  try {
    serialized = JSON.stringify(secret);
  } catch {
    throw fail("CREDENTIAL_INVALID");
  }
  if (typeof serialized !== "string") throw fail("CREDENTIAL_INVALID");
  const plaintext = Buffer.from(serialized, "utf8");
  if (plaintext.byteLength > maxBytes) {
    plaintext.fill(0);
    throw fail("CREDENTIAL_TOO_LARGE");
  }
  return plaintext;
}

function encrypt(plaintext, { key, keyId, credentialId, tenantId, version, createdAt, updatedAt }) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(associatedData(credentialId, tenantId, keyId, version));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const encodedCiphertext = ciphertext.toString("base64");
  ciphertext.fill(0);

  return {
    schemaVersion: SCHEMA_VERSION,
    algorithm: ALGORITHM,
    credentialId,
    tenantId,
    keyId,
    version,
    status: "active",
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: encodedCiphertext,
    createdAt,
    updatedAt
  };
}

function decodeBase64(value, expectedLength, maximumLength) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    (maximumLength !== undefined && value.length > maximumLength)
  ) throw fail("CREDENTIAL_CORRUPT");
  const buffer = Buffer.from(value, "base64");
  if (buffer.toString("base64") !== value || (expectedLength !== undefined && buffer.length !== expectedLength)) {
    buffer.fill(0);
    throw fail("CREDENTIAL_CORRUPT");
  }
  return buffer;
}

function validateRecordEnvelope(record, credentialId, tenantId) {
  if (
    !record ||
    record.schemaVersion !== SCHEMA_VERSION ||
    record.algorithm !== ALGORITHM ||
    record.credentialId !== credentialId ||
    record.tenantId !== tenantId ||
    !requireIdentifier(record.keyId) ||
    !Number.isSafeInteger(record.version) ||
    record.version < 1
  ) {
    throw fail("CREDENTIAL_CORRUPT");
  }
  if (record.status !== "active" && record.status !== "revoked") throw fail("CREDENTIAL_CORRUPT");
  return record;
}

function validateActiveRecord(record, credentialId, tenantId) {
  validateRecordEnvelope(record, credentialId, tenantId);
  if (record.status === "revoked") throw fail("CREDENTIAL_REVOKED");
  return record;
}

function safeMetadata(record) {
  return {
    credentialId: record.credentialId,
    tenantId: record.tenantId,
    status: record.status,
    keyId: record.keyId,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export function createCredentialVault({
  store,
  keyProvider,
  clock = () => Date.now(),
  maxCredentialBytes = DEFAULT_MAX_CREDENTIAL_BYTES
} = {}) {
  if (
    !store ||
    typeof store.insert !== "function" ||
    typeof store.get !== "function" ||
    typeof store.compareAndSwap !== "function"
  ) {
    throw new TypeError("Credential store must implement insert, get, and compareAndSwap.");
  }
  if (
    !keyProvider ||
    typeof keyProvider.getCurrentKey !== "function" ||
    typeof keyProvider.getKey !== "function"
  ) {
    throw new TypeError("Key provider must implement getCurrentKey and getKey.");
  }
  if (typeof clock !== "function") throw new TypeError("clock must be a function.");
  if (!Number.isSafeInteger(maxCredentialBytes) || maxCredentialBytes < 1) {
    throw new TypeError("maxCredentialBytes must be a positive safe integer.");
  }

  function now() {
    const value = clock();
    if (!Number.isFinite(value) || value < 0) throw fail("CREDENTIAL_INVALID");
    return Math.floor(value);
  }

  async function currentKey() {
    let material;
    try {
      material = await keyProvider.getCurrentKey();
    } catch {
      throw fail("CREDENTIAL_KEY_UNAVAILABLE");
    }
    if (!material || !requireIdentifier(material.keyId)) {
      throw fail("CREDENTIAL_KEY_UNAVAILABLE");
    }
    return { keyId: material.keyId, key: validateKey(material.key) };
  }

  async function keyById(keyId) {
    let material;
    try {
      material = await keyProvider.getKey(keyId);
    } catch {
      throw fail("CREDENTIAL_KEY_UNAVAILABLE");
    }
    return validateKey(material);
  }

  async function readRecord(credentialId, tenantId) {
    let record;
    try {
      record = await store.get(credentialId);
    } catch {
      throw fail("CREDENTIAL_STORE_UNAVAILABLE");
    }
    if (!record || record.tenantId !== tenantId) throw fail("CREDENTIAL_NOT_FOUND");
    validateRecordEnvelope(record, credentialId, tenantId);
    return record;
  }

  async function decryptRecord(record, credentialId, tenantId) {
    validateActiveRecord(record, credentialId, tenantId);
    if (typeof record.ciphertext !== "string" || record.ciphertext.length > Math.ceil(maxCredentialBytes / 3) * 4) {
      throw fail("CREDENTIAL_CORRUPT");
    }
    const key = await keyById(record.keyId);
    let iv;
    let authTag;
    let ciphertext;
    try {
      iv = decodeBase64(record.iv, 12, 16);
      authTag = decodeBase64(record.authTag, 16, 24);
      ciphertext = decodeBase64(record.ciphertext, undefined, Math.ceil(maxCredentialBytes / 3) * 4);
      const decipher = createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAAD(associatedData(credentialId, tenantId, record.keyId, record.version));
      decipher.setAuthTag(authTag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    } catch (error) {
      if (error instanceof CredentialVaultError) throw error;
      throw fail("CREDENTIAL_CORRUPT");
    } finally {
      key.fill(0);
      iv?.fill(0);
      authTag?.fill(0);
      ciphertext?.fill(0);
    }
  }

  async function persistReplacement(credentialId, version, replacement) {
    let replaced;
    try {
      replaced = await store.compareAndSwap(credentialId, version, replacement);
    } catch {
      throw fail("CREDENTIAL_STORE_UNAVAILABLE");
    }
    if (replaced !== true) throw fail("CREDENTIAL_CONFLICT");
  }

  async function put({ credentialId, tenantId, secret } = {}) {
    if (!requireIdentifier(credentialId) || !requireTenantId(tenantId)) {
      throw fail("CREDENTIAL_INVALID");
    }
    const plaintext = serializeSecret(secret, maxCredentialBytes);
    try {
      const material = await currentKey();
      const timestamp = now();
      let record;
      try {
        record = encrypt(plaintext, {
          ...material,
          credentialId,
          tenantId,
          version: 1,
          createdAt: timestamp,
          updatedAt: timestamp
        });
      } finally {
        material.key.fill(0);
      }
      let inserted;
      try {
        inserted = await store.insert(record);
      } catch {
        throw fail("CREDENTIAL_STORE_UNAVAILABLE");
      }
      if (inserted !== true) throw fail("CREDENTIAL_EXISTS");
      return {
        credentialRef: "credential://" + credentialId,
        status: "active"
      };
    } finally {
      plaintext.fill(0);
    }
  }

  async function withCredential({ credentialId, tenantId } = {}, callback) {
    if (!requireIdentifier(credentialId) || !requireTenantId(tenantId) || typeof callback !== "function") {
      throw fail("CREDENTIAL_INVALID");
    }
    const record = await readRecord(credentialId, tenantId);
    const plaintext = await decryptRecord(record, credentialId, tenantId);
    try {
      let secret;
      try {
        secret = JSON.parse(plaintext.toString("utf8"));
      } catch {
        throw fail("CREDENTIAL_CORRUPT");
      }
      return await callback(secret);
    } finally {
      plaintext.fill(0);
    }
  }

  async function describe({ credentialId, tenantId } = {}) {
    if (!requireIdentifier(credentialId) || !requireTenantId(tenantId)) {
      throw fail("CREDENTIAL_INVALID");
    }
    const record = await readRecord(credentialId, tenantId);
    return safeMetadata(record);
  }

  async function rotate({ credentialId, tenantId } = {}) {
    if (!requireIdentifier(credentialId) || !requireTenantId(tenantId)) {
      throw fail("CREDENTIAL_INVALID");
    }
    const record = await readRecord(credentialId, tenantId);
    validateActiveRecord(record, credentialId, tenantId);
    const plaintext = await decryptRecord(record, credentialId, tenantId);
    try {
      const material = await currentKey();
      const updatedAt = now();
      let replacement;
      try {
        replacement = encrypt(plaintext, {
          ...material,
          credentialId,
          tenantId,
          version: record.version + 1,
          createdAt: record.createdAt,
          updatedAt
        });
      } finally {
        material.key.fill(0);
      }
      await persistReplacement(credentialId, record.version, replacement);
      return safeMetadata(replacement);
    } finally {
      plaintext.fill(0);
    }
  }

  async function revoke({ credentialId, tenantId } = {}) {
    if (!requireIdentifier(credentialId) || !requireTenantId(tenantId)) {
      throw fail("CREDENTIAL_INVALID");
    }
    const record = await readRecord(credentialId, tenantId);
    if (record.status === "revoked") return safeMetadata(record);
    validateActiveRecord(record, credentialId, tenantId);
    const timestamp = now();
    const replacement = {
      ...record,
      status: "revoked",
      version: record.version + 1,
      iv: null,
      authTag: null,
      ciphertext: null,
      updatedAt: timestamp
    };
    await persistReplacement(credentialId, record.version, replacement);
    return safeMetadata(replacement);
  }

  return Object.freeze({ put, withCredential, describe, rotate, revoke });
}
