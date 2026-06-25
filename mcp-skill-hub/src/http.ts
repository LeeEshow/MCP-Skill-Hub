import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "http";
import { randomUUID } from "crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "./server-factory.js";

const MCP_PATH = "/mcp";

/**
 * 團隊共用模式（HTTP/SSE，見規格書 9.5）。Stateful：每個 Session 各自一個
 * McpServer + Transport 實例，以 Session ID 區分，避免多個 Client 互相干擾。
 */
export function startHttpServer(port: number): void {
  const transports = new Map<string, StreamableHTTPServerTransport>();

  const httpServer = createHttpServer(async (req, res) => {
    if (req.url !== MCP_PATH) {
      res.writeHead(404).end();
      return;
    }

    try {
      if (req.method === "POST") {
        await handlePost(req, res, transports);
      } else if (req.method === "GET" || req.method === "DELETE") {
        await handleSessionRequest(req, res, transports);
      } else {
        res.writeHead(405).end();
      }
    } catch (err) {
      console.error("[mcp-skill-hub] 處理請求時發生錯誤：", err);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" }).end(
          JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null })
        );
      }
    }
  });

  httpServer.listen(port, () => {
    console.error(`[mcp-skill-hub] HTTP 傳輸模式啟動，監聽 http://localhost:${port}${MCP_PATH}`);
  });
}

async function handlePost(
  req: IncomingMessage,
  res: ServerResponse,
  transports: Map<string, StreamableHTTPServerTransport>
): Promise<void> {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  const body = await readJsonBody(req);

  let transport = sessionId ? transports.get(sessionId) : undefined;

  if (!transport) {
    if (!isInitializeRequest(body)) {
      res.writeHead(400, { "Content-Type": "application/json" }).end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Bad Request: 缺少有效的 Session，且非 initialize 請求" },
          id: null,
        })
      );
      return;
    }

    const newSessionId = randomUUID();
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => newSessionId,
      onsessioninitialized: (sessionId) => {
        transports.set(sessionId, transport!);
      },
    });

    transport.onclose = () => {
      if (transport!.sessionId) transports.delete(transport!.sessionId);
    };

    const server = createServer({ transport: "http", sessionId: newSessionId });
    await server.connect(transport);
  }

  await transport.handleRequest(req, res, body);
}

async function handleSessionRequest(
  req: IncomingMessage,
  res: ServerResponse,
  transports: Map<string, StreamableHTTPServerTransport>
): Promise<void> {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  const transport = sessionId ? transports.get(sessionId) : undefined;

  if (!transport) {
    res.writeHead(400).end("Invalid or missing session ID");
    return;
  }

  await transport.handleRequest(req, res);
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      if (!raw) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}
