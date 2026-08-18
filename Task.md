# Task.md — MCP Skill Hub 待辦事項

> 最後更新：2026-08-18
> 取代 `MCP_Skill_Hub_實作任務清單.md`（已刪除）。舊清單是照 Node/TS 版 `Dev-Core-Hub` 規劃逐項撰寫的，實際專案已改用 .NET 8（`Skill-Hub-NET8/`）且大部分項目已完成並上線使用，繼續逐條核對舊清單意義不大，因此重新依目前實況條列，只保留真正還沒做的事。
> 對應規格：`MCP_Skill_Hub_設計規格書.md`

---

## 現況（已完成，供對照，不需再處理）

- 知識層 3 個 Tool（`get_layer1_principles` / `get_spec` / `get_skill`）已實作並上線，`D:\IIS\Skill-Hub\logs\calls.jsonl` 顯示自 2026-08-07 起每日皆有真實呼叫紀錄
- IIS 部署（`D:\IIS\Skill-Hub`，ANCM out-of-process）已上線運作
- Claude Code 連線與自主呼叫已在實際使用中驗證（本次對話本身即透過此 Server 取得團隊規範內容）

---

## 待辦

### A. 驗證層防線（規格已定，尚未接上服務）

| # | 任務 | 備註 |
|---|------|------|
| 1 | 在 Skill-Hub-NET8 註冊驗證層 Resource（`spec/{name}/lint/*`） | 檔案本體已複製進專案，但目前程式碼完全沒有 Resource 註冊機制，Hook／IDE 讀不到 |
| 2 | 把 `pre-commit-lint` Hook 搬進 Skill-Hub-NET8 | 舊專案唯一保留的 Hook 尚未搬過來，目前專案沒有 `hooks/` 資料夾 |
| 3 | 實作 Setup Script（簡單版） | 向 Server 讀取驗證層 Resource、寫成獨立設定檔（如 `.eslintrc.skill-hub.json`）供消費端 `extends`，不做智慧合併 |

### B. 品質與維運

| # | 任務 | 備註 |
|---|------|------|
| 4 | 補自動化驗收腳本 | 目前只有手動 JSON-RPC 測試（`test-input.txt`/`test-output.txt`），沒有可重複執行、能自動比對結果的測試 |
| 5 | **Skill-Hub-NET8 加入 git 版本控管** | 整個專案資料夾目前是 untracked，從未 commit，環境異動會直接遺失所有紀錄，建議優先處理 |
| 6 | （視情況）`get_spec` 的 `name`/`tier` 改用真正的 JSON Schema enum | 目前用字串比對＋`ArgumentException` 驗證，AI 只能從 `description` 文字得知合法值，非 Schema 層級強制；是否值得改，視 SDK 支援度與實測效果而定 |

### C. 知識內容

| # | 任務 | 備註 |
|---|------|------|
| 7 | 把 `暫列.md`（備註紀律、region 使用規範）併入 `principle/code-style.md` 或對應 spec | 目前是根目錄下的草稿，尚未進到正式知識庫內容，Tool 也還讀不到 |

### D. 狀態待確認（無法從檔案系統判斷）

| # | 任務 | 備註 |
|---|------|------|
| 8 | Claude Desktop（Chat／Code 工作區）連線與自主呼叫驗證 | Call Log 未區分呼叫來源 Client，無法從紀錄判斷是否已測過 |
| 9 | 團隊成員 Client 設定是否已全面改指向 Skill-Hub-NET8 | 組織性任務，需人工確認 |
| 10 | 舊版（`mcp-skill-hub/`，Node/TS）的 IIS Application 與 Task Scheduler 工作是否已停用移除 | 專案檔案已從硬碟刪除，但 IIS／工作排程器上是否還留著殘留設定不確定 |

### E. 文件

| # | 任務 | 備註 |
|---|------|------|
| 11 | 更新 `CLAUDE.md` | 目前內容完整描述的是舊 v1 `mcp-skill-hub/`（Node/TS）專案的指令與目錄結構，與現況的 `Skill-Hub-NET8`（.NET 8）不符 |
