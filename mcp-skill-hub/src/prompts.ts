import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFileSync } from "fs";
import { join } from "path";
import { logCall, type ServerContext } from "./call-log.js";

const ROOT = join(import.meta.dirname, "..");

function readFile(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf-8");
}

export function registerPrompts(server: McpServer, context: ServerContext): void {
  // Layer 3 — Skill
  const skills = ["code-review", "version-control"];

  for (const skill of skills) {
    const name = `skill/${skill}`;
    server.prompt(name, async () => {
      logCall({ type: "prompt", name, transport: context.transport, sessionId: context.sessionId });
      return {
        messages: [
          {
            role: "user",
            content: { type: "text", text: readFile(`skill/${skill}.md`) },
          },
        ],
      };
    });
  }
}
