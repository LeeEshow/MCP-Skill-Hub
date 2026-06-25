# Layer 1 Principle — OOP & Domain Design

- 每個類別與模組僅限單一職責（單一改變理由），且嚴格禁止跨層級的直接依賴。
- 核心業務邏輯必須完全內聚於 Domain 層，嚴禁洩漏至 UI 展示層或 Infrastructure 資料存取層。
- 模組與類別之間必須透過介面（Interface）進行依賴，嚴禁依賴具體實作，以確保具備獨立替換性。
- 嚴禁跨模組或從類別外部直接存取、修改其內部狀態，所有狀態變更必須透過該類別公開的方法執行。
- 具備多重屬性的複合資料型態（如金額與幣別、起訖時間）必須設計為唯讀（Immutable）物件。
- 依賴方向必須單向指向 Domain 核心：UI 與 Infrastructure 依賴 Domain，Domain 嚴禁匯入非 Domain 元件。
- 資料存取（Repository）的介面必須宣告於 Domain 層，其具體實作與資料庫框架必須隔離於 Infrastructure 層。
