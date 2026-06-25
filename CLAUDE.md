# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概觀

這是一個 MCP（Model Context Protocol）Server，作為團隊的「AI 開發知識庫」：透過 stdio 傳輸協議讓 Claude Code 等 MCP Client 連線後，依任務情境按需讀取團隊的程式碼原則、技術棧規範與標準化技能（Code Review、版控），取代每位開發者各自向 AI 重複說明團隊規範。

完整設計理念見 `MCP_Skill_Hub_設計規格書.md`（正式規格）與 `MCP_Skill_Hub_概念設計文件.md`（概念稿，皆位於 repo 根目錄），實作進度見 `MCP_Skill_Hub_實作任務清單.md`。**修改架構前務必先讀設計規格書**，知識文件的層級歸屬、Token 上限與載入規則都定義在裡面。

⚠️ 實際的 Node.js 專案在子目錄 `mcp-skill-hub/` 下，而非 repo 根目錄；以下所有指令皆需在 `mcp-skill-hub/` 內執行。

## 常用指令

```bash
cd mcp-skill-hub
npm install        # 安裝相依套件
npm run build       # tsc 編譯 src/ → dist/
npm run dev          # tsx src/index.ts，本機開發直接跑 TS（stdio）
npm run start        # node dist/index.js，跑編譯後的版本
node test/verify-resources.mjs   # 驗收腳本：先 npm run build，再跑此腳本（它會 spawn dist/index.js 並透過 JSON-RPC 檢查 resources/list、resources/read 是否回傳正確內容）
```

沒有設定 lint / 自動化單元測試框架；`test/` 下只有上述手動驗收腳本。

注意：`src/index.ts`、`src/resources.ts`、`src/prompts.ts` 使用 `import.meta.dirname`，需要 Node.js 20.11+ / 21.2+ 以上版本。

## 架構

### 四層知識結構

Server 把知識內容分四層，對應不同的 MCP 機制與載入時機：

| 層級 | 內容 | MCP 機制 | 載入方式 | 檔案位置 |
|------|------|---------|---------|---------|
| Layer 0 Manifest | 全目錄索引 | Resource | 連線時常駐，唯一常駐層 | `manifest.json` |
| Layer 1 Principle | 語言無關的通用設計準則（憲法層級，Layer 2 不得牴觸） | Resource | 開發情境觸發 | `principle/*.md` |
| Layer 2 Spec | 技術棧專屬規範，三層粒度 | Resource | AI 按需判斷，同時最多 1 個 | `spec/{name}/{summary,rules,full-spec}.md` |
| Layer 3 Skill | 任務型行為指令（怎麼做，非規則知識） | Prompt | 關鍵字觸發，執行後卸載 | `skill/*.md` |

「卸載」是語義層約定（任務結束後 AI 不再套用），MCP 本身沒有原生卸載機制；「同時最多 1 個 Spec + 1 個 Skill」目前也只靠 `manifest.json` 的 `instruction` 文字與 AI 自律，**Server 端程式碼並未強制檢查**（`src/resources.ts` 會把所有 Spec/Skill 全部註冊成可讀取的 Resource/Prompt）。

### 程式碼與知識檔案的對應

- `src/index.ts` — 進入點：建立 `McpServer`，呼叫 `registerResources` / `registerPrompts`，掛上 `StdioServerTransport`。
- `src/resources.ts` — 把 `manifest.json`、`principle/*.md`、`spec/{name}/{tier}.md` 註冊成 MCP Resource，URI 統一用 `skill-hub://` scheme（如 `skill-hub://spec/react-mvvm/rules`）。新增 Spec 時必須把名稱加進此檔的 `specs` 陣列，否則檔案存在也不會被服務出去。
- `src/prompts.ts` — 把 `skill/{name}.md` 註冊成 MCP Prompt（名稱格式 `skill/{name}`）。新增 Skill 時必須把名稱加進此檔的 `skills` 陣列。
- `manifest.json` — 真正驅動 AI 行為的索引：`principles.hint` / `specs[].hint` / `skills[].trigger` 是 AI 判斷是否載入對應資源的關鍵字依據。**新增或修改知識內容時，這個檔案的 hint/trigger 通常也要同步更新**，否則 AI 不會知道何時該載入新內容。

注意：規格書中 `manifest.json` 範例欄位寫的是裸路徑（如 `"principle/code-style"`），但目前實作中 `principles.resources` 等欄位實際存放的是完整的 `skill-hub://` URI；以現有 `manifest.json` 內容為準。

### 新增知識內容的流程

**新增 Spec**：在 `spec/` 下建立資料夾 → 依序寫 `summary.md`（~60 tokens，判斷相關性）→ `rules.md`（~400 tokens，日常開發用）→ `full-spec.md`（~2000 tokens，Code Review 時才載入，可含範例反例）→ 在 `src/resources.ts` 的 `specs` 陣列加上名稱 → 在 `manifest.json` 的 `specs` 加上對應 `hint`。

**新增 Skill**：撰寫 `skill/{name}.md`（角色定義＋執行步驟＋輸出格式，~800 tokens）→ 在 `src/prompts.ts` 的 `skills` 陣列加上名稱 → 在 `manifest.json` 的 `skills` 加上對應 `trigger` 關鍵字（中英文皆要）。

寫知識文件時的硬性格式要求（詳見設計規格書第 4、10 節）：
- `summary.md` / `rules.md` / `principle/*.md`：條列式，每條一行，禁止段落敘述、禁止範例。
- `full-spec.md`：才允許含範例與反例。
- 各檔案有明確 Token 上限（principle 各 200、spec summary 60 / rules 400 / full-spec 2000、skill 800）；寫超過視為規格違規，要精簡內容，不是調高上限。
- 判斷新規則該放 Layer 1 還是 Layer 2：換了技術棧仍然成立 → Layer 1；技術棧專屬 → Layer 2，且不得與 Layer 1 重複定義。

### 目前實作狀態

對照 `MCP_Skill_Hub_實作任務清單.md`：Phase 1（Manifest/Principle/Spec Resource 服務）與 Phase 2 的 Skill Prompt、所有 Spec 文件已完成；**HTTP/SSE 傳輸模式尚未實作**（目前只有 stdio），情境觸發/Skill 執行的端到端驗收與 Phase 3（Server 端 Call Log、Spec/Skill 審查流程）都還待處理。
