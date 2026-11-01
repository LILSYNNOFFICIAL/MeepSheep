import assert from "node:assert/strict";
import { test } from "node:test";
import { createCredentialVault } from "../src/relay/credential-vault.mjs";

class MemoryCredentialStore {
  records = new Map();
  async insert(record) {
    if (this.records.has(record.credentialId)) return false;
    this.records.set(record.credentialId, structuredClone(record));
    return true;
  }
  async get(credentialId) {
    const record = this.records.get(credentialId);
    return record ? structuredClone(record) : null;
  }
  async compareAndSwap(credentialId, expectedVersion, replacement) {
    const current = this.records.get(credentialId);
    if (!current || current.version !== expectedVersion) return false;
    this.records.set(credentialId, structuredClone(replacement));
    return true;
  }
}

class MemoryKeyProvider {
  keys = new Map([
    ["key-v1", Buffer.alloc(32, 1)],
    ["key-v2", Buffer.alloc(32, 2)]
  ]);
  currentKeyId = "key-v1";
  async getCurrentKey() {
    return { keyId: this.currentKeyId, key: Buffer.from(this.keys.get(this.currentKeyId)) };
  }
  async getKey(keyId) {
    const key = this.keys.get(keyId);
    if (!key) throw new Error("key missing");
    return Buffer.from(key);
  }
}

function setup({ maxCredentialBytes } = {}) {
  const store = new MemoryCredentialStore();
  const keyProvider = new MemoryKeyProvider();
  const vault = createCredentialVault({ store, keyProvider, maxCredentialBytes });
  return { store, keyProvider, vault };
}

test("stores credentials only as AES-256-GCM ciphertext and exposes safe metadata", async () => {
  const { store, vault } = setup();
  const secret = { type: "bearer", token: "remote-secret-value" };
  const created = await vault.put({
    credentialId: "conn-credential-1",
    tenantId: "tenant-a",
    secret
  });
  const stored = await store.get("conn-credential-1");
  assert.equal(created.status, "active");
  assert.equal(created.credentialRef, "credential://conn-credential-1");
  assert.equal(stored.algorithm, "A256GCM");
  assert.notEqual(stored.ciphertext, JSON.stringify(secret));
  assert.equal(JSON.stringify(stored).includes("remote-secret-value"), false);
  assert.equal(JSON.stringify(created).includes("remote-secret-value"), false);
  assert.deepEqual(await vault.describe({
    credentialId: "conn-credential-1",
    tenantId: "tenant-a"
  }), {
    credentialId: "conn-credential-1",
    tenantId: "tenant-a",
    status: "active",
    keyId: "key-v1",
    version: 1,
    createdAt: stored.createdAt,
    updatedAt: stored.updatedAt
  });
});

test("decrypts credentials only inside a tenant-scoped callback", async () => {
  const { vault } = setup();
  await vault.put({
    credentialId: "conn-credential-2",
    tenantId: "tenant-a",
    secret: { authorization: "Bearer remote-token" }
  });
  const result = await vault.withCredential({
    credentialId: "conn-credential-2",
    tenantId: "tenant-a"
  }, async (secret) => secret.authorization);
  assert.equal(result, "Bearer remote-token");
  await assert.rejects(
    vault.withCredential({ credentialId: "conn-credential-2", tenantId: "tenant-b" }, async () => "not allowed"),
    (error) => error.code === "CREDENTIAL_NOT_FOUND"
  );
});

test("rejects duplicate credential IDs without replacing existing ciphertext", async () => {
  const { store, vault } = setup();
  await vault.put({ credentialId: "same-id", tenantId: "tenant-a", secret: "first" });
  const original = await store.get("same-id");
  await assert.rejects(
    vault.put({ credentialId: "same-id", tenantId: "tenant-a", secret: "replacement" }),
    (error) => error.code === "CREDENTIAL_EXISTS"
  );
  assert.deepEqual(await store.get("same-id"), original);
});

test("key rotation re-encrypts credentials with the current key and preserves the secret", async () => {
  const { store, keyProvider, vault } = setup();
  await vault.put({
    credentialId: "rotating-credential",
    tenantId: "tenant-a",
    secret: { apiKey: "keep-this-private" }
  });
  const before = await store.get("rotating-credential");
  keyProvider.currentKeyId = "key-v2";
  const rotated = await vault.rotate({
    credentialId: "rotating-credential",
    tenantId: "tenant-a"
  });
  const after = await store.get("rotating-credential");
  assert.equal(rotated.keyId, "key-v2");
  assert.equal(after.keyId, "key-v2");
  assert.equal(after.version, before.version + 1);
  assert.notEqual(after.iv, before.iv);
  assert.notEqual(after.ciphertext, before.ciphertext);
  keyProvider.keys.delete("key-v1");
  assert.deepEqual(await vault.withCredential({
    credentialId: "rotating-credential",
    tenantId: "tenant-a"
  }, async (secret) => secret), { apiKey: "keep-this-private" });
});

test("revocation destroys stored ciphertext and blocks future access", async () => {
  const { store, vault } = setup();
  await vault.put({
    credentialId: "revoked-credential",
    tenantId: "tenant-a",
    secret: "revoke-me"
  });
  const result = await vault.revoke({
    credentialId: "revoked-credential",
    tenantId: "tenant-a"
  });
  const stored = await store.get("revoked-credential");
  assert.equal(result.status, "revoked");
  assert.equal(stored.status, "revoked");
  assert.equal(stored.ciphertext, null);
  assert.equal(stored.iv, null);
  assert.equal(stored.authTag, null);
  await assert.rejects(
    vault.withCredential({
      credentialId: "revoked-credential",
      tenantId: "tenant-a"
    }, async () => "must not run"),
    (error) => error.code === "CREDENTIAL_REVOKED"
  );
});

test("authenticated encryption detects ciphertext tampering and fails closed", async () => {
  const { store, vault } = setup();
  await vault.put({
    credentialId: "tampered-credential",
    tenantId: "tenant-a",
    secret: { token: "tamper-target" }
  });
  const stored = await store.get("tampered-credential");
  stored.ciphertext = Buffer.from(stored.ciphertext, "base64").map((value) => value ^ 0xff).toString("base64");
  store.records.set("tampered-credential", stored);
  await assert.rejects(
    vault.withCredential({
      credentialId: "tampered-credential",
      tenantId: "tenant-a"
    }, async () => "must not run"),
    (error) => error.code === "CREDENTIAL_CORRUPT"
  );
});

test("key rotation and revocation use optimistic concurrency and reject stale writes", async () => {
  const { store, vault } = setup();
  await vault.put({
    credentialId: "concurrent-credential",
    tenantId: "tenant-a",
    secret: "race-target"
  });
  const originalCas = store.compareAndSwap.bind(store);
  store.compareAndSwap = async () => false;
  await assert.rejects(
    vault.rotate({ credentialId: "concurrent-credential", tenantId: "tenant-a" }),
    (error) => error.code === "CREDENTIAL_CONFLICT"
  );
  await assert.rejects(
    vault.revoke({ credentialId: "concurrent-credential", tenantId: "tenant-a" }),
    (error) => error.code === "CREDENTIAL_CONFLICT"
  );
  store.compareAndSwap = originalCas;
});


test("authenticated data binds the tenant and storage version to the ciphertext", async () => {
  const { store, vault } = setup();
  await vault.put({
    credentialId: "bound-credential",
    tenantId: "tenant-a",
    secret: { token: "bound-value" }
  });
  const stored = await store.get("bound-credential");
  stored.version += 1;
  store.records.set("bound-credential", stored);
  await assert.rejects(
    vault.withCredential({ credentialId: "bound-credential", tenantId: "tenant-a" }, async () => "must not run"),
    (error) => error.code === "CREDENTIAL_CORRUPT"
  );

  const other = await store.get("bound-credential");
  other.tenantId = "tenant-b";
  store.records.set("bound-credential", other);
  await assert.rejects(
    vault.withCredential({ credentialId: "bound-credential", tenantId: "tenant-b" }, async () => "must not run"),
    (error) => error.code === "CREDENTIAL_CORRUPT"
  );
});

test("missing historical encryption key fails closed", async () => {
  const { keyProvider, vault } = setup();
  await vault.put({
    credentialId: "missing-key",
    tenantId: "tenant-a",
    secret: { token: "not-recoverable" }
  });
  keyProvider.keys.delete("key-v1");
  await assert.rejects(
    vault.withCredential({ credentialId: "missing-key", tenantId: "tenant-a" }, async () => "must not run"),
    (error) => error.code === "CREDENTIAL_KEY_UNAVAILABLE"
  );
});

test("rejects invalid keys, malformed secrets, and oversize credentials before persistence", async () => {
  const { store, vault } = setup({ maxCredentialBytes: 8 });
  await assert.rejects(
    vault.put({ credentialId: "too-large", tenantId: "tenant-a", secret: "this is too long" }),
    (error) => error.code === "CREDENTIAL_TOO_LARGE"
  );
  await assert.rejects(
    vault.put({ credentialId: "invalid-secret", tenantId: "tenant-a", secret: undefined }),
    (error) => error.code === "CREDENTIAL_INVALID"
  );
  assert.equal(store.records.size, 0);
});
