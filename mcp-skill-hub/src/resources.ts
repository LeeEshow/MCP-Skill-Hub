import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFileSync } from "fs";
import { join } from "path";
import { logCall, type ServerContext } from "./call-log.js";

const ROOT = join(import.meta.dirname, "..");

function readFile(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf-8");
}

const SCHEME = "skill-hub://";

function toUri(path: string): string {
  return `${SCHEME}${path}`;
}

function registerLoggedResource(
  server: McpServer,
  name: string,
  uri: string,
  relativeFilePath: string,
  mimeType: string,
  context: ServerContext
): void {
  server.resource(name, uri, async () => {
    logCall({ type: "resource", name, transport: context.transport, sessionId: context.sessionId });
    return { contents: [{ uri, text: readFile(relativeFilePath), mimeType }] };
  });
}

export function registerResources(server: McpServer, context: ServerContext): void {
  // Layer 0 — Manifest
  const manifestUri = toUri("manifest");
  registerLoggedResource(server, "manifest", manifestUri, "manifest.json", "application/json", context);

  // Layer 1 — Principle
  const principles = ["code-style", "oop-ddd", "ai-collaboration"];
  for (const name of principles) {
    const uri = toUri(`principle/${name}`);
    registerLoggedResource(server, `principle/${name}`, uri, `principle/${name}.md`, "text/markdown", context);
  }

  // Layer 2 — Spec（每個 Spec 三層粒度）
  const specs = ["react-mvvm", "wpf-mvvm", "web-api-NET", "NET-SDK", "ui-token"];
  const tiers = ["summary", "rules", "full"] as const;
  const tierFile: Record<typeof tiers[number], string> = {
    summary: "summary.md",
    rules: "rules.md",
    full: "full-spec.md",
  };

  for (const spec of specs) {
    for (const tier of tiers) {
      const uri = toUri(`spec/${spec}/${tier}`);
      registerLoggedResource(server, `spec/${spec}/${tier}`, uri, `spec/${spec}/${tierFile[tier]}`, "text/markdown", context);
    }
  }

  // Layer 2 — Spec 驗證層（機械式規則的純資料 Lint / Analyzer 設定，每個 Spec 可有多個檔案）
  // 安全限制：僅允許純資料格式（JSON / INI / 純文字），禁止可執行格式（如 .js/.cjs），避免 RCE 風險（見規格書 13.6）
  const specLintFiles: Partial<Record<typeof specs[number], string[]>> = {
    "react-mvvm": [".eslintrc.json", "rules-source.json"],
    "wpf-mvvm": [".editorconfig", "ViewModels.BannedSymbols.txt"],
  };

  for (const spec of specs) {
    const lintFiles = specLintFiles[spec] ?? [];
    for (const lintFile of lintFiles) {
      const slug = lintFile.replace(/^\./, "").toLowerCase();
      const uri = toUri(`spec/${spec}/lint/${slug}`);
      const mimeType = lintFile.endsWith(".json") ? "application/json" : "text/plain";
      registerLoggedResource(server, `spec/${spec}/lint/${slug}`, uri, `spec/${spec}/lint/${lintFile}`, mimeType, context);
    }
  }
}
