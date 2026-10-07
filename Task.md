# Task.md — MCP Skill Hub 待辦事項

> 最後更新：2026-10-07
> 取代 `MCP_Skill_Hub_實作任務清單.md`（已刪除）。舊清單是照 Node/TS 版 `Dev-Core-Hub` 規劃逐項撰寫的，實際專案已改用 .NET 8（`Skill-Hub-NET8/`），因此依目前實況條列，只保留真正還沒做的事。
> 對應規格：`MCP_Skill_Hub_設計規格書.md`

---

## 現況（已完成，供對照，不需再處理）

- 知識層 3 個 Tool（`get_layer1_principles` / `get_spec` / `get_skill`）已實作並上線，`D:\IIS\Skill-Hub\logs\calls.jsonl` 顯示自 2026-08-07 起每日皆有真實呼叫紀錄
- IIS 部署（`D:\IIS\Skill-Hub`，ANCM out-of-process）已上線運作
- Claude Code 連線與自主呼叫已在實際使用中驗證
- `Skill-Hub-NET8` 已加入 git 版本控管；`CLAUDE.md` 已依 .NET 8 現況重寫
- `暫列.md` 的備註紀律與 region 規範已併入 `principle/code-style.md` 與各 C# 規範
- 2026-10-07 規範精簡（原始碼已改，尚未部署）：Layer 1、`web-api-NET`（20→9 條）、`ui-token`（12→4 條）改為意圖式，加入條文代號與標籤，偏離說明改由專案自選；`code-review` 加入偏離說明判斷，`version-control` 補多端與統一提交慣例。細節見設計規格書 5.1

---

## 待辦

### A. 規範精簡後續

| # | 任務 | 備註 |
|---|------|------|
| 1 | 重新部署到 `D:\IIS\Skill-Hub` | 知識檔原始碼已更新，MCP 目前回傳的仍是舊版 |
| 2 | 部署後實測精簡效果 | 兩位專案 PM 的意見多屬推論，需實際使用後再評估是否仍有多餘設計或卡關 |
| 3 | 決定 `wpf-mvvm`、`NET-SDK` 是否套用同一精簡原則 | 兩份 `full-spec.md` 仍含程式碼範例；`wpf-mvvm` 目前無專案使用，等有實際專案再討論；`react-mvvm` 已於 2026-10-07 精簡（15→11 條），待部署驗證 |
| 4 | 實際計算各知識檔 Token | 目前只以字元數粗估，需對照設計規格書第 5 節上限 |
| 5 | 兩個專案先前依舊規範建立的偏離說明需還原或重寫 | 由使用者通知兩位專案 PM 處理（MTD API 已寫入專案 CLAUDE.md 的豁免表） |
| 6 | （待決議）是否另開 `pm-workflow` skill | PM 規劃、SE 實作的流程骨架；尚未決定要不要做 |

### B. 驗證層防線（規格已定，尚未接上服務）

| # | 任務 | 備註 |
|---|------|------|
| 7 | 在 Skill-Hub-NET8 註冊驗證層 Resource（`spec/{name}/lint/*`） | 檔案本體已複製進專案，但目前程式碼完全沒有 Resource 註冊機制，Hook／IDE 讀不到 |
| 8 | 把 `pre-commit-lint` Hook 搬進 Skill-Hub-NET8 | 目前專案沒有 `hooks/` 資料夾 |
| 9 | 實作 Setup Script（簡單版） | 向 Server 讀取驗證層 Resource、寫成獨立設定檔供消費端 `extends`，不做智慧合併 |

### C. 品質與維運

| # | 任務 | 備註 |
|---|------|------|
| 10 | 補自動化驗收腳本 | 目前只有手動 JSON-RPC 測試，沒有可重複執行、能自動比對結果的測試 |
| 11 | （視情況）`get_spec` 的 `name`/`tier` 改用真正的 JSON Schema enum | 目前用字串比對＋`ArgumentException` 驗證；是否值得改視 SDK 支援度而定 |

### D. 狀態待確認（無法從檔案系統判斷）

| # | 任務 | 備註 |
|---|------|------|
| 12 | Claude Desktop（Chat／Code 工作區）連線與自主呼叫驗證 | Claude Desktop 不支援直接填 URL，需用 `mcp-remote` 橋接或本機 stdio；Call Log 未區分呼叫來源 Client |
| 13 | 團隊成員 Client 設定是否已全面指向目前的 Server | 組織性任務，需人工確認；IP 異動時 URL 會失效，可考慮改用電腦名稱 |
| 14 | 舊版（`mcp-skill-hub/`，Node/TS）的 IIS Application 與 Task Scheduler 工作是否已停用移除 | 專案檔案已刪除，但 IIS／工作排程器上是否留有殘留設定不確定 |
