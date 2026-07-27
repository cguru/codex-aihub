import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";
import { createAihubServer } from "../src/server.js";

const closeCallbacks: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(closeCallbacks.splice(0).map((close) => close()));
});

describe("MCP server", () => {
  it("advertises the expected read-only metadata tools", async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createAihubServer();
    const client = new Client({
      name: "codex-aihub-test",
      version: "0.1.0",
    });
    closeCallbacks.push(async () => {
      await client.close();
      await server.close();
    });

    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const response = await client.listTools();

    expect(response.tools.map((tool) => tool.name)).toEqual([
      "search_datasets",
      "count_datasets",
      "get_dataset",
      "get_datasets_with_guide",
    ]);
    for (const tool of response.tools) {
      expect(tool.annotations).toMatchObject({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      });
    }
  });
});
