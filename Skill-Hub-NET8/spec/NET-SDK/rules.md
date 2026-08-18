# Layer 2 Rules — NET-SDK Spec

- NET-SDK 必須引用 `MCP.Contracts` 專案，嚴禁引用 Server 端的 WebApi 專案、Domain Entity 或任何 Domain 邏輯定義。
- 所有 Repository 實作（`HttpXxxRepository`）必須實作 `MCP.Contracts` 中對應的 `IXxxRepository` 介面，方法簽章僅處理 DTO，確保與 Server 端的 SQL 實作可互換。
- HttpClient 必須透過 `IHttpClientFactory` 注入，嚴禁在 Repository 類別內直接 `new HttpClient()`，避免 Socket 耗盡問題。
- 所有 API 呼叫必須使用 `POST` + `application/json` Body，與 web-api-NET Server 端規範保持一致，嚴禁使用 GET / Query String 傳遞業務參數。
- 所有 HTTP 回應必須反序列化為 `ApiResponse<T>`；當 `Success` 為 `false` 或 HTTP 狀態碼非 `200` 時，必須統一拋出 `SdkException`，嚴禁回傳 `null` 或 `false` 掩蓋錯誤。
- SDK 必須提供 `AddNetSdk(baseUrl, token)` 擴充方法，讓 Client 端以一行完成 HttpClient 與所有 Repository 的 DI 注冊。
- HTTP 連線逾時必須設定預設值（30 秒），並允許透過 `AddNetSdk` 參數覆寫，嚴禁硬編碼於各 Repository 方法內。
- 認證 Bearer Token 必須統一設定於 `HttpClient.DefaultRequestHeaders`，嚴禁在個別 Repository 方法內各自設定 `Authorization` Header。
- `SdkException` 必須包含 HTTP 狀態碼（`StatusCode`）與 Server 回傳的 `ErrorMessage`，以利 Client 端對錯誤分類處理。
- NET-SDK 嚴禁引用任何資料庫套件（如 `System.Data.SqlClient`、`MySql.Data`），確保 Client 端與 DB 層完全隔離。
- `#region` 只用來組織對外的公開職責邊界（CRUD 群、多介面實作邊界、事件處理器、內嵌 DTO/Struct）；禁止巢狀 region，不為單一方法建立 region，禁止以實作細節分組（如 Helpers、Private Methods）。
- XML `<summary>` 限一句話，描述成員的職責與存在理由，不描述內部運作方式；禁止裝飾性橫幅與橫線分隔符。
