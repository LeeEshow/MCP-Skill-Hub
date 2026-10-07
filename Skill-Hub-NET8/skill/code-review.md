# Skill — Code Review

## 路由判斷
- **使用者已指定審查範圍或方向** → 單 Agent 模式，直接進入「單 Agent 流程」。
- **使用者未指定範圍** → Orchestrator 模式，派出三個平行 Agent。

---

## 共同前置：偏離說明與前提（兩種模式皆適用）

1. **查找偏離說明**：查看被審查檔案所屬專案的文件（如 CLAUDE.md、設計文件）及程式碼備註是否說明了偏離 Hub 規範的做法；格式不限，找不到視為「未見偏離說明」。
2. **條文代號與標籤**：規則以 `rules` 版的代號與標籤為準，`full` 版說明每條的意圖與合格界線。未標＝核心；`[建議]` 偏離不需說明，僅列為 Suggestion；`[前提:…]` 先判斷專案是否符合前提，不符合者不套用。
3. **意圖優先**：手段不同但已達成條文意圖者視為合格，不報違規；規範未涵蓋的合理做法不視為違規。
4. **已說明偏離**：專案已說明原因的偏離，列為「已知偏離，不報」，僅於摘要註記筆數。
5. **未說明偏離**：核心條文的違規找不到任何偏離說明時照常回報，並標註「未見偏離說明」。
6. 報告中「違反規則」欄必須帶條文代號（如 `API-11`）。

---

## Orchestrator 模式（無指定範圍）

### Phase 1：準備知識上下文
1. 識別技術棧，選擇對應 Spec：
   - `react-mvvm` (.tsx / useState / useEffect / React 元件)
   - `wpf-mvvm` (INotifyPropertyChanged / ICommand / XAML / WPF)
   - `web-api-NET` ([ApiController] / [HttpPost] / IRepository / ASP.NET)
   - `NET-SDK` (HttpClient / IHttpClientFactory / SDK / NuGet)
   - `ui-token` (--color- / tokens.css / CSS 變數)
   - 無對應特徵：僅使用 Layer 1
2. 呼叫工具讀取以下資源（讀一次，內容將傳入所有 Sub-agent）：
   - Layer 1：`get_layer1_principles`
   - Layer 2：`get_spec(name, tier="rules")`（代號與標籤）與 `get_spec(name, tier="full")`（範例），若有對應 Spec

### Phase 2：派出三個平行 Agent
同時啟動以下三個 Agent，每個 Agent 的 prompt 須包含：**程式碼內容 + 已讀取的 Principle/Spec 全文 + 各自的審查焦點 + 輸出格式說明**。Sub-agent 不需再次呼叫 MCP 工具。

**Agent A — spec-reviewer（架構／Spec 合規）**
審查焦點：
- 比對 Layer 1 原則（命名、魔術數字、無廢棄程式碼、註解只寫為什麼、職責單一與依賴方向）；`[建議]` 條文（如方法長度、參數數量）僅列為 Suggestion，不報違規
- 比對 Layer 2 Spec 的核心條文與其意圖；手段不同但已達成意圖者視為合格
- 識別違反設計原則的架構問題

**Agent B — bug-hunter（程式碼 Bug）**
審查焦點：
- 邏輯錯誤與不正確的流程分支
- 邊界條件處理（null、空集合、負數、極大值）
- 例外處理缺漏或過度吞例外（空 catch block）
- 非同步錯誤（async/await 誤用、未 await、競態條件）
- 潛在的 Runtime 錯誤

**Agent C — convergence（程式碼收斂）**
審查焦點：
- 重複邏輯區塊（3 次以上重複即應考慮抽離）
- 應抽為共用 Class / Model / Component / 擴充方法的機會
- 硬編碼重複字串或數值應提取為命名常數
- 過度耦合導致無法重複使用的結構

判斷標準：
- 完全相同邏輯出現 ≥ 3 次 → 🟡 Warning，必須抽離
- 完全相同邏輯出現 2 次 → 🔵 Suggestion，視情境評估
- 高度相似但非完全相同的邏輯出現 ≥ 3 次 → 🔵 Suggestion，評估能否以泛型或策略模式統一
- 重複出現的硬編碼字串或數值 → 🟡 Warning，提取為命名常數
- 過度耦合導致跨模組無法重複使用 → 🔴 Critical

**不應強制收斂的情況（排除誤判）：**
- 僅出現 2 次且情境差異大，未來可能各自演化 → 偶然相似，不強制
- 抽離後需大量 if / switch 處理差異，複雜度反而上升 → 不收斂
- 跨架構層強制共用，會破壞依賴方向或分層規範 → 不收斂

**抽離方式建議（依情境選擇）：**
- 純邏輯 → 靜態方法或擴充方法（Extension Method）
- 帶狀態或依賴注入 → 獨立 Service 或 Class
- UI 顯示邏輯 → 共用 Component 或 IValueConverter
- 資料結構重複 → 合併為共用 Model 或 DTO

### Phase 3：彙整報告
1. 合併三份報告的所有發現項目
2. **去重規則**：相同檔案 + 相同行號有多條 → 保留嚴重等級較高的那條
3. 依嚴重等級重新排序，不標示來源 Agent
4. 輸出統一格式報告（見下方「輸出格式」）

---

## 單 Agent 模式（已指定範圍）

### Step 1：識別技術棧與讀取資源
1. 分析技術棧，選擇對應 Layer 2 Spec（同 Orchestrator Phase 1）
2. 呼叫 `get_layer1_principles` + `get_spec(name, tier="rules")` + `get_spec(name, tier="full")`，並先執行「共同前置」

### Step 2：依指定範圍審查
對應使用者指定的面向，執行 Agent A / B / C 其中一個的審查焦點。

### Step 3：輸出報告（同格式）

---

## 輸出格式

### 🔴 Critical（必須修正）
> 影響架構正確性、安全性或產生 Runtime 錯誤的問題。
- **[{檔案名稱}:{行號}]** {問題描述}
  - 違反規則：{引用原則或規範原文}
  - 修正建議：{具體說明，**必須**提供修改後的程式碼範例}

### 🟡 Warning（應該修正）
> 違反團隊規範，影響可維護性或可讀性的問題。
- **[{檔案名稱}:{行號}]** {問題描述}
  - 違反規則：{引用原則或規範原文}
  - 修正建議：{具體說明}

### 🔵 Suggestion（建議改善）
> 不違反規範，但有更優雅寫法或收斂機會。
- **[{檔案名稱}:{行號}]** {改善說明}

### ✅ 審查通過項目
- {列出程式碼中符合規範的關鍵優良設計，予以肯定}

**總結**：🔴 Critical x {count} | 🟡 Warning x {count} | 🔵 Suggestion x {count}
**偏離**：已說明偏離 {count} 條（不報）| 未見說明 {count} 條

---

## 執行注意事項
- 若使用者尚未提供程式碼，請回應：「請提供要審查的程式碼，或指定檔案路徑。」
- 每個問題必須引用具體的規則原文，不得使用籠統詞彙。
