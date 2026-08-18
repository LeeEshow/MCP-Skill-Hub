# Layer 2 Rules — React MVVM Spec

- View 層僅限 UI 展示與互動，嚴禁呼叫 API、執行業務計算或直接變更全域狀態。
- ViewModel 層必須以 Custom Hook 實作，專職管理 State、跨資料彙總與業務邏輯，嚴禁內聯 UI 樣式。
- Model 層專職 API 呼叫與 DTO 到 Domain 的資料轉換（轉換邏輯內聚於 model 內），嚴禁管理 React State。
- Types 層必須將後端 DTO（snake_case）與前端 Domain（camelCase）分開定義，兩者在型別與變數上嚴禁混用。
- 專案開發順序強制為：styles/（設計 Token） → components/（共用 UI） → layout/ → pages/（頁面組裝）。
- 頁面（pages/）只能組裝元件與綁定 ViewModel，嚴禁自行定義區域樣式或重複實作已有功能。
- 跨頁面重複使用達 2 次（含）以上之 UI 結構，必須抽離為 components/ 下的共用元件。
- 所有樣式（CSS/TS）必須引用系統 Token（var(--xxx) 或 theme.ts），全 codebase 嚴禁硬編碼顏色與尺寸數值。
- 嚴禁在 React Component（render 函式）內部定義子元件，避免重複 unmount/remount 造成效能問題。
- 每個源碼檔案僅限 export 一種類型實體（元件、Hook 或 Context 必須完全分檔存放）。
- 嚴禁在 render 執行期間寫入 Ref 並於同一次 render 路徑中讀取它（useLatest 模式的 Callback 讀取除外）。
- 在 useEffect 內部使用 setState 造成 Re-render 時，必須加上具名 eslint-disable 並撰寫註解說明架構理由。
- 表單或輸入框的重複緩衝邏輯（Draft State + useEffect 同步 + onBlur 提交）必須提取為共用 Hook。
- 面對多次觸發的非同步請求，必須實作防 Stale Response 機制（限用 Request ID 或 Cancelled Flag 模式）。
- API 錯誤技術細節僅限在 DEV 環境輸出 console.error；PROD 環境必須全面阻斷並轉換為使用者友善提示。
