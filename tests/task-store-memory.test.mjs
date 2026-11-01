import { test } from "node:test";
import { createInMemoryTaskRepository } from "../src/relay/task-store-memory.mjs";
import { registerTaskRepositoryContract } from "./support/task-repository-contract.mjs";

registerTaskRepositoryContract({
  test,
  name: "in-memory task repository",
  createRepository: () => createInMemoryTaskRepository()
});
