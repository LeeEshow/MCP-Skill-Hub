# Layer 2 Rules — web-api-NET Spec

- Domain Entity 必須定義於 Server 端專案內部（如 `WebApi/Domain/`），繼承 `Model<T>`（CRTP），嚴禁定義於 `MCP.Contracts` 共用專案或暴露給 Client 端引用。
- `BaseModel` 定義 `Id`、`Name`、`Class` 三個抽象屬性，`Class` 唯讀且回傳 `GetType().FullName` 作為 TPT 型別識別碼。
- `Model<T>` 僅允許持有 `ObjectType` 屬性與抽象屬性宣告，嚴禁在 `Model<T>` 或其子類別中包含任何資料存取方法（Find / Register / Update 等）。
- `ObjectType` 必須設計為 Immutable Value Object，所有屬性限用建構函式注入且唯讀（`{ get; }`），嚴禁公開 setter。
- Repository 介面（`IXxxRepository`）必須宣告於獨立的 `MCP.Contracts` 專案，方法簽章的回傳型別與參數型別僅限 DTO，嚴禁出現 Domain Entity，介面方法全數宣告為 `async Task<T>`。
- DTO（如 `SampleDto`）必須為純 POCO，限用 `init` 唯讀屬性，嚴禁包含任何方法、ORM 屬性（如 `[Key]`）或 Domain 業務邏輯。
- Repository 實作（`SqlXxxRepository`）必須隔離於 WebApi 專案的 `Infrastructure/Repositories/` 層；查詢出 Domain Entity 後，必須透過 Mapper（手動轉換方法或 Mapster / AutoMapper）轉換為 DTO 才能回傳，嚴禁直接序列化 Domain Entity 對外回傳。
- Controller 職責僅限接收 HTTP Request、驗證 Request DTO、呼叫 Repository，並回傳包裝後的 `ApiResponse<T>`，嚴禁在 Controller 撰寫業務邏輯或資料查詢。
- 所有 API 操作統一使用 `POST` + JSON Body，查詢條件必須透過 Request DTO 傳遞，嚴禁使用 Query String 傳遞業務參數。
- 所有 Response 必須包裝於統一的 `ApiResponse<T>`（含 `Success`、`Data`、`ErrorMessage` 三個欄位）。
- HTTP 狀態碼規範：操作成功回傳 `200`，Request DTO 驗證失敗回傳 `400`，伺服器錯誤回傳 `500`，任何情況下 Response Body 均不得為空。
- DI 容器必須於 `Program.cs` 統一以 `AddScoped` 方式注入所有 Repository 介面與實作的對應關係。
- Request DTO 輸入驗證必須使用 Data Annotations（`[Required]`、`[MaxLength]` 等），嚴禁在 Controller 方法內以 `if` 手動驗證輸入欄位。
- Swagger UI 僅限在 `Development` 環境啟用（`app.Environment.IsDevelopment()`），生產環境必須停用。
- 所有 Controller Action 與公開 Request / Response DTO 必須撰寫 XML 文件備註（`/// <summary>`），確保 Swagger 自動產生 API 說明。
- Controller 類別必須標記 `[Produces("application/json")]`，所有 Action 必須以 `[ProducesResponseType]` 明確宣告每個 HTTP 狀態碼對應的 Response 型別。
- WebApi 專案必須在 `.csproj` 啟用 `<GenerateDocumentationFile>true</GenerateDocumentationFile>`，並於 Swagger 設定中引入 XML 備註檔案。
