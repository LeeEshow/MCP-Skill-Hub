import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerResources } from "./resources.js";
import { registerPrompts } from "./prompts.js";
import type { ServerContext } from "./call-log.js";

/**
 * 每個 Transport 連線（stdio 程序、或 HTTP 的每個 Session）都需要獨立的 McpServer 實例，
 * 不可在多個連線間共用同一個實例，否則會互相干擾。
 */
export function createServer(context: ServerContext = { transport: "stdio" }): McpServer {
  const server = new McpServer({
    name: "mcp-skill-hub",
    version: "1.0.0",
  });

  registerResources(server, context);
  registerPrompts(server, context);

  return server;
}
