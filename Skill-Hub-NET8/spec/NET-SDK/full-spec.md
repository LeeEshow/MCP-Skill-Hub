# NET-SDK 完整規範

## 專案結構

```
NET-SDK/
├── Exceptions/
│   └── SdkException.cs              ← 統一例外型別
├── Repositories/
│   └── HttpSampleRepository.cs      ← 實作 ISampleRepository（HTTP 版，僅處理 DTO）
├── Extensions/
│   └── ServiceCollectionExtensions.cs ← AddNetSdk() DI 擴充方法
└── NET-SDK.csproj                   ← 引用 MCP.Contracts，不得引用 WebApi 或任何 DB 套件
```

`ISampleRepository`、`SampleDto`、`ApiResponse<T>` 皆來自 `MCP.Contracts`（與 web-api-NET Spec 共用），此處不重複定義。

## SdkException

```csharp
// Exceptions/SdkException.cs
/// <summary>NET-SDK 統一例外，封裝 HTTP 狀態碼與 Server 錯誤訊息</summary>
public class SdkException : Exception
{
    public int StatusCode { get; }

    public SdkException(int statusCode, string message) : base(message)
    {
        StatusCode = statusCode;
    }
}
```

## HTTP Repository 實作

`ISampleRepository` 來自 `MCP.Contracts`，方法簽章僅用 `SampleDto`——這個實作**完全不需要知道 Server 端的 Domain Entity（`Sample`）長什麼樣子**，這正是 Contracts 分層帶來的解耦效果。

```csharp
// Repositories/HttpSampleRepository.cs
public class HttpSampleRepository : ISampleRepository
{
    private readonly HttpClient _httpClient;

    public HttpSampleRepository(IHttpClientFactory httpClientFactory)
    {
        _httpClient = httpClientFactory.CreateClient("NetSdk");
    }

    public async Task<SampleDto?> FindByIdAsync(string id)
    {
        return await PostAsync<SampleDto>("api/sample/find", new { Id = id });
    }

    public async Task<IReadOnlyList<SampleDto>> FindAllAsync()
    {
        var response = await PostAsync<List<SampleDto>>("api/sample/findAll", new { });
        return response ?? new List<SampleDto>();
    }

    public async Task<bool> RegisterAsync(SampleDto sample)
    {
        await PostAsync<bool>("api/sample/register", sample);
        return true; // SdkException 已在 PostAsync 中處理失敗情境
    }

    public async Task<bool> UpdateAsync(SampleDto sample)
    {
        await PostAsync<bool>("api/sample/update", sample);
        return true;
    }

    // ── 內部共用 HTTP 呼叫，統一處理回應與例外 ──────────────────────
    private async Task<T?> PostAsync<T>(string endpoint, object body)
    {
        var json    = JsonSerializer.Serialize(body);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var httpResponse = await _httpClient.PostAsync(endpoint, content);

        var responseBody = await httpResponse.Content.ReadAsStringAsync();
        var apiResponse  = JsonSerializer.Deserialize<ApiResponse<T>>(responseBody,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        if (!httpResponse.IsSuccessStatusCode || apiResponse?.Success != true)
        {
            throw new SdkException(
                (int)httpResponse.StatusCode,
                apiResponse?.ErrorMessage ?? "API 回應異常");
        }

        return apiResponse.Data;
    }
}
```

## DI 擴充方法

```csharp
// Extensions/ServiceCollectionExtensions.cs
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// 一行完成 NET-SDK 的 HttpClient 與所有 Repository DI 注冊
    /// </summary>
    /// <param name="baseUrl">Web API 根位址，例如 https://api.example.com/</param>
    /// <param name="token">Bearer Token（可為 null，稍後透過 SetToken 設定）</param>
    /// <param name="timeoutSeconds">連線逾時秒數，預設 30 秒</param>
    public static IServiceCollection AddNetSdk(
        this IServiceCollection services,
        string baseUrl,
        string token = null,
        int timeoutSeconds = 30)
    {
        services.AddHttpClient("NetSdk", client =>
        {
            client.BaseAddress = new Uri(baseUrl);
            client.Timeout     = TimeSpan.FromSeconds(timeoutSeconds);

            if (!string.IsNullOrEmpty(token))
            {
                client.DefaultRequestHeaders.Authorization =
                    new AuthenticationHeaderValue("Bearer", token);
            }
        });

        // 所有 Repository 統一於此注冊
        services.AddScoped<ISampleRepository, HttpSampleRepository>();

        return services;
    }
}
```

## Client 端使用範例（WPF / Program.cs）

```csharp
// WPF App.xaml.cs 或 Console Program.cs
var services = new ServiceCollection();

// ✅ 一行完成 SDK 注冊
services.AddNetSdk(
    baseUrl:        "https://api.example.com/",
    token:          "your-bearer-token",
    timeoutSeconds: 30);

var provider = services.BuildServiceProvider();

// ViewModel 或業務邏輯中使用
var sampleRepo = provider.GetRequiredService<ISampleRepository>();

try
{
    var sample = await sampleRepo.FindByIdAsync("P001"); // 回傳 SampleDto，不是 Domain Entity
    Console.WriteLine($"找到：{sample?.Name}");
}
catch (SdkException ex) when (ex.StatusCode == 401)
{
    Console.WriteLine("Token 已過期，請重新登入");
}
catch (SdkException ex)
{
    Console.WriteLine($"API 錯誤（{ex.StatusCode}）：{ex.Message}");
}
```

## 錯誤分類對照

| HTTP 狀態碼 | 情境 | Client 端建議處理 |
|------------|------|-----------------|
| 400 | 請求參數驗證失敗 | 顯示 `ex.Message`，提示使用者修正輸入 |
| 401 | Token 無效或過期 | 導向重新登入流程 |
| 500 | Server 內部錯誤 | 顯示通用錯誤訊息，記錄 log |

## .csproj 規範

```xml
<ItemGroup>
    <!-- ✅ 必須引用 MCP.Contracts，嚴禁引用 WebApi 專案 -->
    <ProjectReference Include="..\MCP.Contracts\MCP.Contracts.csproj" />

    <!-- ❌ 嚴禁：不得引用任何資料庫套件 -->
    <!-- <PackageReference Include="System.Data.SqlClient" /> -->
    <!-- <PackageReference Include="MySql.Data" /> -->
</ItemGroup>
```
