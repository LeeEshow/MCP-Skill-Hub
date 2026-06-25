# MCP Skill Hub — 實作任務清單

> 最後更新：2026-06-24  
> 對應規格書：MCP_Skill_Hub_設計規格書.md

---

## 建議執行順序（已完成批次）

依風險與依賴關係排序，非單純依 Task 編號。**Task 16/17/18/19/20 已全數完成**（2026-06-24），詳見 Phase 3 表格與規格書 13.6～13.9。

Task 10（HTTP/SSE）原依賴 Task 16，現已解除，可隨時開始。下一步建議在 Task 14（`ai-collaboration.md`）、Task 10（HTTP/SSE）、Task 11（驗收觸發行為）三者間挑選。

---

## Phase 1 — 知識層

目標：建立 MCP Server 基礎，提供 Manifest、Principle、Spec 的 Resource 服務，支援 stdio 本機連線。

| # | 任務 | 狀態 |
|---|------|------|
| 1 | 建立 Node.js/TypeScript MCP Server 骨架 | ✅ 已完成 |
| 2 | 實作 Manifest Resource 服務 | ✅ 已完成 |
| 3 | 撰寫 Layer 1 原則文件 — code-style.md | ✅ 已完成 |
| 4 | 撰寫 Layer 1 原則文件 — oop-ddd.md | ✅ 已完成 |
| 5 | 撰寫首個 Spec 三層文件 — react-mvvm | ✅ 已完成 |
| 6 | 實作 Layer 1 / Layer 2 Resource 服務並驗收 | ✅ 已完成 |
| 14 | 撰寫 Layer 1 原則文件 — ai-collaboration.md | ✅ 已完成 |

**驗收標準**：AI 連線後能讀取 Manifest，並依提示正確載入 Principle 與 Spec 內容。

---

## Phase 2 — 情境觸發層

目標：完善所有 Spec，實作 Skill Prompt 服務，支援 HTTP/SSE 團隊共用模式。

| # | 任務 | 狀態 |
|---|------|------|
| 7 | 補齊剩餘 Spec 文件 — wpf-mvvm / web-api-NET / NET-SDK / ui-token | ✅ 已完成 |
| 8 | 撰寫並實作 Skill Prompt — code-review | ✅ 已完成 |
| 9 | 撰寫並實作 Skill Prompt — version-control | ✅ 已完成 |
| 10 | 支援 HTTP/SSE 傳輸模式 | ✅ 已完成 |
| 11 | 驗收情境觸發與 Skill 執行行為 | ✅ 已完成（機械式 hint 稽核，見規格書 13.10；真實 AI 語意判斷需團隊實際接線 `.mcp.json` 後驗證，未含在此次範圍） |

**驗收標準**：AI 能依情境自動載入對應 Spec，觸發關鍵字時啟用 Skill，產出結果符合定義格式，單次 1 Spec + 1 Skill 上限有效。

---

## Phase 3 — 擴充與維運

目標：提升穩定性與可維護性，支援團隊長期使用。

| # | 任務 | 狀態 |
|---|------|------|
| 20 | manifest.json instruction 加入 Pink Elephant 緩解提示 | ✅ 已完成 |
| 16 | 將 react-mvvm 驗證層改為 JSON 格式（消除 RCE 風險） | ✅ 已完成 |
| 18 | 修正 post-edit-lint.mjs：區分工具錯誤與規則違規、分級雙軌 | ✅ 已完成 |
| 17 | 實作 PreToolUse Hook 強制注入 Layer 1 | ✅ 已完成 |
| 19 | web-api-NET / NET-SDK 改為 Contracts 分層設計 | ✅ 已完成 |
| 15 | 設計 Spec 專屬 Lint/Analyzer 驗證層機制 | 🔄 進行中（react-mvvm ✅、wpf-mvvm ✅、PostToolUse/PreToolUse/pre-commit Hook 範本 ✅，已端到端測試；web-api-NET / NET-SDK / ui-token 驗證層尚未補；Hook 尚未在真實消費端專案驗證）|
| 12 | 建立 Server 端 Call Log | ⬜ 待處理 |
| 13 | 建立 Spec / Skill 新增的審查流程 | ⬜ 待處理 |

**驗收標準**：團隊成員可獨立新增 Spec 或 Skill，並通過格式與層級歸屬審查。

> Task 16-20 源自與 Gemini 的架構審查討論（2026-06-24），決策記錄詳見規格書 13.6～13.9。

---

## 狀態說明

| 符號 | 意義 |
|------|------|
| ⬜ | 待處理 |
| 🔄 | 進行中 |
| ✅ | 已完成 |

---

*任務內容依據 MCP_Skill_Hub_設計規格書.md，如規格異動請同步更新此清單。*
