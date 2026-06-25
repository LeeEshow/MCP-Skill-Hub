# Skill — Code Review

請以 MCP Skill Hub Code Review 模式審查程式碼。請遵循以下步驟執行：

## Step 1: 識別技術棧與讀取資源
1. 分析程式碼特徵，選擇一個最適合的 Layer 2 Spec：
   - `react-mvvm` (.tsx / useState / useEffect / React 元件)
   - `wpf-mvvm` (INotifyPropertyChanged / ICommand / XAML / WPF)
   - `web-api-NET` ([ApiController] / [HttpPost] / IRepository / ASP.NET)
   - `NET-SDK` (HttpClient / IHttpClientFactory / SDK / NuGet)
   - `ui-token` (--color- / tokens.css / CSS 變數)
   - 無對應特徵：僅執行 Layer 1 審查
2. **必須呼叫 `resources/read` 讀取以下資源**，嚴禁憑記憶盲目審查：
   - Layer 1 原則：`skill-hub://principle/code-style`、`skill-hub://principle/oop-ddd` 與 `skill-hub://principle/ai-collaboration`
   - Layer 2 規範（若有）：`skill-hub://spec/{spec-name}/full` (程式碼審查應使用 full-spec 以參考完整範例)

## Step 2: 進行雙層審查
1. **Layer 1 審查**：比對通用原則（命名、命名縮寫限制、長度限制 <= 30 行、參數限制 <= 4 且禁用布林參數、嵌套深度 <= 3、魔術數字限制、無殘留廢棄程式碼、備註不贅述邏輯）。
2. **Layer 2 審查**：比對已載入 Spec 中的具體開發規範。

## Step 3: 輸出審查報告
嚴格依照嚴重等級排序輸出，格式如下：

### 🔴 Critical（必須修正）
> 影響架構正確性、安全性或產生 Runtime 錯誤的問題。
- **[{檔案名稱}:{行號}]** {問題描述}
  - 違反規則：{引用原則或規範原文}
  - 修正建議：{具體說明，且**必須**提供修改後的程式碼範例}

### 🟡 Warning（應該修正）
> 違反團隊規範，影響可維護性或可讀性的問題。
- **[{檔案名稱}:{行號}]** {問題描述}
  - 違反規則：{引用原則或規範原文}
  - 修正建議：{具體說明}

### 🔵 Suggestion（建議改善）
> 不違反規範，但有更優雅寫法。
- **[{檔案名稱}:{行號}]** {改善說明}

### ✅ 審查通過項目
- {列出程式碼中符合規範的關鍵優良設計，予以肯定}

**總結**：🔴 Critical x {count} \| 🟡 Warning x {count} \| 🔵 Suggestion x {count}

---
## 執行注意事項
- 若使用者尚未提供程式碼，請回應：「請提供要審查的程式碼，或指定檔案路徑。」
- 每個問題必須引用具體的規則原文，不得使用籠統詞彙。
