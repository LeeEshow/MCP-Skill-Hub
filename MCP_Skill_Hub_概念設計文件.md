# MCP Skill Hub — 概念設計文件

> 版本：v0.1（概念討論稿）  
> 狀態：規劃中  
> 最後更新：2025-06

---

## 1. 背景與目標

### 1.1 問題描述

目前個人使用 Claude Code 進行開發已相對成熟，但當需要整合一個開發團隊時，缺乏統一的 AI 互動設計準則，導致：

- 不同開發者與 AI 互動產出的風格、架構不一致
- 無法確保 AI 在輔助開發時遵循團隊既定規範
- 每位開發者需要各自重複設定 AI 的行為邊界

### 1.2 目標

透過 MCP（Model Context Protocol）建立一個集中式的「設計角色知識庫」，讓所有開發者連接同一個 MCP Server，使 AI 在輔助開發時能夠：

- 自主套用團隊的程式碼風格與架構原則
- 依據當前任務情境載入對應的技術規範
- 執行標準化的技術技能（如 Code Review、版本控制）

---

## 2. 架構設計

### 2.1 三層結構概覽

```
MCP Skill Hub
├── Layer 0  Manifest          常駐 · 全目錄索引
├── Layer 1  Principle（原則）  常駐 · 輕量注入
├── Layer 2  Spec（規範）       按需載入 · 技術棧對應
└── Layer 3  Skill（技能）      任務觸發 · 執行後卸載
```

### 2.2 MCP 機制對應

| 層級 | 內容 | MCP 對應機制 |
|------|------|-------------|
| Layer 0 Manifest | 全目錄索引 | Resource（靜態 JSON） |
| Layer 1 Principle | Code Style、OOP/DDD | Resource（常駐文件） |
| Layer 2 Spec | 技術棧架構規範 | Resource + Prompt（情境觸發） |
| Layer 3 Skill | Code Review、版控 | Tool（主動執行） |

---

## 3. 核心設計原則：按需載入（Manifest-First）

### 3.1 設計動機

避免將所有 Skill 一次注入 Context，防止 Token 消耗過快與知識污染。

### 3.2 運作流程

```
連接 MCP 時只注入「目錄（Manifest）」
         ↓
AI 閱讀目錄，得知有哪些 Skill 存在
         ↓
依據當前任務，主動呼叫對應 Resource / Tool
         ↓
用完即卸載，不常駐 Context
```

### 3.3 三種觸發機制

**① 上下文自動偵測（Context Detection）**

由 MCP Server 在 AI 請求前分析當前檔案類型，偵測邏輯在 Server 端執行，不佔 AI 的 Context：

| 偵測條件 | 自動載入 |
|---------|---------|
| `.tsx` / `.jsx` | react-mvvm spec |
| `.cs` + `Window` / `UserControl` | wpf-mvvm spec |
| `Controller` / `Endpoint` / `Middleware` | web-api spec |
| `.css` / `.scss` / `token` | ui-token spec |

**② 分層粒度（Granularity Tiers）**

每個 Spec 拆成三個粒度，AI 依需求決定載入深度：

```
spec/react-mvvm/
  ├── summary.md     # ~60 tokens   — 判斷是否相關
  ├── rules.md       # ~400 tokens  — 一般開發使用
  └── full-spec.md   # ~2000 tokens — Code Review 時使用
```

**③ 明確的生命週期（Lifecycle）**

```
Task Start  → 載入對應 Skill
Task End    → 明確告知 AI 此 Skill 已卸載
New Task    → 重新評估需要哪些 Skill
```

---

## 4. 目錄結構規格

### 4.1 Layer 0 — Manifest

**檔案**：`manifest.json`  
**載入方式**：常駐  
**長度限制**：~80 tokens

```json
{
  "version": "1.0.0",
  "always_on": [
    "principle/code-style",
    "principle/oop-ddd"
  ],
  "specs": {
    "react-mvvm":  { "detect": [".tsx", ".jsx"] },
    "wpf-mvvm":   { "detect": [".cs", "Window", "UserControl"] },
    "web-api":    { "detect": ["Controller", "Endpoint", "Middleware"] },
    "ui-token":   { "detect": [".css", ".scss", "token"] }
  },
  "skills": {
    "code-review":     { "trigger": ["review", "審查", "檢查"] },
    "version-control": { "trigger": ["git", "commit", "ci", "cd", "branch"] }
  }
}
```

---

### 4.2 Layer 1 — Principle（原則層）

**載入方式**：常駐注入  
**設計原則**：Principle 層 token 量小、適用所有情境，應常駐，避免 AI 在每個任務都要先查詢一次才開始工作。  
**寫法要求**：條列式，每條一行，不寫範例（範例放 Spec 層）。

| 檔案 | 內容重點 | 長度限制 |
|------|----------|---------|
| `principle/code-style.md` | 命名規則、縮排、備註格式、禁用寫法 | 200 tokens |
| `principle/oop-ddd.md` | 單一職責、聚合根、值物件、Repository 界定 | 200 tokens |

---

### 4.3 Layer 2 — Spec（規範層）

**載入方式**：按需載入，每次最多 1 個  
**粒度結構**：每個 Spec 拆成三個獨立檔案

| 檔案名稱 | 用途 | 長度限制 |
|---------|------|---------|
| `summary.md` | AI 判斷是否相關，一段話說明適用場景 | 60 tokens |
| `rules.md` | 日常開發核心規則條列 | 400 tokens |
| `full-spec.md` | Code Review 時載入，含完整範例與反例 | 2000 tokens |

**各 Spec 內容方向**：

| Spec | rules.md 涵蓋重點 | full-spec.md 額外涵蓋 |
|------|-------------------|----------------------|
| `react-mvvm` | 元件職責分層、ViewModel 界定、Props 傳遞規範 | 完整元件範本、Hook 使用規範、反例對照 |
| `wpf-mvvm` | Command/Binding 規範、VM 不依賴 View | RelayCommand 範本、XAML 命名規範 |
| `web-api` | Controller 薄層原則、Service 分層、DTO 規範 | 錯誤處理標準、Middleware 位置、完整 Endpoint 範本 |
| `ui-token` | Token 命名規則（color/spacing/radius）、禁止硬編碼 | 完整 Token 表、dark mode 切換規範 |

---

### 4.4 Layer 3 — Skill（技能層）

**載入方式**：任務關鍵字觸發，執行後卸載  
**MCP 機制**：Tool（主動執行動作）

| 檔案 | 觸發關鍵字 | 內容結構 | 長度限制 |
|------|-----------|---------|---------|
| `skill/code-review.md` | review、審查、檢查 | 審查清單 + 嚴重度分級 + 輸出格式模板 | 800 tokens |
| `skill/version-control.md` | git、commit、branch、ci、cd | commit message 規範 + branch 命名 + PR 描述模板 | 600 tokens |

---

## 5. Token 消耗預估

| 使用情境 | 載入內容 | 預估消耗 |
|---------|---------|---------|
| 待機（剛連線） | Manifest + code-style + oop-ddd | ~480 tokens |
| 一般開發 | 待機 + 對應 Spec rules.md | ~880 tokens |
| Code Review | 待機 + full-spec + code-review skill | ~3,280 tokens |

---

## 6. 實作路徑建議

### Phase 1 — 知識層（最快落地）

將原則與規範文件化，以 MCP Resource 形式提供。  
驗證目標：AI 能正確引用規範內容回答問題。

### Phase 2 — 情境觸發層

設計 MCP Prompt，讓 AI 在特定情境自動套用對應規範。  
驗證目標：偵測到 `.tsx` 時，AI 自動引用 react-mvvm 規範進行建議。

### Phase 3 — 工具層（最複雜）

實作 Code Review Tool，實際呼叫規範進行審查。  
整合 Git Hook 與 CI/CD 流程。  
驗證目標：`code-review` Skill 能輸出結構化的審查報告。

---

## 7. 已知挑戰與注意事項

### 7.1 自主套用的觸發機制

AI「自主套用」規範依賴 MCP Prompts 的自動注入，目前 Claude Code 對 MCP Prompt 的自動觸發仍需搭配 system prompt 設計，並非完全零設定。

### 7.2 規範版本控制

團隊規範會隨時間演進，MCP Server 需搭配版本管理機制。建議：

- Manifest 中加入版本號
- 規範異動需走 PR 流程，與 version-control Skill 形成閉環

### 7.3 規範內容品質

MCP 只是載體，AI 套用規範的準確度取決於規範本身的撰寫品質。  
**核心要求**：規範要夠清晰、夠可操作，避免模糊描述。

### 7.4 原則層的例外設計

Principle 層（Layer 1）是唯一不做按需載入的層級，因為：

- Token 量小，常駐成本低
- 適用所有開發情境
- 若也做按需載入，反而增加 AI 每次任務的查詢摩擦

---

## 8. 目錄結構總覽

```
mcp-skill-hub/
├── manifest.json
├── principle/
│   ├── code-style.md
│   └── oop-ddd.md
├── spec/
│   ├── react-mvvm/
│   │   ├── summary.md
│   │   ├── rules.md
│   │   └── full-spec.md
│   ├── wpf-mvvm/
│   │   ├── summary.md
│   │   ├── rules.md
│   │   └── full-spec.md
│   ├── web-api/
│   │   ├── summary.md
│   │   ├── rules.md
│   │   └── full-spec.md
│   └── ui-token/
│       ├── summary.md
│       ├── rules.md
│       └── full-spec.md
└── skill/
    ├── code-review.md
    └── version-control.md
```

---

*本文件為概念討論稿，內容隨規劃進展持續更新。*
