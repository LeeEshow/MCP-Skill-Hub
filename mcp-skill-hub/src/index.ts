import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server-factory.js";
import { startHttpServer } from "./http.js";

const transportMode = process.env.MCP_TRANSPORT ?? "stdio";

if (transportMode === "http") {
  const port = Number(process.env.MCP_HTTP_PORT ?? 3000);
  startHttpServer(port);
} else {
  const server = createServer({ transport: "stdio", sessionId: String(process.pid) });
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
