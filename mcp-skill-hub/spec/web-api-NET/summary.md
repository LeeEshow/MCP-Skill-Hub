# web-api-NET Spec

適用於 ASP.NET Core Web API（.NET 8）專案開發。採用 Contracts 分層設計：Repository 介面與 DTO 定義於獨立的 `MCP.Contracts` 共用專案，Server 端 Domain Entity（BaseModel / Model<T> / ObjectType）獨立維護於 WebApi 專案內部，Repository 實作查詢出 Domain Entity 後透過 Mapper 轉換為 DTO 才回傳，確保 Client 端不耦合 Server 端的領域模型。規範 Controller 設計、統一 ApiResponse 格式、非同步操作，以及 Swagger UI 文件整合。
