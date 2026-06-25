# MCP Skill Hub — 設計規格書

> 版本：v1.0（正式規格稿）  
> 狀態：撰寫中  
> 最後更新：2026-06-24

---

## 1. 背景與目標

### 1.1 問題描述

當團隊導入 AI 輔助開發後，每位開發者與 AI 的互動各自為政，導致：

- 同一個設計問題，不同人問 AI 會得到不同方向的解答
- 模組化、責任分離、OOP、DDD 等核心觀念無法統一傳遞給 AI
- 團隊的 Code Style 規範需每人重複設定，AI 仍可能給出不符規範的建議

根本原因在於：AI 在每一次對話都從零開始，沒有「團隊記憶」。MCP Server 本質上是在替 AI 做入職訓練，讓它從第一句話起就知道這個團隊的行為準則。

### 1.2 目標

建立一個集中式 MCP Server，作為團隊的「AI 行為準則中心」，使所有成員在使用 AI 輔助開發時，AI 能夠：

- 以統一的核心設計觀念（模組化、責任分離、OOP/DDD）為基礎進行建議
- 遵循統一的 Code Style 與技能標準（如 Code Review 方式、版控規範）
- 依據當前任務情境自動載入對應的技術規範，而非由開發者手動說明

### 1.3 適用範圍

- **適用對象**：所有使用 AI 輔助開發的團隊成員
- **適用時機**：任何透過 AI 進行程式設計、審查、重構的開發活動
- **不受限於**：特定程式語言或技術棧（原則層為語言無關的通用設計準則）

### 1.4 非目標（Non-Goals）

MCP Server 的目的是規範 AI 在輔助開發時的任務執行方式，不在於：

- 替代人工進行架構決策
- 強制限定技術選型或框架選擇

---

## 2. 名詞定義

| 名詞 | 定義 |
|------|------|
| MCP（Model Context Protocol） | 標準化協議，讓 AI 能夠存取外部的工具、資源與提示詞 |
| MCP Server | 依照 MCP 協議提供 Resource / Tool / Prompt 的服務端 |
| Manifest | 全目錄索引檔，AI 連線時第一個讀取的檔案，記錄所有可用資源的位置與觸發條件 |
| Principle（原則） | 語言無關的通用設計準則，開發情境觸發載入 |
| Spec（規範） | 技術棧對應的開發規範，按需載入，每次最多一個 |
| Skill（技能） | 標準化任務的執行腳本，由任務關鍵字觸發，執行後卸載 |
| Resource | MCP 機制之一，提供靜態或動態的文件內容供 AI 讀取 |
| Tool | MCP 機制之一，提供可執行的操作，AI 主動呼叫 |
| Prompt | MCP 機制之一，提供可觸發的提示詞模板 |
| 按需載入 | AI 依任務需求主動呼叫對應資源，而非連線時一次全部注入 |
| 生命週期（Lifecycle） | Skill / Spec 從觸發載入到明確卸載的完整過程 |
| Prompt Caching | 快取常駐 System Prompt 內容，避免每次對話重複計算 token |
| Context Detection | 由 AI 自行判斷當前任務情境，或由用戶在對話中明確指定，觸發對應資源載入；非 Server 端自動偵測 |
| 驗證層（Lint / Analyzer） | Layer 2 Spec 下的可執行設定檔（如 ESLint、.editorconfig），將機械式規則翻譯為決定性檢查，不依賴 AI 自律 |
| Hook | Client 端（如 Claude Code）的生命週期攔截機制，於工具呼叫後執行驗證層檢查並將結果回饋給 AI；非 MCP Server 機制，由消費端專案自行接線 |

---

## 3. 整體架構

### 3.1 四層結構總覽

```
MCP Skill Hub
├── Layer 0  Manifest          常駐 · 全目錄索引
├── Layer 1  Principle（原則）  開發情境觸發 · 輕量注入
├── Layer 2  Spec（規範）       按需載入 · 技術棧對應
└── Layer 3  Skill（技能）      任務觸發 · 執行後卸載
```

**典型互動流程：**

```
連線時        → 只載入 Layer 0 Manifest（唯一常駐層）
收到任務      → AI 讀 Manifest，判斷是否為開發情境
  開發任務    → 載入 Layer 1 Principle + 對應 Layer 2 Spec（若有）
               若觸發技能關鍵字 → 額外載入 Layer 3 Skill
  非開發任務  → 只有 Manifest，不注入任何開發原則
任務結束      → Layer 1 / Layer 2 / Layer 3 卸載，回到待機狀態
```

### 3.2 各層職責說明

| 層級 | 職責 | 載入方式 | 卸載方式 |
|------|------|---------|---------|
| Layer 0 Manifest | 全目錄索引，告知 AI 有哪些資源可用及觸發條件 | 連線時常駐 | 不卸載 |
| Layer 1 Principle | 語言無關的通用設計準則，AI 所有行為的基礎 | 開發情境觸發載入 | 任務結束後卸載 |
| Layer 2 Spec | 特定技術棧的開發規範，補充 Layer 1 的技術細節 | AI 依情境自行判斷或用戶指定 | 任務結束後卸載 |
| Layer 3 Skill | 特定任務的執行指引，如 Code Review、版控規範 | 任務關鍵字觸發 | 任務結束後卸載 |

### 3.3 MCP 機制對應

| 層級 | MCP 機制 | 說明 |
|------|---------|------|
| Layer 0 Manifest | Resource（靜態 JSON） | AI 主動讀取目錄索引 |
| Layer 1 Principle | Resource（觸發載入） | AI 讀取後內化為基礎行為準則，任務結束後卸載 |
| Layer 2 Spec | Resource（按需讀取） | AI 依任務需求讀取對應技術規範 |
| Layer 3 Skill | Prompt（行為模板） | 注入對話結構，塑造 AI 執行特定任務的方式 |

---

## 4. 設計原則

### 4.1 按需載入（Manifest-First）

AI 連線時只注入 Manifest，依任務需求主動呼叫對應資源，避免一次全量注入。

### 4.2 Token 效率優先

- **內容格式**：所有文件採條列式撰寫，禁止段落敘述，同樣資訊條列格式約節省 60% token
- **唯一常駐層**：只有 Layer 0 Manifest 真正常駐，Layer 1 改為開發情境觸發載入，避免與其他 MCP Server 同時連線時產生情境污染
- **常駐內容快取**：Layer 0 Manifest 約 150 tokens，啟用 Prompt Caching 只計算一次
- **階段性載入**：Spec 載入前必須先讀 summary.md 判斷相關性，確認後才載入 rules.md
- **單次上限**：同時最多載入 1 個 Spec、1 個 Skill，避免多層疊加
- **跨層不重複**：Layer 2 只補充 Layer 1 沒有的技術棧專屬規則，禁止重複定義

### 4.3 明確生命週期

載入由 AI 依情境自行判斷或用戶指定；**卸載**則需要明確信號，不靠 AI 自行推斷，確保 Context 狀態可預期。任務結束時應明確告知 AI 當前 Skill / Spec 已完成，不再適用。

### 4.4 分層粒度（Granularity Tiers）

每個 Spec 拆成三個粒度（summary / rules / full-spec），AI 依任務深度決定載入層級，不預設載最深。

### 4.5 Server 端優先約束

規則的執行盡量靠 Server 端實作約束，而非依賴 AI 自律。可在 Server 端強制執行的規則（如單次 Spec 上限），不應僅寫在文件中要求 AI 遵守。

---

> **議題進展**：原開放討論議題（AI 是否確實遵守規則缺乏驗證機制）已部分解決，詳見 7.5「驗證層」。規則依性質分兩種驗證方式：機械式規則（命名、長度、嵌套深度等）透過 Lint / Analyzer 設定檔搭配 Client 端 Hook 做到不依賴 AI 自律的強制檢查；語意式規則（單一職責、Domain 純粹性等）仍仰賴 `code-review` Skill 的 AI 自我審查與人工抽查，尚無法完全自動化驗證。

---

## 5. Layer 0 — Manifest

### 5.1 職責

Manifest 是 AI 連線後第一個讀取的檔案，職責只有一個：**告知 AI 系統中有哪些資源、以及各資源的觸發條件**。不放任何規範內容，純粹作為索引。

### 5.2 規格

- **格式**：JSON
- **載入方式**：常駐，連線時自動載入
- **Token 預算**：盡可能精簡，目標 150 tokens 以內
- **Context Detection 執行者**：AI 自行判斷，或由用戶在對話中明確指定

### 5.3 manifest.json 欄位定義

| 欄位 | 類型 | 說明 |
|------|------|------|
| `version` | string | Manifest 版本號 |
| `instruction` | string | 給 AI 的行為指引，說明載入規則與優先順序 |
| `principles` | object | Layer 1 原則層的觸發設定 |
| `principles.hint` | string[] | AI 判斷是否為開發情境的關鍵字參考，命中時載入所有 Layer 1 資源 |
| `principles.resources` | string[] | Layer 1 原則文件的路徑清單 |
| `specs` | object | 各 Layer 2 Spec 的索引，key 為 Spec 名稱 |
| `specs[].hint` | string[] | AI 判斷是否載入該 Spec 的情境關鍵字參考 |
| `skills` | object | 各 Layer 3 Skill 的索引，key 為 Skill 名稱 |
| `skills[].trigger` | string[] | 觸發載入該 Skill 的對話關鍵字（中英文） |

### 5.4 範例

```json
{
  "version": "1.0.0",
  "instruction": "用戶明確指定 Spec 時直接載入；否則依 hint 與對話情境自行判斷。同時最多載入 1 個 Spec、1 個 Skill。",
  "principles": {
    "hint": ["函式", "類別", "元件", "程式", "開發", "實作", "重構", "架構", "function", "class", "component", "code", "implement", "refactor"],
    "resources": ["skill-hub://principle/code-style", "skill-hub://principle/oop-ddd"]
  },
  "specs": {
    "react-mvvm":  { "hint": [".tsx", ".jsx", "React", "元件", "component"], "resource": "skill-hub://spec/react-mvvm", "lint": ["skill-hub://spec/react-mvvm/lint/eslintrc.cjs"] },
    "wpf-mvvm":    { "hint": [".cs", "Window", "UserControl", "WPF", "XAML"], "resource": "skill-hub://spec/wpf-mvvm", "lint": ["skill-hub://spec/wpf-mvvm/lint/editorconfig", "skill-hub://spec/wpf-mvvm/lint/viewmodels.bannedsymbols.txt"] },
    "web-api-NET": { "hint": ["Controller", "Endpoint", "Middleware", "API", ".NET", "ASP.NET"], "resource": "skill-hub://spec/web-api-NET" },
    "NET-SDK":     { "hint": ["HttpClient", "SDK", "Client", "DLL", "NuGet"], "resource": "skill-hub://spec/NET-SDK" },
    "ui-token":    { "hint": [".css", ".scss", "token", "設計系統"], "resource": "skill-hub://spec/ui-token" }
  },
  "skills": {
    "code-review":     { "trigger": ["review", "審查", "code review", "檢查程式碼"] },
    "version-control": { "trigger": ["git", "commit", "branch", "ci", "cd", "版控"] }
  }
}
```

---

## 6. Layer 1 — Principle（原則層）

### 6.1 職責

提供語言與技術棧無關的通用設計準則，作為 AI 所有開發建議的基礎。Layer 1 的角色如同**憲法**：普世適用，Layer 2 的所有規範不得牴觸，發生衝突時 Layer 1 優先。

偵測到開發情境時載入，與 Layer 2 Spec 同步觸發；非開發任務不載入，避免與其他 MCP Server 產生情境污染。

### 6.2 設計限制

- **Token 上限**：兩份文件合計不超過 400 tokens
- **格式要求**：條列式，每條一行，禁止段落敘述，不含範例（範例屬 Layer 2）
- **適用條件**：只有適用於所有技術棧的原則才放此層；技術棧專屬規則一律放 Layer 2
- **擴充原則**：預設維持最少文件數，實作後確認有不可避免的通用原則才新增

### 6.3 原則文件說明

Layer 1 目前包含三份原則文件，以下說明各自涵蓋的方向。

**code-style.md**
涵蓋與程式語言無關的程式碼風格準則，例如命名規則的一致性、縮排規範、備註撰寫時機，以及應避免的常見寫法。目標是讓 AI 在任何技術棧下產出的程式碼風格保持一致。

**oop-ddd.md**
涵蓋物件導向設計與領域驅動設計的核心概念，例如單一職責、模組化、責任分離、聚合根界定、值物件使用時機。目標是讓 AI 在設計建議時以這些概念為基礎，不因技術棧不同而給出相互矛盾的架構方向。

**ai-collaboration.md**
涵蓋 AI 工作行為原則，例如不確定時主動詢問、最小化變更範圍、先定義成功標準再執行、判斷力任務與確定性邏輯的分工、揭露而非隱藏不確定性。來源為團隊既有的 CLAUDE.md 12 條規則，排除其中 Token 預算（運營層面數字設定，非行為原則）後改寫為條列格式。目標是讓 AI 的工作方式（而非僅程式碼產出）在團隊內保持一致。

---

## 7. Layer 2 — Spec（規範層）

### 7.1 職責

提供特定技術棧的開發規範細則。Layer 2 的角色如同**行政法**：在 Layer 1 憲法的框架內，針對特定領域制定具體規則，不得牴觸 Layer 1，衝突時 Layer 1 優先。

Layer 2 只補充 Layer 1 沒有涵蓋的技術棧專屬規則。若某條規則換了技術棧仍然成立，它屬於 Layer 1，不應重複寫入 Layer 2。

### 7.2 粒度結構規格

每個 Spec 拆成三個獨立檔案，AI 依任務深度決定載入層級：

| 檔案 | 用途 | Token 上限 | 觸發時機 |
|------|------|-----------|---------|
| `summary.md` | 一段話說明此 Spec 的適用場景，供 AI 判斷是否相關 | 60 tokens | 情境判斷時 |
| `rules.md` | 日常開發核心規則條列 | 400 tokens | 一般開發任務 |
| `full-spec.md` | 完整規範含範例與反例 | 2000 tokens | 深度任務（Code Review、架構設計） |

**格式要求**：
- `summary.md` / `rules.md`：條列式，禁止段落敘述，不含範例
- `full-spec.md`：可含範例與反例，仍以條列為主結構

### 7.3 Spec 設計方向（以現有技術棧為例）

以下以團隊目前技術棧列舉 Spec 方向，作為設計參考，非固定清單。實際 Spec 內容於實作階段撰寫。

| Spec | 適用情境 | rules.md 涵蓋重點 |
|------|---------|-----------------|
| `react-mvvm` | React / TSX 元件開發 | 元件職責分層、ViewModel 界定、Hook 規範、非同步可靠性 |
| `wpf-mvvm` | WPF 桌面應用開發 | Command / Binding 規範、ViewModel 與 WPF 解耦、Domain 工廠轉換 |
| `web-api-NET` | .NET Web API 後端開發 | Shared Library（BaseModel/Model\<T\>/ObjectType）、Repository 模式、Controller 薄層、Swagger |
| `NET-SDK` | .NET Client 端 SDK（消費 Web API） | HttpClient 封裝、Repository 介面對等實作、統一例外處理 |
| `ui-token` | UI 設計系統 | Token 兩層架構、命名規則、禁止硬編碼數值、Dark Mode |

### 7.4 新增 Spec 的標準流程

1. **確認歸屬**：確認規則為技術棧專屬，不屬於 Layer 1 的通用原則
2. **建立目錄**：在 `spec/` 下建立對應資料夾
3. **依序撰寫**：先寫 `summary.md`，確認定位後再寫 `rules.md`，最後視需求補 `full-spec.md`
4. **更新 Manifest**：在 `manifest.json` 的 `specs` 中新增對應 `hint` 觸發條件
5. **審查**：新 Spec 需確認未與 Layer 1 原則牴觸

### 7.5 驗證層（Lint / Analyzer）

**背景**：Layer 1 / Layer 2 的規則目前以文字形式提供給 AI 讀取，AI 是否確實套用完全依賴自律。其中部分規則屬於「機械式規則」（如命名格式、函式長度、嵌套深度），可被決定性工具檢查，不需要依賴 AI 記憶或自覺遵守。

**兩層驗證模型**：

| 規則性質 | 範例 | 驗證方式 |
|---------|------|---------|
| 機械式規則 | 命名格式、函式長度、參數上限、嵌套深度、`async void`、禁用特定 API | Lint / Analyzer 設定檔，決定性檢查 |
| 語意式規則 | 單一職責、Domain 純粹性、命名是否自我解釋 | `code-review` Skill（AI 自我審查）+ 人工抽查 |

**檔案位置與格式**：驗證層設定檔放在 `spec/{name}/lint/` 下，依技術棧選用對應工具：

| 技術棧 | 工具 | 檔案 |
|--------|------|------|
| TypeScript / React | ESLint | `.eslintrc.json`（純 JSON，禁用 `.js`/`.cjs`，見 13.6） |
| C# / WPF | Roslyn Analyzer | `.editorconfig`（命名規則、IDE 內建規則）+ `{ProjectName}.BannedSymbols.txt`（搭配 `Microsoft.CodeAnalysis.BannedApiAnalyzers`，僅套用於特定專案如 ViewModels） |

**格式限制（安全性）**：所有發布為 Resource 的驗證層設定檔**必須為純資料格式（JSON / INI / 純文字），嚴禁使用可執行格式**（如 `.js`、`.cjs`）。原因見 13.6。

**規則來源標註改用獨立旁帶檔案**（如 `rules-source.json`），不放在 `.eslintrc.json` 內。原計畫以 JSON 內的 `_comment` 欄位標註來源，但實作驗收時發現 **ESLint 對 legacy config 會做嚴格 Schema 驗證，拒絕任何非標準頂層屬性**（`_comment` 會直接導致 `ESLint configuration in --config is invalid` 錯誤），故改為與設定檔同目錄的獨立檔案，內容不被 ESLint 載入，僅供人工 / AI 閱讀。

**ESLint 版本相容性限制**：ESLint 9+ 已預設移除 legacy config（`--no-eslintrc` / `--config <json>`）支援，改用必須為 JS 格式的 Flat Config——若改用 Flat Config 將重新引入 13.6 已排除的 RCE 風險。為維持 JSON-only 的安全限制，驗證層腳本透過 `npx eslint@8` **明確鎖定版本**執行，與消費端專案本身安裝的 ESLint 版本無關。此限制已於 Task 18 實作時以實際 ESLint 8 / 9 / 10 測試確認。

**重要限制**：並非所有 Layer 2 規則都能機械化驗證；無對應工具規則的條目維持由 `code-review` Skill 負責。部分規則（如 ViewModel 禁止引用 `System.Windows`）的最強驗證手段是**專案參考層級隔離**而非 Analyzer——若 ViewModels 獨立為不參考 WPF 組件的 Class Library，違規會直接編譯失敗。

**分級雙軌（依工具執行成本分流）**：機械式規則內部仍有速度差異，不應一律套用同一觸發時機：

| 軌道 | 觸發時機 | 適用工具 | 理由 |
|------|---------|---------|------|
| 即時軌 | `PostToolUse` Hook（Edit/Write 後） | ESLint 全套規則（TS/React，單檔案、不開型別檢查） | 單檔案解析通常 < 200ms，不影響對話流暢度 |
| 延遲軌 | Git Commit 階段（`hooks/pre-commit-lint.mjs`） | C#/.NET 全部檢查：`.editorconfig` 命名規則 + `BannedSymbols` + Roslyn Analyzer（`dotnet format analyzers`） | 缺乏可獨立快速執行的 C# 命名檢查工具（`.editorconfig` 規則需透過 `dotnet` 工具鏈才能驗證），且 Roslyn 需完整專案編譯語意樹，單次執行可能數秒，不適合即時觸發 |

**衝突取捨原則**：Spec-Hub 發布的驗證層設定為團隊強制標準，視為 `Error`；專案本機既有的 Lint 設定視為 `Warning`，作為輔助參考，不得反過來壓制團隊標準。

**與 MCP Server 的關係**：驗證層設定檔以 Resource 形式發布（見 9.2），但**實際執行驗證的 Hook 機制運作於 Client 端**，MCP Server 本身不執行檢查，只負責提供設定檔內容的單一來源。

---

## 8. Layer 3 — Skill（技能層）

### 8.1 職責

為 AI 定義特定任務的執行方式，使 AI 在觸發該技能後，能依照預設的步驟、格式與標準完成任務。Layer 3 是行為驅動的角色指令，不是規則知識，AI 執行的是「怎麼做」，而非「應遵守什麼」。

### 8.2 與 Layer 2 的差異

| | Layer 2 Spec | Layer 3 Skill |
|--|--|--|
| 本質 | 規則知識，AI 讀取後內化 | 行為指令，AI 依此執行任務 |
| MCP 機制 | Resource | Prompt |
| 觸發條件 | 情境偵測（技術棧相關） | 任務關鍵字（動作導向） |
| 卸載時機 | 任務結束 | 任務結束 |

### 8.3 觸發機制

由 Manifest 中 `skills` 的 `trigger` 關鍵字定義，AI 偵測到對話中出現對應關鍵字時載入。用戶也可以明確指定使用特定 Skill。

### 8.4 生命週期

載入 → 執行任務 → 產出結果 → 卸載。單次任務結束後即卸載，下次任務重新觸發。

### 8.5 Skill 內容結構

每個 Skill 為單一 Prompt 文件，內容包含：

- **角色定義**：AI 在此任務中扮演的角色
- **執行步驟**：完成任務的標準流程
- **輸出格式**：結果的呈現方式與結構
- **評判標準**（視任務而定）：例如 Code Review 的嚴重度分級

以 `code-review` 和 `version-control` 為現有範例，實際內容於實作階段撰寫。

### 8.6 新增 Skill 的標準流程

1. **確認定位**：確認此技能是行為指令，而非規則知識（規則知識屬 Layer 1 或 Layer 2）
2. **撰寫 Skill Prompt**：依照 8.5 的內容結構撰寫
3. **更新 Manifest**：在 `skills` 中新增對應 `trigger` 關鍵字（含中英文）

---

## 9. MCP Server 實作規格

### 9.1 技術選型

| 項目 | 選擇 | 說明 |
|------|------|------|
| Runtime | Node.js | 跨平台、部署彈性高，支援本機與雲端多元部署 |
| 語言 | TypeScript | 型別安全，搭配 MCP SDK 開發體驗佳 |
| MCP SDK | `@modelcontextprotocol/sdk` | 官方 SDK，提供 Resource / Prompt 標準介面 |
| 知識檔案 | Markdown / JSON（檔案系統） | Principle、Spec、Skill 以純文字檔管理，便於版控 |

**傳輸協議選擇：**

| 模式 | 適用情境 |
|------|---------|
| stdio | 本機開發，Claude Code CLI 直接啟動本機 Server |
| HTTP/SSE | 團隊共用，Server 部署於內網或雲端，成員遠端連線 |

建議實作時同時支援兩種傳輸協議，依部署環境切換。

### 9.2 Resource 實作規格

所有 Layer 0～2 的內容以 MCP Resource 提供。**URI 必須帶 scheme**（自訂 `skill-hub://`），純路徑字串（如 `manifest`）會被 MCP SDK 判定為 Invalid URL，此為實作階段驗收時發現並修正的問題。

| 資源 | URI 格式 | 範例 |
|------|---------|------|
| Manifest | `skill-hub://manifest` | `skill-hub://manifest` |
| Principle | `skill-hub://principle/{name}` | `skill-hub://principle/code-style` |
| Spec summary | `skill-hub://spec/{name}/summary` | `skill-hub://spec/react-mvvm/summary` |
| Spec rules | `skill-hub://spec/{name}/rules` | `skill-hub://spec/react-mvvm/rules` |
| Spec full | `skill-hub://spec/{name}/full` | `skill-hub://spec/react-mvvm/full` |
| Spec 驗證層（Lint） | `skill-hub://spec/{name}/lint/{filename}` | `skill-hub://spec/react-mvvm/lint/eslintrc.json` |

Server 從檔案系統讀取對應 Markdown / JSON / Lint 設定檔後，以純文字回傳給 AI。每個 Spec 的驗證層檔案數量不固定（0 至多個），由 `resources.ts` 的對照表決定要註冊哪些檔案。

### 9.3 Hook 整合（Client 端）

驗證層的實際執行發生在 Client 端（如 Claude Code），透過兩種 Hook 達成不同目的：

**`PostToolUse` Hook（驗證層，事後檢查）**：攔截 `Edit` / `Write` 工具呼叫，依檔案副檔名判斷對應 Spec，執行該 Spec 即時軌的 Lint（見 7.5 分級雙軌），違規時以 exit code 2 回饋給 AI。**腳本必須區分「規則違規」與「工具執行失敗」**（如 Lint 套件未安裝、指令找不到）——後者屬環境問題，不應以違規訊息呈現給 AI，否則 AI 會嘗試修正不存在的程式碼問題。

**`PreToolUse` Hook（Layer 1 強制注入，事前保證）**：解決 6.1 與 13.1 提到的「AI 自行判斷是否載入 Layer 1」失效風險。攔截 `Edit` / `Write` 工具呼叫前，由 Hook 直接讀取本機快取的 Layer 1 內容並無條件注入回上下文，不依賴 AI 對使用者語意的判斷。此機制將「是否載入原則」從語意判斷改為程式碼層級保證，與驗證層「機械式規則不依賴 AI 自律」是同一邏輯的延伸。詳見 13.7。

**節流設計**：為避免每次 Edit/Write 都重複注入 400 tokens，Hook 以 `session_id` 為單位設置標記檔（存於系統暫存目錄），同一 Session 內僅在第一次嘗試編輯程式碼檔案時阻擋並注入一次（exit code 2），AI 收到後重新嘗試該次編輯即可正常放行；同 Session 後續呼叫直接放行不重複注入。

MCP Skill Hub 在 `hooks/` 目錄提供範本：

| 檔案 | 用途 |
|------|------|
| `hooks/post-edit-lint.mjs` | `PostToolUse` 範本，讀取 stdin 的工具呼叫資訊，執行 TS/React 的 ESLint 即時軌檢查 |
| `hooks/pre-commit-lint.mjs` | Git pre-commit 範本（非 Claude Code Hook），執行 C#/.NET 的延遲軌檢查 |
| `hooks/pre-edit-principle.mjs` | `PreToolUse` 範本，以 Session 節流方式強制注入 Layer 1 內容 |
| `hooks/settings.example.json` | 消費端專案合併進 `.claude/settings.json` 的設定範例（含 PreToolUse / PostToolUse 兩組設定） |

此機制需消費端專案自行接線（設定環境變數指向 Skill Hub 路徑、安裝對應 Lint 工具），MCP Server 本身不主動執行驗證。

### 9.4 Prompt 實作規格

Layer 3 Skill 以 MCP Prompt 提供，命名規則如下：

| 資源 | Prompt 名稱格式 | 範例 |
|------|--------------|------|
| Skill | `skill/{name}` | `skill/code-review` |

Server 從檔案系統讀取對應 Skill Prompt 文件，以 MCP Prompt 格式回傳。Prompt 內容即為 8.5 定義的 Skill 結構（角色定義、執行步驟、輸出格式）。

### 9.5 部署方式

**本機模式（stdio）**
```json
// Claude Code mcp settings
{
  "mcpServers": {
    "skill-hub": {
      "command": "node",
      "args": ["path/to/skill-hub/dist/index.js"]
    }
  }
}
```

**團隊共用模式（HTTP/SSE，Stateful Streamable HTTP Transport）**

Server 端啟動（`MCP_TRANSPORT=http` 切換傳輸模式，`MCP_HTTP_PORT` 設定埠號，預設 3000）：

```bash
MCP_TRANSPORT=http MCP_HTTP_PORT=3000 node dist/index.js
```

```powershell
$env:MCP_TRANSPORT = "http"; $env:MCP_HTTP_PORT = "3000"; node dist/index.js
```

Client 端設定（單一 endpoint 同時處理 POST / GET / DELETE，不再是獨立的 `/sse` 路徑——這是 Streamable HTTP Transport 取代舊版獨立 SSE Transport 後的協議行為）：

```json
// Claude Code mcp settings
{
  "mcpServers": {
    "skill-hub": {
      "url": "http://team-server:3000/mcp"
    }
  }
}
```

**Session 管理**：採 Stateful 模式，每個 Client 連線於 `initialize` 時取得唯一 `Mcp-Session-Id`，後續請求須帶上此 Header；Session 無效或缺失時回傳 `400`，呼叫 `DELETE` 可主動終止 Session。每個 Session 各自擁有獨立的 `McpServer` 實例（見 `src/server-factory.ts`），多個 Client 之間互不干擾。已透過實際 HTTP 請求驗證 initialize、resources/list、resources/read、無效 Session 拒絕、Session 終止四種情境。

---

## 10. Token 消耗管理

### 10.1 各層 Token 預算限制

| 層級 | 檔案 | Token 上限 |
|------|------|-----------|
| Layer 0 | `manifest.json` | 150 |
| Layer 1 | `principle/code-style.md` | 200 |
| Layer 1 | `principle/oop-ddd.md` | 200 |
| Layer 1 | `principle/ai-collaboration.md` | 200 |
| Layer 2 | `spec/{name}/summary.md` | 60 |
| Layer 2 | `spec/{name}/rules.md` | 400 |
| Layer 2 | `spec/{name}/full-spec.md` | 2000 |
| Layer 3 | `skill/{name}` | 800 |

### 10.2 情境消耗預估

| 使用情境 | 載入內容 | 預估消耗 |
|---------|---------|---------|
| 待機（剛連線） | Manifest | ~150 tokens |
| 非開發任務 | Manifest | ~150 tokens |
| 一般開發 | Manifest + Layer 1 + Spec rules.md | ~950 tokens |
| Code Review | Manifest + Layer 1 + Spec full-spec.md + Skill | ~3,550 tokens |

> Layer 0 啟用 Prompt Caching，150 tokens 只計算一次。Layer 1 於開發情境下與 Layer 2 同步觸發，不單獨佔用額外 round-trip。

### 10.3 超出預算的處理策略

- **優先降級**：若 full-spec.md 不是必要，改載 rules.md；若 rules.md 不是必要，只載 summary.md
- **單次上限約束**：同時最多 1 個 Spec、1 個 Skill，由 Manifest instruction 與 Server 端共同約束
- **超出警示**：文件撰寫超過 Token 上限時，視為規格違規，需精簡內容而非調高上限
- **上限調整原則**：若某層確實有調高上限的必要，需在此章節更新並記錄原因

---

## 11. 版本控制與演進

### 11.1 版本號規則

採用語意化版本號（Semantic Versioning）：`MAJOR.MINOR.PATCH`

| 版號變動 | 適用情境 |
|---------|---------|
| MAJOR | 架構性異動，如層級結構調整、Manifest 格式變更 |
| MINOR | 新增 Spec 或 Skill |
| PATCH | 現有文件內容修正或補充 |

版本號記錄於 `manifest.json` 的 `version` 欄位，Server 啟動時對外揭露。

### 11.2 規範異動流程

所有知識文件（Principle、Spec、Skill）的異動需經過以下流程：

1. **提案**：說明異動原因與影響範圍
2. **審查**：確認未與 Layer 1 原則牴觸，Token 預算未超標
3. **合併**：通過審查後合併至主線，更新 `manifest.json` 版本號
4. **通知**：告知團隊成員 Server 已更新，必要時重新連線

### 11.3 向下相容策略

- **MINOR / PATCH 異動**：向下相容，成員不需調整設定
- **MAJOR 異動**：可能破壞現有行為，需協調團隊統一更新
- **Spec / Skill 移除**：移除前需確認無成員依賴，並在 Manifest 中保留至少一個版本週期的棄用標記

---

## 12. 實作路徑

### 12.1 Phase 1 — 知識層

**目標**：建立 MCP Server 基礎，提供 Manifest、Principle、Spec 的 Resource 服務。

- 建立 Node.js / TypeScript MCP Server 骨架
- 實作 Manifest Resource
- 撰寫 Layer 1 原則文件（code-style.md、oop-ddd.md）
- 撰寫至少一個 Spec 的三層粒度文件
- 支援 stdio 本機連線

**驗收標準**：AI 連線後能讀取 Manifest，並依提示正確載入 Principle 與 Spec 內容。

### 12.2 Phase 2 — 情境觸發層

**目標**：實作 Layer 3 Skill 的 Prompt 服務，完善所有 Spec。

- 實作 Skill Prompt（code-review、version-control）
- 補齊所有 Spec 文件
- 驗證 hint / trigger 關鍵字觸發行為
- 支援 HTTP/SSE 團隊共用模式

**驗收標準**：AI 能依對話情境自動載入對應 Spec，並在觸發關鍵字時啟用對應 Skill，產出符合格式的結果。

### 12.3 Phase 3 — 擴充與維運

**目標**：提升穩定性與可維護性，支援團隊長期使用。

- 建立 Server 端 Call Log，記錄資源載入行為
- 建立 Spec / Skill 新增的標準化流程與 Review 機制
- 建立 Spec 專屬的驗證層（Lint / Analyzer 設定檔），搭配 Client 端 Hook 機制自動檢查機械式規則（詳見 7.5、9.3）
- 評估 Tool 機制的必要性（如需 Server 端主動執行操作）

**驗收標準**：團隊成員可獨立新增 Spec 或 Skill，並通過格式與層級歸屬審查。

---

## 13. 已知挑戰與決策記錄

### 13.1 Context Detection 的執行者

**挑戰**：MCP Server 無法主動得知用戶當前編輯的檔案，無法做 Server 端情境偵測。AI 依賴語意判斷 hint 關鍵字是否命中，當使用者提問隱晦（不含任何 hint 字詞）時，AI 可能完全不觸發 Layer 1，導致在無原則基礎下給出建議——此失效模式長期未解，已於 13.7 提出解法。

**決策**：Context Detection 由 AI 自行判斷，或由用戶在對話中明確指定。Manifest 提供 `hint` 關鍵字作為 AI 判斷的參考依據，而非伺服器端自動觸發。針對 Edit / Write 等明確的開發行為，改用 13.7 的 Hook 強制注入機制作為保險。

### 13.2 Skill 卸載的語義定義

**挑戰**：MCP 機制本身沒有「卸載」的原生概念，Context 一旦注入就存在於對話中，無法真正從上下文移除已消耗的 Token。要求 AI「忘記」已載入的規則不僅無法回收 Token，反而可能因「Pink Elephant 效應」（被要求忘記的內容反而提高注意力權重）而加深干擾。

**決策**：「卸載」為語義層面的約定，由 AI 在任務結束時接收明確信號後，不再套用該 Skill 的行為指引。**不要求 AI 執行「忘記」動作**，改為在 Manifest `instruction` 中加入建議：任務結束後提示用戶開闢新對話以徹底清理上下文，由用戶透過實際重啟對話來解決 Token 殘留，而非依賴 AI 的語意層面處理。

### 13.3 規範內容品質維護

**挑戰**：MCP Server 只是載體，AI 套用規範的準確度完全取決於規範文件的撰寫品質。模糊或矛盾的規範會直接影響 AI 的輸出品質。

**決策**：規範文件需遵守格式規範（條列式、無段落、無範例於 rules.md），並透過 Review 流程維護品質。

### 13.4 多 Spec 同時適用的衝突處理

**挑戰**：某些任務可能同時涉及多個技術棧（如 API + React），理論上需要多個 Spec。

**決策**：維持單次最多載入 1 個 Spec 的硬性限制，由用戶或 AI 選擇最相關的 Spec。若確實需要多個，由用戶明確分段指定，不允許自動疊加。

### 13.5 Layer 1 與其他 MCP Server 的情境污染

**挑戰**：若 Layer 1 常駐注入，當同時連接多個 MCP Server 時（如股票分析 MCP），開發原則可能干擾非開發情境的回答。

**決策**：Layer 1 改為開發情境觸發載入，非開發任務不載入。Layer 0 Manifest 為唯一真正常駐層。

**註記（與 13.7 的取捨）**：曾考慮以「偵測工作目錄是否含 `.git`」取代語意判斷，但已否決——目錄含 `.git` 只能證明該目錄是專案，不能證明當前這句話是開發任務，使用者仍可能在程式碼專案目錄下詢問與開發無關的問題（如透過其他 MCP Server 查詢股票）。此方案會直接牴觸本節的決策，故 13.7 改採以「工具呼叫」而非「目錄特徵」作為觸發依據。

### 13.6 驗證層設定檔的執行風險（RCE）

**挑戰**：驗證層設定檔原採用 `.eslintrc.cjs`（可執行 JavaScript）格式，目的是在規則旁加註解標明來源。若未來 Server 改為 HTTP/SSE 團隊共用模式（Task 10），一旦 Server 遭篡改，Client 端 Hook 執行時會直接執行惡意程式碼，構成遠端代碼執行（RCE）風險。

**決策**：所有發布為 Resource 的驗證層設定檔，**格式限定為純資料（JSON / INI / 純文字），全面禁止可執行格式**。`.eslintrc.cjs` 改為 `.eslintrc.json`。`.editorconfig` 與 `BannedSymbols.txt` 原生就是純文字格式，不受影響。

**實作時的修正**：原計畫規則來源標註改用 JSON 內的 `_comment` 欄位，但 Task 18 實測發現 ESLint 對 legacy config 做嚴格 Schema 驗證，`_comment` 這類非標準頂層屬性會直接導致設定檔載入失敗（`ESLint configuration in --config is invalid`）。改為獨立的 `rules-source.json` 旁帶檔案承擔來源標註，不影響 `.eslintrc.json` 本身的合法性。另外發現 ESLint 9+ 已移除 legacy config CLI 支援，驗證層腳本改為透過 `npx eslint@8` 鎖定版本執行，避免被迫改用必須為 JS 格式的 Flat Config（重新引入 RCE 風險）。

### 13.7 Layer 1 觸發失效的補強機制

**挑戰**：13.1 提到的語意判斷失效風險（使用者提問隱晦、未命中 hint 關鍵字）長期無解。

**決策**：改用「工具呼叫」作為決定性觸發依據，而非「語意判斷」。透過 Client 端 `PreToolUse` Hook 攔截 `Edit` / `Write` 工具呼叫，**無條件**讀取本機快取的 Layer 1 內容並注入回上下文，不依賴 AI 自行判斷使用者是否在進行開發任務。此設計將 Layer 1 的載入時機從「語意層面的自由心證」改為「綁定明確動作的程式碼保證」，邏輯與驗證層（7.5）一致：機械式可判斷的條件不應依賴 AI 自律。

**節流設計**：「無條件注入」不代表「每次都注入」——若每次 Edit/Write 都重複附上 400 tokens 的 Layer 1 內容，長對話下的累積成本會過高，且與 13.8 的 Token 殘留問題相互疊加。改為以 `session_id` 節流：同一 Session 內第一次對程式碼檔案執行 Edit/Write 時阻擋並注入（exit code 2），AI 重新嘗試該次編輯即可放行；同 Session 後續呼叫因標記檔案已存在而直接放行，不重複注入。已於 Task 17 實作並完成多情境測試（新 Session 注入、同 Session 不重複注入、不同 Session 各自獨立、非程式碼檔案放行）。範本見 9.3 的 `hooks/pre-edit-principle.mjs`。

### 13.8 Token 殘留的長對話累積問題

**挑戰**：見 13.2 的 Pink Elephant 效應——長對話中持續累積已「卸載」但實際仍留在上下文中的規則內容，可能干擾後續任務。

**決策**：不在協議層面尋求解法（無法做到），改為操作建議：Manifest `instruction` 加入提示文字，建議單一任務使用單一短期對話，任務結束後另開新對話，以實際重置上下文取代語意層面的卸載。

### 13.9 web-api-NET / NET-SDK 的 Repository 共用設計

**挑戰**：原設計讓 `ISampleRepository` 直接回傳 Domain Entity（`Sample`），Server 與 Client 共用同一介面與同一 Domain 類別定義。此設計確保兩端結構一致、減少重複定義，但違反 DDD 的 Bounded Context 原則——Client 端被迫得知 Server 端的 Domain 實體結構，形成不必要的耦合。

**決策**：採用 Contracts 分層設計。新增共用的 `MCP.Contracts` 專案，內含 Repository 介面與純資料 DTO（不含任何 Domain 邏輯或 ORM 屬性）；Server 端的 Domain Entity 維持獨立定義，由 Repository 實作內部以 Mapper（如 Mapster / AutoMapper）轉換為 DTO 後回傳；Client 端的 NET-SDK 僅依賴 DTO，完全不知道 Server 端是否使用資料庫、用何種 ORM。已於 Task 19 完成 `web-api-NET` 與 `NET-SDK` 兩份 Spec 的內容修改。

### 13.10 情境觸發驗收的範圍限制

**挑戰**：Task 11 原定「驗收情境觸發與 Skill 執行行為」，但 AI 對 hint / trigger 關鍵字的語意判斷，無法在不具備實際連線 MCP Client 的情況下重現——這需要一個真正連線到本 Server 的 Session，觀察 AI 收到使用者訊息後是否真的主動呼叫對應 Resource，純文字討論無法模擬此行為。

**決策**：拆分為兩層驗收，不強求一次到位：
1. **機械式 Hint 覆蓋率稽核**（已完成，`test/verify-hints.mjs`）：以代表性提問模擬字串比對，檢查 hint/trigger 關鍵字設計本身是否合理。此次稽核發現並修正兩個真實問題：`web-api-NET` / `NET-SDK` 的 hint 未涵蓋 Task 19 新增的 `Repository`、`DTO` 核心概念（已補上）；`NET-SDK` 原有的 `"Client"` 關鍵字過於泛用，會被「the client wants...」這類業務語境誤判（已移除，改用更明確的 `Repository`、`DTO`、`MCP.Contracts`）。
2. **真實 AI 語意判斷行為**：需團隊實際建立 `.mcp.json` 將本 Server 接入一個 Claude Code Session 才能驗收，此次討論階段未建立（避免未經確認就變更專案層級設定），留待團隊實際接線時驗證。

**限制揭露**：機械式字串比對 ≠ AI 語意判斷，前者只能抓出「關鍵字設計明顯不合理」的問題（如遺漏、過於泛用），無法驗證 AI 是否在真實對話中確實做出预期的载入決策。

---

## 14. 目錄結構

```
mcp-skill-hub/
├── manifest.json                  # Layer 0 — 全目錄索引
├── principle/                     # Layer 1 — 原則層
│   ├── code-style.md
│   ├── oop-ddd.md
│   └── ai-collaboration.md        # AI 工作行為原則（Rule 1-5, 7-12，排除 Token 預算）
├── spec/                          # Layer 2 — 規範層
│   ├── react-mvvm/
│   │   ├── summary.md
│   │   ├── rules.md
│   │   ├── full-spec.md
│   │   └── lint/
│   │       ├── .eslintrc.json     # 驗證層 — ESLint 設定（純 JSON，禁可執行格式）
│   │       └── rules-source.json  # 規則來源標註（旁帶檔案，不被 ESLint 載入）
│   ├── wpf-mvvm/
│   │   ├── summary.md
│   │   ├── rules.md
│   │   ├── full-spec.md
│   │   └── lint/
│   │       ├── .editorconfig                  # 驗證層 — 命名規範 + IDE 規則
│   │       └── ViewModels.BannedSymbols.txt    # 驗證層 — 禁用 API 清單
│   ├── web-api-NET/
│   │   ├── summary.md
│   │   ├── rules.md
│   │   └── full-spec.md
│   ├── NET-SDK/
│   │   ├── summary.md
│   │   ├── rules.md
│   │   └── full-spec.md
│   └── ui-token/
│       ├── summary.md
│       ├── rules.md
│       └── full-spec.md
├── skill/                         # Layer 3 — 技能層
│   ├── code-review.md
│   └── version-control.md
├── hooks/                         # Client 端 Hook 範本
│   ├── pre-edit-principle.mjs     # PreToolUse Hook — Session 節流注入 Layer 1
│   ├── post-edit-lint.mjs         # PostToolUse Hook — TS/React 即時軌驗證層
│   ├── pre-commit-lint.mjs        # Git pre-commit 範本 — C#/.NET 延遲軌驗證層
│   └── settings.example.json      # Claude Code settings.json 範例（PreToolUse + PostToolUse）
├── test/                          # Resource 服務與 Hook 腳本驗收
│   ├── verify-resources.mjs
│   ├── verify-hints.mjs           # manifest.json hint/trigger 機械式覆蓋率稽核
│   └── fixtures/                  # Hook 端到端測試樣本（違規/乾淨範例、模擬 stdin 輸入）
└── src/                           # MCP Server 原始碼
    ├── index.ts                   # 進入點，依 MCP_TRANSPORT 切換 stdio / http
    ├── server-factory.ts          # createServer()：每個連線獨立的 McpServer 實例
    ├── http.ts                    # Stateful Streamable HTTP Transport 實作
    ├── resources.ts               # Resource 服務實作（含驗證層 Resource）
    └── prompts.ts                 # Prompt 服務實作
```

*本文件為正式規格稿，內容依討論結果持續更新。*
