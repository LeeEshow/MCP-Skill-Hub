# MCP Skill Hub — 核心架構與設計邏輯 Code Review 報告

本報告針對 **MCP Skill Hub** 專案之整體設計邏輯、現有 TypeScript 程式碼實作、知識庫檔案結構、以及 Token 預算管理進行全面審查。

---

## 1. 核心設計邏輯評估

本專案的核心在於建立一個「AI 行為準則中心」，透過 MCP 協議動態提供團隊的開發原則、技術規範與任務技能。此設計能有效解決 AI「無團隊記憶」與「上下文污染」的問題。

### 1.1 核心機制：按需載入（Manifest-First）
- **優勢**：只有 Layer 0 Manifest 連線時常駐（~150 tokens），Layer 1 與 Layer 2 依情境讀取，Layer 3 則是在執行特定任務時觸發，完成後「語義卸載」。這對節省 Context 空間、避免不同專案規格（如 WPF 與 React）衝突至關重要。
- **改進點**：MCP 協議本身是無狀態的，目前完全依賴 Client 端（AI）的自律。若要達到設計規格書 4.5 節的「Server 端優先約束」，Server 必須具備基本的防護或警告機制。

---

## 2. 發現的關鍵問題與落差（Discrepancies）

> [!IMPORTANT]
> 經過對程式碼與規範文件的對比，發現以下幾項重大落差與改進空間，需在進入 Phase 2 與 Phase 3 前優先解決。

### 🔴 Critical：Manifest 資源 URI 不一致
- **問題描述**：在 manifest.json 中，`specs` 的 `resource` 欄位定義為基礎 URI，例如：
  `"resource": "skill-hub://spec/react-mvvm"`
  然而，在 resources.ts 中，Server **並未註冊** 這個基礎 URI，而是分別註冊了三個粒度的 URI：
  - `skill-hub://spec/react-mvvm/summary`
  - `skill-hub://spec/react-mvvm/rules`
  - `skill-hub://spec/react-mvvm/full`
- **影響**：如果 AI 依照 `manifest.json` 的指引直接讀取 `skill-hub://spec/react-mvvm`，將會遭遇 **Resource Not Found** 錯誤，導致按需載入失敗。
- **改善建議**：
  1. 在 `manifest.json` 中，將 `resource` 欄位改為陣列或物件，明確標示三個粒度對應的 URI。
  2. 或者，在 resources.ts 實作**動態資源路由（Resource Templates）**，讓基礎 URI 也能回傳對應的內容（如預設回傳 summary）。

### 🔴 Critical：硬編碼（Hardcoding）阻礙了知識演進
- **問題描述**：目前 resources.ts 與 prompts.ts 內部寫死 了 `principles`、`specs`、`skills` 的名稱陣列：
  ```typescript
  const principles = ["code-style", "oop-ddd"];
  const specs = ["react-mvvm", "wpf-mvvm", "web-api-NET", "NET-SDK", "ui-token"];
  const skills = ["code-review", "version-control"];
  ```
- **影響**：這與 Phase 3「團隊成員可獨立新增 Spec 或 Skill」的目標衝突。任何人想要新增一個技術棧（例如新增 `spec/vue-mvvm`），不僅要在 `spec/` 下建檔、修改 `manifest.json` ，還**必須修改 TypeScript 原始碼並重新編譯**，這對非 Node.js 開發人員極不友善。
- **改善建議**：
  - 改為**動態載入**：在 Server 啟動時，讀取並解析 `manifest.json` 的內容，或者直接掃描 `spec/` 與 `skill/` 資料夾，動態註冊 MCP Resource 與 Prompt。

### 🟡 Warning：Token 預算超標
- **問題描述**：實測部分文件的大小換算為 Token 後，已明顯超出 MCP_Skill_Hub_設計規格書.md 第 10 節所設定的 Token 上限：
  
  | 項目 | 規格上限 (Tokens) | 檔案大小 (Bytes) | 預估 Token 數 | 狀態 |
  |------|-------------------|------------------|---------------|------|
  | `spec/web-api-NET/full-spec.md` | 2000 | 12,303 | **~3,000+** | ❌ 超標 |
  | `spec/wpf-mvvm/full-spec.md` | 2000 | 9,013 | **~2,200+** | ❌ 超標 |
  | `skill/code-review.md` | 800 | 3,523 | **~900+** | ❌ 略微超標 |
  | `skill/version-control.md` | 800 | 4,370 | **~1,100+** | ❌ 超標 |

- **影響**：過長的文件會迅速消耗對話 Context，使得 Prompt Caching 的效益降低，並增加 API 費用。
- **改善建議**：
  1. 依設計原則「精簡內容」，移除重複敘述，改用更簡練的條列句。
  2. 若無法精簡，應於規格書中調整預算上限並說明原因，保持文件與實作的一致性。

### 🟡 Warning：缺乏路徑防禦（Path Traversal Vulnerability）
- **問題描述**：目前讀取檔案時使用 `readFileSync(join(ROOT, relativePath))`。若未來引入動態 URI 或是 Resource Template 參數，缺乏對 `relativePath` 的安全過濾，可能導致路徑穿越（Path Traversal）漏洞。
- **改善建議**：撰寫安全讀檔函式，在讀取前先確保目標路徑完全在 `ROOT` 目錄之內。

---

## 3. 程式碼優化建議（Refactoring Plan）

以下提供具體程式碼重構方向，使專案具備動態載入能力與高安全性。

### 3.1 `src/resources.ts` 重構為「動態讀取 Manifest」
不用再手動維護 `specs` 陣列，直接從 `manifest.json` 取得註冊資訊：

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";

const ROOT = join(import.meta.dirname, "..");
const SCHEME = "skill-hub://";

// 安全防禦：確保檔案路徑不會越界 (Path Traversal 防禦)
function safeReadFile(relativePath: string): string {
  const targetPath = resolve(ROOT, relativePath);
  if (!targetPath.startsWith(ROOT)) {
    throw new Error(`Access denied: Path ${relativePath} is out of root scope.`);
  }
  if (!existsSync(targetPath)) {
    throw new Error(`File not found: ${relativePath}`);
  }
  return readFileSync(targetPath, "utf-8");
}

function toUri(path: string): string {
  return `${SCHEME}${path}`;
}

export function registerResources(server: McpServer): void {
  // 1. 註冊 Manifest
  const manifestUri = toUri("manifest");
  server.resource("manifest", manifestUri, async () => ({
    contents: [{ uri: manifestUri, text: safeReadFile("manifest.json"), mimeType: "application/json" }],
  }));

  // 2. 解析 Manifest 以動態註冊其餘資源
  let manifest: any;
  try {
    manifest = JSON.parse(safeReadFile("manifest.json"));
  } catch (err) {
    console.error("Failed to parse manifest.json, fallback to empty registrations.", err);
    return;
  }

  // 註冊 Principles
  const principles = manifest.principles?.resources ?? [];
  for (const pResource of principles) {
    // 從 skill-hub://principle/{name} 提取檔名
    const match = pResource.match(/skill-hub:\/\/principle\/(.+)/);
    if (!match) continue;
    const name = match[1];
    
    server.resource(`principle/${name}`, pResource, async () => ({
      contents: [{ uri: pResource, text: safeReadFile(`principle/${name}.md`), mimeType: "text/markdown" }],
    }));
  }

  // 註冊 Specs (動態讀取 specs 物件裡的 keys)
  const specNames = Object.keys(manifest.specs ?? {});
  const tiers = ["summary", "rules", "full"] as const;
  const tierFile: Record<typeof tiers[number], string> = {
    summary: "summary.md",
    rules: "rules.md",
    full: "full-spec.md",
  };

  for (const spec of specNames) {
    for (const tier of tiers) {
      const uri = toUri(`spec/${spec}/${tier}`);
      server.resource(`spec/${spec}/${tier}`, uri, async () => ({
        contents: [{ uri, text: safeReadFile(`spec/${spec}/${tierFile[tier]}`), mimeType: "text/markdown" }],
      }));
    }
  }
}
```

### 3.2 `src/prompts.ts` 同步重構
動態從 `manifest.json` 取得 `skills` 項目：

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";

const ROOT = join(import.meta.dirname, "..");

function safeReadFile(relativePath: string): string {
  const targetPath = resolve(ROOT, relativePath);
  if (!targetPath.startsWith(ROOT)) {
    throw new Error(`Access denied.`);
  }
  return readFileSync(targetPath, "utf-8");
}

export function registerPrompts(server: McpServer): void {
  let manifest: any;
  try {
    manifest = JSON.parse(safeReadFile("manifest.json"));
  } catch (err) {
    console.error("Failed to parse manifest.json for prompts.", err);
    return;
  }

  const skills = Object.keys(manifest.skills ?? {});

  for (const skill of skills) {
    server.prompt(`skill/${skill}`, async () => ({
      messages: [
        {
          role: "user",
          content: { type: "text", text: safeReadFile(`skill/${skill}.md`) },
        },
      ],
    }));
  }
}
```

---

## 4. 針對後續 Phase 實作的架構建議

### 4.1 支援 HTTP/SSE 傳輸模式（任務 10）
為了讓團隊共享，Server 不能只跑 stdio。建議重構 index.ts，使其根據環境變數或參數切換傳輸協定：

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { registerResources } from "./resources.js";
import { registerPrompts } from "./prompts.js";

const server = new McpServer({
  name: "mcp-skill-hub",
  version: "1.0.0",
});

registerResources(server);
registerPrompts(server);

const useSSE = process.argv.includes("--sse") || process.env.TRANSPORT === "sse";

if (useSSE) {
  const app = express();
  let transport: SSEServerTransport | null = null;

  app.get("/sse", async (req, res) => {
    transport = new SSEServerTransport("/messages", res);
    await server.connect(transport);
  });

  app.post("/messages", async (req, res) => {
    if (transport) {
      await transport.handlePostMessage(req, res);
    } else {
      res.status(400).send("No active SSE connection");
    }
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`MCP Skill Hub running on SSE port ${PORT}`);
  });
} else {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Skill Hub running on stdio");
}
```

### 4.2 建立 Server 端 Call Log（任務 12）
在 `safeReadFile` 或資源讀取的 Callback 內，設計一個簡單的日誌模組。
此模組除了寫入日誌檔外，亦可特別監控：**同一對話 Session 中是否被重複載入了複數個 Spec**，若有，則印出警告，作為「Server 端限制」的間接驗證機制。

### 4.3 審查流程自動化（任務 13）
可以在專案中加入 `npm run lint:specs` 腳本，透過簡易指令（例如計算 Markdown 檔案字數或使用 `gpt-3.5-turbo` API 進行估算）自動檢查 `spec/` 下所有檔案是否超標、格式是否完全為條列式，確保「新增 Spec」流程的合規性。
