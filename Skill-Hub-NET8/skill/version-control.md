# Skill — Version Control

請以 MCP Skill Hub Version Control 模式執行。依照使用者的需求，從以下任務中選擇並執行，不得省略對應的檢查步驟。

---

## 任務識別

根據使用者的描述判斷要執行的任務：

| 關鍵字 | 任務 |
|--------|------|
| commit、提交、送出 | → **任務 A：產生 Commit Message** |
| branch、分支、建立分支 | → **任務 B：分支命名建議** |
| PR、pull request、合併 | → **任務 C：PR 描述產生** |
| ci、cd、pipeline、流程 | → **任務 D：CI/CD 規範建議** |
| 無法判斷 | → 詢問使用者要執行哪個任務 |

---

## 任務 A：產生 Commit Message

### 執行步驟

1. 若使用者未提供 diff 或變更說明，詢問：「請提供 git diff 或說明這次變更的內容。」
2. 分析變更性質（從以下選一個最接近的類型）：

| 類型 | 適用情境 |
|------|---------|
| `feat` | 新增功能 |
| `fix` | 修正 Bug |
| `refactor` | 重構（不影響功能） |
| `style` | 排版、命名調整（不影響邏輯） |
| `test` | 新增或修改測試 |
| `docs` | 文件更新 |
| `chore` | 建置設定、依賴套件更新 |
| `perf` | 效能優化 |

3. 產生符合以下格式的 Commit Message：

```
{type}({scope}): {summary}

{body（說明「為什麼」而非「做了什麼」，選填）}
```

**格式規範：**
- Summary 限 72 字元以內，使用**繁體中文**
- Summary 以動詞開頭（新增、修正、重構、移除、更新）
- Scope 為受影響的模組或元件名稱（如 `auth`、`ProductViewModel`、`SampleController`）
- Body 說明「為何這樣改」，不重述 summary 已說明的內容
- 單一儲存庫含多端（前端／後端）時，scope 或標題前綴二擇一須能辨識所屬端或模組，規則由專案自訂並記錄於專案 CLAUDE.md；儲存庫根目錄的變更須使用能辨識為根目錄的 scope
- 文件類變更使用獨立的 `docs` commit，不與程式碼變更混在同一個 commit
- 多位 SE 共用同一工作目錄、由單一角色（如 PM）統一提交時，依後端／前端／文件分批 commit，每個 commit 僅含單一 scope 的變更，並以 `git commit -- 路徑` 只提交指定路徑，不得混入他人未完成的變更

**輸出範例：**
```
feat(ProductList): 新增低庫存警示篩選功能

依據業務需求，庫存低於 10 件時前端需自動標示警示，
篩選邏輯收斂於 ViewModel 避免 View 層直接判斷業務數值。
```

---

## 任務 B：分支命名建議

### 分支命名規範

```
{type}/{ticket-id}-{short-description}
```

| 類型 | 用途 |
|------|------|
| `feat/` | 新功能開發 |
| `fix/` | Bug 修正 |
| `refactor/` | 重構 |
| `hotfix/` | 緊急修正（直接從 main 分出） |
| `release/` | 版本發布準備 |
| `chore/` | 設定、依賴更新 |

**規則：**
- 全小寫，以 `-` 分隔單字
- 含 ticket ID（如 `PROJ-123`）便於追蹤
- Description 不超過 5 個英文單字

**輸出範例：**
```
feat/PROJ-42-product-low-stock-filter
fix/PROJ-87-login-token-expiry
hotfix/PROJ-99-payment-null-exception
```

若使用者提供需求描述，直接產生建議的分支名稱。

---

## 任務 C：PR 描述產生

### 執行步驟

1. 若使用者未提供資訊，詢問：「請說明這個 PR 做了什麼、為什麼要做、以及如何測試。」
2. 產生以下格式的 PR 描述：

```markdown
## 變更摘要
{1-3 條 bullet，說明這個 PR 改了什麼}

## 動機與背景
{說明為什麼要做這個改動，對應的業務需求或技術債}

## 變更範圍
- [ ] 新功能
- [ ] Bug 修正
- [ ] 重構
- [ ] 設定 / 依賴更新
- [ ] 文件更新

## 測試計畫
{說明如何驗證這個 PR 是正確的，包含測試案例或手動驗證步驟}

## 注意事項（選填）
{Breaking changes、需要同步更新的其他 repo、部署注意事項}
```

---

## 任務 D：CI/CD 規範建議

依照使用者描述的 pipeline 需求，提供以下方向的建議：

### 分支保護規則
- `main` / `master`：禁止直接 push，必須透過 PR 合併
- PR 合併前必須通過 CI 所有 Job
- 至少 1 位 Reviewer 核准

### CI Job 標準流程
```
1. Checkout
2. 安裝依賴（快取 node_modules / .nuget）
3. 型別檢查 / 編譯
4. Lint 檢查
5. 單元測試 + 覆蓋率報告（專案採替代驗收時，改為對應的 Lint／型別檢查）
6. Build Artifact
7. （CD）部署至對應環境
```

### 環境分層
| 分支 | 自動部署目標 |
|------|------------|
| `feat/*` / `fix/*` | 無自動部署 |
| `develop` | Dev 環境 |
| `release/*` | Staging 環境 |
| `main` | Production（需手動核准） |

---

## 執行注意事項

- 若使用者同時有多個需求（如「幫我寫 commit 並建議分支名稱」），依序執行任務 A → 任務 B。
- Commit Message 與 PR 描述一律使用**繁體中文**，分支名稱使用**英文**。
- 不得自行捏造變更內容，資訊不足時主動詢問。
