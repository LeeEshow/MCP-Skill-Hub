# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概觀

這是一個 MCP（Model Context Protocol）Server，Server 名稱為 `dev-core-hub`，作為團隊的「AI 開發知識庫」：Claude Code 等 MCP Client 連線後，透過 3 個 MCP Tool 依任務情境按需讀取團隊的程式碼原則、技術棧規範與標準化技能（Code Review、版控），取代每位開發者各自向 AI 重複說明團隊規範。這個 Server 本身目前就掛在本次對話的 MCP 連線上（工具名稱 `mcp__dev-core-hub__*`）。

實作為 .NET 8 / ASP.NET Core 專案，位於 `Skill-Hub-NET8/`；以下所有 `dotnet` 指令皆需在該目錄內執行。完整設計理念見根目錄 `MCP_Skill_Hub_設計規格書.md`；待辦事項見 `Task.md`（已取代並刪除舊版 `MCP_Skill_Hub_實作任務清單.md`，該清單是照更早的 Node/TS 版規劃寫的，現況已改用 .NET 8 且大部分項目已完成上線，直接看 `Task.md` 即可）。

> 舊版曾規劃過一個 Node.js/TypeScript 實作（`mcp-skill-hub/`，Resource/Prompt-based 架構），該目錄已從硬碟刪除、也從未進入這個 repo 的 git 歷史，純屬設計演進中被放棄的路線，程式碼與指令均已不存在，不要依此規劃行事。

## 常用指令

```bash
cd Skill-Hub-NET8
dotnet build              # 一般開發建置（Debug，不含 win-x64 / self-contained 設定）
dotnet run                # 依 MCP_TRANSPORT 環境變數決定傳輸模式（見下方「傳輸模式雙軌」）
dotnet publish -c Release # self-contained + single-file 的 win-x64 發佈，僅 Release 設定生效
```

沒有 lint 設定，也沒有自動化測試框架；`Task.md` 待辦事項中明列「補自動化驗收腳本」尚未完成，目前驗證方式是連線後直接呼叫三個 Tool 確認回傳內容是否正確。

## 架構

### MCP Tool 三層知識結構（`Skill-Hub-NET8/Tools/KnowledgeTools.cs`）

| Tool | 用途 | 對應檔案 |
|------|------|---------|
| `get_layer1_principles()` | 無參數，一次合併回傳 3 份語言無關通用原則 | `principle/*.md` |
| `get_spec(name, tier)` | 技術棧專屬規範；`tier` 預設 `rules`（日常開發），Code Review 時用 `full` | `spec/{name}/{rules,full-spec}.md` |
| `get_skill(name)` | 任務型行為指令（Code Review、版控） | `skill/{name}.md` |

- 合法的 `name` 值寫死在 `KnowledgeTools.cs` 的 `ValidSpecNames` / `ValidSkillNames` 陣列裡（目前 spec 為 `react-mvvm`｜`wpf-mvvm`｜`web-api-NET`｜`NET-SDK`｜`ui-token`，skill 為 `code-review`｜`version-control`），不是靠設定檔驅動。新增 spec 或 skill 若忘記同步加進對應陣列，檔案存在也會在呼叫時被 `ArgumentException` 擋下。
- 知識文件（`principle/`、`skill/`、`spec/`）透過 `.csproj` 的 `Content Include` 在建置時複製到輸出目錄，執行期以 `AppContext.BaseDirectory` 讀取純文字檔，不是編譯進組件的內嵌資源。
- 「同時最多 1 個 Spec + 1 個 Skill」目前完全沒有 Server 端強制機制，純靠每個 Tool `[Description]` 屬性裡的強制語氣文字引導 AI 自律呼叫；Server 程式碼本身把所有合法 `name` 都視為可讀取。
- `Program.cs` 頂部的 `ServerInstructions` 常數會在 MCP `initialize` 回應時隨連線自動送出，不需 AI 先呼叫任何 Tool 就生效，用來補強「使用者描述模糊籠統時，Tool description 未必會被 AI 讀到並觸發呼叫」的限制。

### 傳輸模式雙軌（`Program.cs`）

由 `MCP_TRANSPORT` 環境變數切換：

- 預設（未設定或 `stdio`）→ Generic Host + `StdioServerTransport`，供 Claude Code CLI 等本機 Client 使用。
- `http` → ASP.NET Core + Kestrel + `WithHttpTransport()`，掛載於根路徑 `/`，供 IIS（ANCM out-of-process）或直接 HTTP 連線；生產環境走這個模式常駐服務。
- 兩種模式共用 `ConfigureMcp()` 註冊邏輯；日誌一律導向 stderr——stdio 模式下 stdout 只能用來傳輸 MCP JSON-RPC 訊息，絕不可被一般 log 汙染。

### 新增知識內容的流程

**新增 Spec**：`spec/{name}/` 下建立 `rules.md` + `full-spec.md`（可選加 `lint/` 資料夾放實際 lint 設定檔本體，如 `.eslintrc.json`／`.editorconfig`／`*.BannedSymbols.txt`，供未來驗證層使用——目前這些檔案已存在但尚未接上任何服務機制）→ 在 `KnowledgeTools.cs` 的 `ValidSpecNames` 加上名稱 → 更新 `get_spec` 的 `[Description]` 文字，讓 AI 知道新技術棧的判斷特徵。

**新增 Skill**：撰寫 `skill/{name}.md` → 在 `ValidSkillNames` 加上名稱 → 更新 `get_skill` 的 `[Description]` 文字。

寫知識文件時的硬性格式要求（詳見設計規格書第 5 節）：
- `rules.md` / `principle/*.md`：條列式，每條一行，禁止段落敘述、禁止範例。
- `full-spec.md`：才允許含範例與反例。
- 各檔案有 Token 上限：`principle/*.md` 各 600、`spec/{name}/rules.md` 1300、`full-spec.md` 2000、`skill/{name}.md` 800。寫超過視為規格違規，優先精簡內容，非必要不調高上限（2026-08-18 已依實際內容量重新校準過一次，調整紀錄與理由見設計規格書第 5 節）。
- 判斷新規則該放 Layer 1（`principle/`）還是 Layer 2（`spec/`）：換了技術棧仍然成立 → Layer 1；技術棧專屬 → Layer 2，且不得與 Layer 1 重複定義。

### 部署

生產環境走 IIS + ANCM out-of-process：`web.config` 設定 `hostingModel="outofprocess"`，`processPath` 直接指向 `dotnet publish -c Release` 產出的 self-contained 單一檔案 `SkillHubNet8.exe` 本身，**不可**改回 `processPath="dotnet"` + `arguments=".\SkillHubNet8.dll"` 的 Framework-Dependent 寫法——主機沒裝 .NET 8 Runtime / ASP.NET Core Hosting Bundle 會導致 ANCM 502.5 (Out-Of-Process Startup Failure)。發佈設定見 `Properties/PublishProfiles/FolderProfile.pubxml`。

`Services/CallLogService.cs` 以 JSON Lines 格式把每次 Tool 呼叫記錄寫入 `AppContext.BaseDirectory/logs/calls.jsonl`，寫入失敗不影響主要 MCP 功能（catch 吞掉），用來確認 Server 是否真的被實際呼叫。

### 目前待辦（詳見 `Task.md`）

三個 Tool 與 IIS 部署皆已完成並在生產環境每日被實際呼叫；主要未完成項目是「驗證層」尚未接上服務——`spec/{name}/lint/` 下的 lint 設定檔本體已複製進專案，但 Server 完全沒有對應的 Resource 註冊機制，`pre-commit-lint` Hook 也還沒搬過來；另外沒有可重複執行的自動化驗收測試。
