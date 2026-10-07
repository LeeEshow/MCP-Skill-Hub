# Layer 2 Rules — NET-SDK Spec

代號格式：未標＝核心（偏離須讓審查者查得到原因，見 AIC-12）；`[建議]`＝偏離無須說明；`[前提:…]`＝符合前提才適用。

- SDK-01 NET-SDK 必須引用 `MCP.Contracts` 專案，嚴禁引用 Server 端的 WebApi 專案、Domain Entity 或任何 Domain 邏輯定義。
- SDK-02 所有 Repository 實作（`HttpXxxRepository`）必須實作 `MCP.Contracts` 中對應的 `IXxxRepository` 介面，方法簽章僅處理 DTO，確保與 Server 端的 SQL 實作可互換。
- SDK-03 HttpClient 必須透過 `IHttpClientFactory` 注入，嚴禁在 Repository 類別內直接 `new HttpClient()`，避免 Socket 耗盡問題。
- SDK-04 API 呼叫的協定風格必須與 Server 端依 API-10 聲明者一致（預設 `POST` + `application/json` Body，嚴禁以 Query String 傳遞業務參數）。
- SDK-05 所有 HTTP 回應必須反序列化為 Server 端統一信封（API-11）；當成功語意為失敗或 HTTP 狀態碼非 `200` 時，必須統一拋出 `SdkException`，嚴禁回傳 `null` 或 `false` 掩蓋錯誤。
- SDK-06 SDK 必須提供 `AddNetSdk(baseUrl, token)` 擴充方法，讓 Client 端以一行完成 HttpClient 與所有 Repository 的 DI 注冊。
- SDK-07 HTTP 連線逾時必須設定預設值（30 秒），並允許透過 `AddNetSdk` 參數覆寫，嚴禁硬編碼於各 Repository 方法內。
- SDK-08 認證 Bearer Token 必須統一設定於 `HttpClient.DefaultRequestHeaders`，嚴禁在個別 Repository 方法內各自設定 `Authorization` Header。
- SDK-09 `SdkException` 必須包含 HTTP 狀態碼（`StatusCode`）與 Server 回傳的 `ErrorMessage`，以利 Client 端對錯誤分類處理。
- SDK-10 NET-SDK 嚴禁引用任何資料庫套件（如 `System.Data.SqlClient`、`MySql.Data`），確保 Client 端與 DB 層完全隔離。
- SDK-11 `[建議]` `#region` 只用來組織對外的公開職責邊界（CRUD 群、多介面實作邊界、事件處理器、內嵌 DTO/Struct）；禁止巢狀 region，不為單一方法建立 region，禁止以實作細節分組（如 Helpers、Private Methods）。
- SDK-12 Method `<summary>` 限一句話；Class / Interface `<summary>` 可延伸至 2–4 句並換行（設計決策、使用前提、不變式）；禁止重述實作細節或加入裝飾性橫幅。
