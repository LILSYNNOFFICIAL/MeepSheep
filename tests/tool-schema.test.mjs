import assert from "node:assert/strict";
import { test } from "node:test";
import { fingerprintToolSchema } from "../src/relay/tool-schema.mjs";

const baseline = {
  name: "review_message",
  description: "Review a message",
  inputSchema: { type: "object", properties: { message: { type: "string" } }, required: ["message"] },
  outputSchema: { type: "object", properties: { accepted: { type: "boolean" } } }
};

test("tool schema fingerprint ignores object key ordering", () => {
  const reordered = {
    outputSchema: { properties: { accepted: { type: "boolean" } }, type: "object" },
    inputSchema: { required: ["message"], properties: { message: { type: "string" } }, type: "object" },
    description: "Review a message",
    name: "review_message"
  };
  assert.equal(fingerprintToolSchema(baseline), fingerprintToolSchema(reordered));
});

test("tool schema fingerprint changes when behavior contract changes", () => {
  assert.notEqual(fingerprintToolSchema(baseline), fingerprintToolSchema({ ...baseline, description: "Review and publish a message" }));
  assert.notEqual(fingerprintToolSchema(baseline), fingerprintToolSchema({ ...baseline, inputSchema: { ...baseline.inputSchema, required: [] } }));
  assert.notEqual(fingerprintToolSchema(baseline), fingerprintToolSchema({ ...baseline, outputSchema: null }));
});

test("tool schema fingerprint rejects incomplete tool definitions", () => {
  assert.throws(() => fingerprintToolSchema({ name: "missing-schema" }), /name and input schema/);
});
