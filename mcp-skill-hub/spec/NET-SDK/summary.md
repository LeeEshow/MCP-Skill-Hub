# NET-SDK Spec

適用於引用 `MCP.Contracts` 的 .NET Client 端（WPF、Console、其他服務）。NET-SDK 實作 `MCP.Contracts` 中定義的 Repository 介面，以 HTTP POST 呼叫 web-api-NET Server 取代直接 DB 存取。Client 端僅依賴純資料 DTO，完全不知道 Server 端是否使用資料庫、採用何種 ORM 或 Domain Entity 結構，確保 Bounded Context 邊界純粹、Client/Server 解耦。
