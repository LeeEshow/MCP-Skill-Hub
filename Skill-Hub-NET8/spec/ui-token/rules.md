# Layer 2 Rules — ui-token Spec

- Token 必須分為兩層：Primitive（原始值）與 Semantic（語意別名）；元件嚴禁直接引用 Primitive Token，只能引用 Semantic Token。
- 所有設計數值（顏色、尺寸、字體、陰影、層級）必須定義為 CSS Custom Properties，統一集中於 `styles/tokens.css`，全 codebase 嚴禁在元件 CSS 或內聯樣式中硬編碼設計數值。
- Token 命名格式為 `--{類別}-{描述}-{修飾詞}`（如 `--color-primary-default`、`--spacing-md`、`--font-size-lg`），嚴禁使用無語意的數字流水號（如 `--color-1`、`--size-3`）。
- 顏色 Primitive Token 以色票命名（`--color-blue-500`），Semantic Token 以用途命名（`--color-primary`、`--color-danger`）；元件只能引用 Semantic Token。
- 間距系統必須以 4px 為基礎單位建立固定級距（`xs:4px`、`sm:8px`、`md:16px`、`lg:24px`、`xl:32px`、`2xl:48px`、`3xl:64px`），元件嚴禁使用非級距間距數值。
- 深色模式必須透過 `[data-theme="dark"]` 選擇器覆寫 Semantic Token，嚴禁在元件 CSS 內各自撰寫 `prefers-color-scheme` 或 dark class 判斷。
- 元件的 hover / active / disabled 狀態色必須透過對應 Semantic Token 表達（如 `--color-primary-hover`），嚴禁以 CSS `filter: brightness()` 或魔術色值調整互動狀態。
- 供圖表庫或內聯樣式使用的 Token 必須在 `styles/theme.ts` 提供 TypeScript 版本，且數值必須與 `tokens.css` 保持同步；嚴禁 `theme.ts` 與 `tokens.css` 各自維護不同數值。
- 字體大小必須使用 Token（`--font-size-sm`、`--font-size-md` 等），嚴禁在元件中硬編碼 `px` 字體大小或 `em`/`rem` 魔術數值。
- Z-index 必須透過 Token 統一管理層級（`--z-index-dropdown`、`--z-index-modal`、`--z-index-toast`），嚴禁在元件中直接使用魔術數字 z-index。
- 新增 Token 前必須確認無可複用的既有 Token，嚴禁建立語意重複的 Token（如同時存在 `--color-btn-main` 與 `--color-primary`）。
- 所有 Token 檔案必須透過 `styles/index.ts` 統一 export；元件嚴禁繞過 index.ts 直接 import `tokens.css` 或 `theme.ts`。
