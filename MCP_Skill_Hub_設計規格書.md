# MCP Skill Hub — 設計規格書

> 狀態：Skill-Hub-NET8 已上線使用中（IIS 部署於 `D:\IIS\Skill-Hub`，Claude Code 每日呼叫中，Call Log 有連續使用紀錄）
> 最後更新：2026-10-07（規範精簡與代號機制，見 5.1；知識檔原始碼已更新，尚未重新部署到 IIS）
>
> **文件沿革**：本文件整合並取代三份舊文件——`MCP_Skill_Hub_概念設計文件.md`（v0.1 概念稿）、`MCP_Skill_Hub_設計規格書.md`（v1，Resource/Prompt 架構，已刪除）、`MCP_Skill_Hub_設計規格書_v2_Tool化.md`（v2，規劃 `Dev-Core-Hub` Node/TS Tool 架構，已刪除）。三份文件的架構討論與決策紀錄已濃縮併入本文，不再各自保留、也不再區分 v1/v2——**本文件只描述現況**。
>
> 實際專案技術棧與規劃階段（Node.js/TypeScript）不同，改用 **.NET 8**，專案資料夾為 `Skill-Hub-NET8/`（MCP Server 名稱仍叫 `dev-core-hub`）。所有程式碼範例與部署細節皆以此為準。
>
> 尚未完成的工作項目不寫在本文件，見 `Task.md`。

---

## 1. 背景與目標

### 1.1 問題描述

當團隊導入 AI 輔助開發後，每位開發者與 AI 的互動各自為政，導致：

- 同一個設計問題，不同人問 AI 會得到不同方向的解答
- 模組化、責任分離、OOP、DDD 等核心觀念無法統一傳遞給 AI
- 團隊的 Code Style 規範需每人重複設定，AI 仍可能給出不符規範的建議

根本原因在於：AI 在每一次對話都從零開始，沒有「團隊記憶」。MCP Server 本質上是在替 AI 做入職訓練，讓它從第一句話起就知道這個團隊的行為準則。

### 1.2 目標

建立一個集中式 MCP Server，作為團隊的「AI 開發知識庫」，使所有成員在使用 AI 輔助開發時，AI 能夠：

- 以統一的核心設計觀念（模組化、責任分離、OOP/DDD）為基礎進行建議
- 遵循統一的 Code Style 與技能標準（如 Code Review 方式、版控規範）
- 依據當前任務情境自主呼叫對應的技術規範，而非由開發者手動說明

### 1.3 適用範圍

- **適用對象**：所有使用 AI 輔助開發的團隊成員
- **適用時機**：任何透過 AI 進行程式設計、審查、重構的開發活動
- **不受限於**：特定程式語言或技術棧（Layer 1 為語言無關的通用設計準則）

### 1.4 非目標（Non-Goals）

- 不替代人工進行架構決策
- 不強制限定技術選型或框架選擇
- 不追求規範越多越嚴謹：規範只規定核心設計思想與 coding 方式，不限定唯一做法（見 5.1）

---

## 2. 名詞定義

| 名詞 | 定義 |
|------|------|
| MCP（Model Context Protocol） | 標準化協議，讓 AI 能夠存取外部的工具、資源 |
| MCP Server | 依 MCP 協議提供 Tool / Resource 的服務端，本專案即 `Skill-Hub-NET8`（Server 名稱 `dev-core-hub`） |
| Tool | MCP 機制之一，提供可執行操作；Claude Code、Claude Desktop 皆讓 AI 依 Tool 的 `description` **自主判斷**是否呼叫，不需使用者手動操作 |
| Tool Description | Tool 註冊時提供的自然語言描述，是 AI 判斷「何時該呼叫」的唯一依據 |
| Resource | MCP 機制之一，提供靜態文件內容；多數 Client（含 Claude Desktop）只能由**使用者手動**插入，AI 無法自主讀取 |
| Principle（原則） | 語言無關的通用設計準則，透過 `get_layer1_principles` 服務 |
| Spec（規範） | 技術棧對應的開發規範，透過 `get_spec(name, tier)` 服務，同時最多聚焦 1 個技術棧 |
| Skill（技能） | 標準化任務的執行指引（Code Review、版控），透過 `get_skill(name)` 服務 |
| 知識層 | Layer 1～3 的統稱，內容由 AI 語意判斷是否呼叫，走 Tool 機制 |
| 驗證層 | Lint / Analyzer 設定檔（`.eslintrc.json`、`.editorconfig`、BannedSymbols 等），供 Hook／IDE 腳本做決定性讀取，走 Resource 機制（**規格已定，Skill-Hub-NET8 尚未接上服務**，見 8 章） |
| Call Log | Server 端記錄每次 Tool／Resource 呼叫的稽核紀錄，見 7.3 |

---

## 3. 整體架構：雙軌服務模型

```
Skill-Hub-NET8
│
├── 知識層 Tool（AI 自主判斷呼叫，MCP tools/list 原生提供索引）
│   ├── get_layer1_principles()   ← 團隊通用原則（Code Style / OOP-DDD / AI 協作行為）
│   ├── get_spec(name, tier)      ← 技術棧規範（5 個技術棧 × rules/full 兩階）
│   └── get_skill(name)           ← 任務型行為指引（code-review / version-control）
│
└── 驗證層 Resource（Hook / IDE 決定性讀取，不經 AI 判斷）
    └── spec/{name}/lint/{file}   ← 規格已定，尚未接上服務（見 8 章）
```

**沒有獨立的 Manifest 檔案**：Tool 清單本身就是索引，`tools/list` 協議機制原生提供發現能力，AI 依各 Tool 的 `description` 直接判斷，不需要「先讀索引、再決定讀什麼」的額外往返。

### 3.1 為什麼知識層用 Tool、不用 Resource / Prompt

這是本專案最核心的架構決策，源自實測發現：

| MCP 機制 | Claude Desktop 對應 UI | AI 能否自主呼叫 |
|---------|----------------------|----------------|
| **Tool** | Connector 選單裡的開關 | ✅ 能，AI 依 `description` 自主判斷 |
| **Resource / Prompt** | 「Add from {server}」手動插入選單 | ❌ 不能，僅使用者手動操作 |

最早的原型（Resource/Prompt 架構）在 Claude Code 上運作正常，但在 Claude Desktop 上完全退化成「使用者手動選擇要載入的文件」——等同退回問題描述（1.1）的原始痛點。這不是 Bug，是 MCP 協議規格本身的合法行為：Resource/Prompt 在協議定義上偏向「使用者可瀏覽選擇的內容」，只有 Tool 被各 Client 一致實作為「AI 可自主呼叫」。修補 hint 關鍵字或索引內容都無法解決，必須換掉服務機制本身，因此改為現在的 Tool 化設計。

驗證層維持 Resource 不變，理由相反：驗證內容的消費者是 Hook／IDE 腳本的**決定性讀取**，不是 AI 的語意判斷，Tool 化沒有意義。**判斷標準**：消費者是 AI 的語意判斷 → Tool；消費者是腳本的決定性讀取 → Resource。

### 3.2 Tool 呼叫觸發率的教訓

上線初期實測發現，AI 對**模糊或籠統的陳述**（如「這樣寫可以嗎」「幫我看一下」）大多不會主動呼叫 Tool，除非使用者明確提到「dev-core-hub」等關鍵字。原因是 Tool description 只在 AI 已經考慮呼叫某個特定 Tool 時才會被讀到，陳述模糊籠統時 AI 可能根本不會走到「考慮呼叫哪個 Tool」這一步。

**修正做法（目前生效中）**：
1. 三個 Tool 的 description 全面改寫為「強制規則」語氣（「就必須先呼叫」，不用「應該」「建議」），明確列舉「即使描述模糊籠統也視為觸發條件」，並禁止「跳過此步驟、只憑自身知識回答」。
2. 額外使用 MCP 協定的 Server 層級 `ServerInstructions` 欄位（`Program.cs`）：這段文字隨 `initialize` 回應送出，**連線後立即生效，不需 AI 先考慮呼叫哪個 Tool**，解決了「模糊陳述時根本不會觸發」的根本限制。

這兩處文字皆刻意維持強制語氣，但**不**在 Tool 回傳內容裡插入偽造的 `[SYSTEM INSTRUCTION]` 標頭——那種寫法與 Prompt Injection 手法相同，現代模型訓練會對資料內容中冒充系統權威的文字保持警覺，不安全也不可靠。真正的強制力最終仍要靠驗證層（IDE/CI/Hook），Tool Output 文字只能提高 AI 自律的機率，不能保證。

---

## 4. 知識層 Tool 規格

三個 Tool 皆已實作於 `Skill-Hub-NET8/Tools/KnowledgeTools.cs`，皆已上線且每日被實際呼叫。

### 4.1 `get_layer1_principles()`

合併三份 Layer 1 文件（`principle/code-style.md`、`principle/oop-ddd.md`、`principle/ai-collaboration.md`）為單一回傳內容。三者在觸發時機本來就完全同步，分開服務沒有實益；且過多 Tool 會稀釋 AI 工具選擇的準確度。

### 4.2 `get_spec(name, tier)`

```
name（必填）：react-mvvm | wpf-mvvm | web-api-NET | NET-SDK | ui-token
tier（預設 rules）：rules（日常開發規則）| full（Code Review 完整範例與反例）
```

- **無 `summary` 層級**：Tool 模式下 AI 在呼叫前就已透過 `description` 判斷相關性，不需要像 Resource 模式那樣先讀一份輕量文件做二次確認。`spec/*/summary.md` 檔案本身不刪，但沒有 Tool 服務它。
- **合法值驗證**：`name`／`tier` 目前以字串比對＋拋出 `ArgumentException` 的方式在 C# 端驗證，`description` 文字裡列出所有合法值供 AI 參考（原規劃是用真正的 JSON Schema `enum` 讓合法值直接出現在 Tool Schema 中；.NET 版目前用 `[Description]` 文字描述達到同等的「AI 看得到所有選項」效果，未必等於 Schema 層級強制——可視為後續優化項目，不影響現行功能）。

### 4.3 `get_skill(name)`

```
name（必填）：code-review | version-control
```

取代原本規劃用 Prompt 服務 Skill 的做法——Prompt 在 Claude Desktop 上有跟 Resource 一樣「只能手動插入」的限制。Skill 內容（角色定義、執行步驟、輸出格式）不變，只是取得方式從「使用者選擇 Prompt 範本」變成「AI 自主呼叫後把內容當作後續執行指引」。

`code-review` 在未指定審查範圍時，由主 Agent 讀取知識後派出三個平行 Agent（架構與規範合規、程式碼 Bug、重複程式碼收斂），彙整去重後輸出單一報告；審查前先查看專案文件與程式碼備註是否說明了偏離，已說明者不報，核心條文違規且無說明者照報。

---

## 5. 知識內容撰寫規範（硬性格式要求）

| 檔案 | 用途 | Token 上限 | 格式限制 |
|------|------|-----------|---------|
| `principle/*.md` | 語言無關通用原則，3 份 | 各 600 | 結構化條列式，允許小標題與粗體，禁止段落、禁止範例 |
| `spec/{name}/rules.md` | 技術棧日常開發規則 | 1300 | 同上 |
| `spec/{name}/full-spec.md` | Code Review 用完整規範 | 2000 | 說明每條的意圖、原因與合格／不合格界線；`web-api-NET`、`ui-token` 已不含程式碼範例，其餘三份尚未檢視 |
| `skill/{name}.md` | 任務型行為指令 | 800 | 角色定義＋執行步驟＋輸出格式 |
| `spec/{name}/summary.md` | 歷史遺留，Tool 化後無消費者 | 60 | 不再需要新寫，舊檔案可保留但不用維護 |

寫超過上限視為規格違規，要精簡內容，不是調高上限。

> `principle` 與 `rules.md` 上限於 2026-08-18 重新校準：原 200 / 400 上限對單一語言無關原則、或單一完整技術棧規則集而言過於嚴苛，實際內容（尤其 web-api-NET / wpf-mvvm 這類規則條目較多的技術棧）長期穩定超標，代表舊上限低估了「日常開發規則」應有的資訊量，而非內容本身需要精簡。新上限仍是硬上限——未來新增規則若使檔案超過新上限，一樣先嘗試精簡表達，精簡後仍超過才可再次調高上限（並在此處留下調整紀錄），不可無記錄地放寬。

判斷新規則該放 Layer 1 還是 Layer 2：換了技術棧仍然成立 → Layer 1；技術棧專屬 → Layer 2，且不得與 Layer 1 重複定義。

### 5.1 規範撰寫原則（2026-10-07）

- **寫意圖，不寫唯一手段**：規範說明要達成什麼，手段由專案自選；同一類專案（Domain 型、Gateway 型、整合型、BFF 等）都能在核心之內自由設計。
- **核心要少**：實測發現過度具體的規範會逼出多餘設計與大量偏離說明（兩個專案 PM 的回饋，其中對「SE 實際卡關」的判斷屬推論），因此將 `web-api-NET` 由 20 條精簡為 9 條、`ui-token` 由 12 條精簡為 4 條，Layer 1 亦同步精簡；特定架構做法（如 `Model<T>`／`BaseModel`）不再列為規範，目前也不放入範例。
- **條文代號與標籤**：每條有「領域前綴＋兩位數字」代號（`STY`／`OOP`／`AIC`／`API`／`SDK`／`WPF`／`RCT`／`UIT`）；未標＝核心，`[建議]`＝偏離無須說明，`[前提:…]`＝符合前提才適用。新增取該檔最大編號加一，不重用已刪除號碼，文件內不留墓碑。
- **偏離說明由專案自選**：核心條文的偏離須讓審查者查得到原因（`AIC-12`），位置與格式由專案決定，hub 不強制豁免表；規範未涵蓋的合理做法不視為偏離。
- **Layer 1 只放語言無關內容**：`#region`、`<summary>` 這類 C# 專屬規則已移到對應的 C# 規範（Layer 1 的判斷標準）。
- 套用範圍：目前只檢視 Layer 1、`web-api-NET`、`ui-token`；`react-mvvm`、`wpf-mvvm`、`NET-SDK` 待後續決定是否套用同一原則。

**新增 Spec** 流程：`spec/` 下建立資料夾 → 寫 `rules.md` → 寫 `full-spec.md` → 在 `Tools/KnowledgeTools.cs` 的 `ValidSpecNames` 加上名稱 → 更新 `get_spec` 的 `[Description]` 文字。

**新增 Skill** 流程：撰寫 `skill/{name}.md` → 在 `ValidSkillNames` 加上名稱 → 更新 `get_skill` 的 `[Description]` 文字。

---

## 6. 驗證層（Lint Resource）— 規格已定，尚未接上服務

**設計意圖**（維持不變）：

```
主防線（不分 Client，所有開發情境皆適用）
  MCP Server（驗證層設定檔的單一事實來源）
    → Setup Script 把設定拉下來，寫成獨立檔案
        → IDE 即時標紅（VS Code / Rider / Cursor，跟用哪個 AI 工具完全無關）
        → pre-commit-lint（Commit 前二次把關）

軟性備援（不分 Client）
  AI 自主呼叫 get_skill("code-review") 做自我審查
```

各 `spec/{name}/lint/` 下的設定檔本體（`.eslintrc.json`、`.editorconfig`、`*.BannedSymbols.txt`）**已複製**進 `Skill-Hub-NET8/spec/`，但：

- `Skill-Hub-NET8` 目前**沒有註冊任何 MCP Resource**，這些檔案無法透過協議被讀取
- 對應的 `pre-commit-lint` Hook 也**沒有搬進**這個專案
- Setup Script（從 Server 拉驗證層設定寫成獨立檔案）**未實作**

也就是說，目前實際生效的只有「知識層 Tool + IDE 靜態分析」，「驗證層 Resource → Setup Script → Hook」這條防線目前是空的。這是真正待補的落差，列在 `Task.md`。

---

## 7. Server 實作與部署現況

### 7.1 技術棧

- **.NET 8**，`ModelContextProtocol` + `ModelContextProtocol.AspNetCore`（NuGet，v2.0.0）
- 專案資料夾：`Skill-Hub-NET8/`

```
Skill-Hub-NET8/
├── Program.cs              # 進入點：MCP_TRANSPORT 切換 stdio / http，含 ServerInstructions
├── Tools/
│   └── KnowledgeTools.cs    # 3 個知識層 Tool
├── Services/
│   └── CallLogService.cs    # 呼叫紀錄
├── principle/*.md           # 語言無關通用原則（code-style / oop-ddd / ai-collaboration）
├── spec/{name}/{rules.md, full-spec.md, lint/...}
├── skill/*.md
├── web.config                # IIS ANCM 設定（out-of-process）
├── appsettings.json
└── SkillHubNet8.csproj
```

### 7.2 傳輸模式

`MCP_TRANSPORT` 環境變數切換：

- `stdio`（預設）：`Host.CreateApplicationBuilder` + `StdioServerTransport`，供 Claude Code CLI 直接啟動
- `http`：`WebApplication` + `WithHttpTransport()`，`app.MapMcp("/")`，供 IIS 代管

兩種模式下的日誌皆導向 stderr／console warning 以上層級，避免污染 stdio 的 JSON-RPC 通道。

### 7.3 Call Log

`CallLogService` 將每次 Tool 呼叫寫入 `logs/calls.jsonl`（`{timestamp, type, name}`）。部署於 `D:\IIS\Skill-Hub\logs\calls.jsonl` 的紀錄顯示自 2026-08-07 上線以來持續每日有真實呼叫，`get_layer1_principles`／`get_spec`／`get_skill` 皆有實際被呼叫的紀錄。

### 7.4 部署現況

- **方式**：Visual Studio Publish Profile（`FolderProfile.pubxml`，`FileSystem` 方式）發佈到 `D:\IIS\Skill-Hub`
- **IIS**：透過 ANCM（ASP.NET Core Module v2）out-of-process 代管，IIS 直接啟動並管理 Kestrel 程序，**不需要額外的 Task Scheduler 工作**（這點與早期規劃不同——早期規劃是沿用另一個舊專案的「Task Scheduler + ARR reverse proxy」方法論，實際採用 .NET 8 的 ANCM 機制後不再需要）
- **驗證方式**：目前僅有手動 JSON-RPC 測試（`test-input.txt` / `test-output.txt`），**沒有自動化驗收腳本**

---

## 8. 已知挑戰與決策記錄（精華）

以下為架構演進過程中，實測驗證後留下的關鍵結論，供日後修改架構前參考：

1. **Resource/Prompt 在 Claude Desktop 上無法自主觸發** → 促成整個 Tool 化改版（見 3.1）。已在 Claude Code（stdio）、Claude Desktop Chat、Claude Desktop Code 工作區三種介面實測驗證 Tool 化方案行為一致。
2. **Token 消耗不會因為 Tool 化而顯著下降**：Tool 清單（name + description + 參數結構）每次請求都會整個帶入，與舊架構常駐 Manifest 的成本性質相同，只是換位置承擔。**Tool 化真正的價值是「自動觸發能否正確運作」這個 0/1 問題，不是 Token 效率。**
3. **模糊陳述下 Tool 呼叫率不如預期**，靠強制語氣 description ＋ Server 層級 `ServerInstructions` 欄位修正（見 3.2）。Client 端是否確實把 `ServerInstructions` 餵進模型上下文，取決於各 Client 實作，效果需持續留意。
4. **拒絕在 Tool 回傳內容中插入偽造的系統權威標頭**（如 `[SYSTEM INSTRUCTION]`）：與 Prompt Injection 手法相同，不安全也不可靠；`ServerInstructions` 是協定正式定義的合法欄位，兩者性質不同，不衝突。
5. **驗證層與知識層分流的判斷標準**：消費者是 AI 的語意判斷 → Tool；消費者是腳本的決定性讀取 → Resource。這條界線在後續任何新增內容時都適用。
6. **規範寫意圖、核心要少**（2026-10-07）：多個專案實際引用後，過度具體的條文（特定分層、固定命名、固定狀態碼）讓非該類型的專案不是產生多餘設計，就是要額外說明偏離。決議改為意圖式、精簡核心、偏離說明由專案自選（見 5.1）。尚未實測精簡後的效果，部署後再評估。

---

*本文件取代 `MCP_Skill_Hub_概念設計文件.md`、`MCP_Skill_Hub_設計規格書.md`（v1）、`MCP_Skill_Hub_設計規格書_v2_Tool化.md`（v2），內容以 `Skill-Hub-NET8` 實際實作與部署現況為準。待辦事項見 `Task.md`。*
