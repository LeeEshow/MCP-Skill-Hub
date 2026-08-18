# web-api-NET 完整規範

## 專案結構

```
Solution/
├── MCP.Contracts/                      ← 共用專案，Server 與 Client 都引用
│   ├── DTOs/
│   │   ├── SampleDto.cs               ← 純資料 DTO，無 ORM/Domain 邏輯
│   │   └── ApiResponse.cs             ← 統一回應包裝
│   └── Repositories/
│       └── ISampleRepository.cs       ← Repository 介面，方法簽章僅用 DTO
│
└── WebApi/                            ← ASP.NET Core Web API 專案
    ├── Domain/                        ← Domain Entity，僅 Server 端內部使用
    │   ├── BaseModel.cs
    │   ├── Model.cs
    │   └── Sample.cs
    ├── ValueObjects/
    │   └── ObjectType.cs
    ├── Mapping/
    │   └── SampleMappingExtensions.cs ← Domain Entity ↔ DTO 轉換
    ├── Controllers/
    │   └── SampleController.cs
    ├── DTOs/
    │   └── SampleRequest.cs           ← Web API 專屬的 Request DTO
    ├── Infrastructure/
    │   └── Repositories/
    │       └── SqlSampleRepository.cs ← SQL 實作，回傳 DTO
    └── Program.cs                     ← DI 注入 + Swagger 設定
```

**邊界原則**：`MCP.Contracts` 只能包含純資料結構與介面，嚴禁參考 WebApi 專案；`WebApi` 參考 `MCP.Contracts` 並實作介面。Domain Entity（`Sample`）只活在 `WebApi` 專案內部，永遠不會跨越 Repository 介面的邊界。

## MCP.Contracts（共用契約）

### DTO

```csharp
// MCP.Contracts/DTOs/SampleDto.cs
/// <summary>Sample 的傳輸契約，純資料結構，不含任何方法或 ORM 屬性</summary>
public class SampleDto
{
    public string Id { get; init; }
    public string Name { get; init; }
    public string TypeId { get; init; }
    public string TypeName { get; init; }
    public string Data { get; init; }
}
```

### Repository 介面

```csharp
// MCP.Contracts/Repositories/ISampleRepository.cs
/// <summary>
/// Sample 的資料存取契約。回傳型別與參數型別僅限 DTO，
/// 確保 Server（SQL 實作）與 Client（HTTP 實作）共用同一介面時，
/// Client 端完全不需要知道 Server 端的 Domain Entity 結構。
/// </summary>
public interface ISampleRepository
{
    Task<SampleDto?> FindByIdAsync(string id);
    Task<IReadOnlyList<SampleDto>> FindAllAsync();
    Task<bool> RegisterAsync(SampleDto sample);
    Task<bool> UpdateAsync(SampleDto sample);
}
```

### 統一回應包裝

```csharp
// MCP.Contracts/DTOs/ApiResponse.cs
/// <summary>統一 API 回應結構</summary>
public class ApiResponse<T>
{
    public bool Success { get; init; }
    public T Data { get; init; }
    public string ErrorMessage { get; init; }

    public static ApiResponse<T> Ok(T data) =>
        new() { Success = true, Data = data };

    public static ApiResponse<T> Fail(string message) =>
        new() { Success = false, ErrorMessage = message };
}
```

## WebApi（Server 端內部）

### Domain Entity（僅 Server 端使用，不暴露給 Client）

```csharp
// WebApi/Domain/BaseModel.cs
public abstract class BaseModel
{
    public abstract string Id { get; init; }
    public abstract string Name { get; init; }
    public string Class => GetType().FullName;
}

// WebApi/Domain/Model.cs
public abstract class Model<T> : BaseModel where T : Model<T>
{
    public ObjectType Type { get; init; }
}

// WebApi/ValueObjects/ObjectType.cs
public sealed class ObjectType
{
    public string Id { get; }
    public string Name { get; }
    public string Remark { get; }

    public ObjectType(string id, string name, string remark = null)
    {
        Id = id;
        Name = name;
        Remark = remark;
    }
}

// WebApi/Domain/Sample.cs
public class Sample : Model<Sample>
{
    public override string Id { get; init; }
    public override string Name { get; init; }
    public string Data { get; init; }

    // ✅ 業務驗證方法允許存在於 Domain，且嚴禁出現於 DTO
    public bool IsValid() => !string.IsNullOrEmpty(Id) && !string.IsNullOrEmpty(Name);
}
```

### Mapper（Domain Entity ↔ DTO）

```csharp
// WebApi/Mapping/SampleMappingExtensions.cs
/// <summary>
/// 手動轉換方法；規則數量增加、欄位映射複雜時可改用 Mapster 或 AutoMapper，
/// 但轉換邏輯必須留在 WebApi 專案內，嚴禁外洩至 MCP.Contracts。
/// </summary>
public static class SampleMappingExtensions
{
    public static SampleDto ToDto(this Sample entity) => new()
    {
        Id       = entity.Id,
        Name     = entity.Name,
        TypeId   = entity.Type?.Id,
        TypeName = entity.Type?.Name,
        Data     = entity.Data,
    };

    public static Sample ToDomain(this SampleDto dto) => new()
    {
        Id   = dto.Id,
        Name = dto.Name,
        Data = dto.Data,
        Type = new ObjectType(dto.TypeId, dto.TypeName),
    };
}
```

### Request DTO

```csharp
// WebApi/DTOs/SampleRequest.cs
public class FindSampleRequest
{
    [Required]
    [MaxLength(50)]
    public string Id { get; init; }
}

public class RegisterSampleRequest
{
    [Required]
    [MaxLength(50)]
    public string Id { get; init; }

    [Required]
    [MaxLength(200)]
    public string Name { get; init; }

    [Required]
    public string TypeId { get; init; }

    public string Data { get; init; }
}
```

### Controller

```csharp
// WebApi/Controllers/SampleController.cs
/// <summary>Sample 管理 API</summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class SampleController : ControllerBase
{
    private readonly ISampleRepository _repository;

    public SampleController(ISampleRepository repository)
    {
        _repository = repository;
    }

    /// <summary>依 ID 查詢 Sample</summary>
    [HttpPost("find")]
    [ProducesResponseType(typeof(ApiResponse<SampleDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<SampleDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<SampleDto>), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> FindById([FromBody] FindSampleRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<SampleDto>.Fail("請求參數驗證失敗"));

        try
        {
            var sample = await _repository.FindByIdAsync(request.Id);
            if (sample == null)
                return Ok(ApiResponse<SampleDto>.Fail($"找不到 ID 為 {request.Id} 的 Sample"));

            return Ok(ApiResponse<SampleDto>.Ok(sample));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<SampleDto>.Fail("伺服器發生錯誤，請稍後再試"));
        }
    }

    /// <summary>新增 Sample</summary>
    [HttpPost("register")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Register([FromBody] RegisterSampleRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<bool>.Fail("請求參數驗證失敗"));

        try
        {
            // ✅ Controller 只組裝 DTO，不接觸 Domain Entity
            var dto = new SampleDto
            {
                Id     = request.Id,
                Name   = request.Name,
                Data   = request.Data,
                TypeId = request.TypeId,
            };

            var result = await _repository.RegisterAsync(dto);
            return Ok(result
                ? ApiResponse<bool>.Ok(true)
                : ApiResponse<bool>.Fail("新增失敗，請確認資料後重試"));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<bool>.Fail("伺服器發生錯誤，請稍後再試"));
        }
    }
}
```

### SQL Repository 實作（內部用 Domain Entity，對外回傳 DTO）

```csharp
// WebApi/Infrastructure/Repositories/SqlSampleRepository.cs
public class SqlSampleRepository : ISampleRepository
{
    private readonly string _connectionString;

    public SqlSampleRepository(IConfiguration config)
    {
        _connectionString = config.GetConnectionString("Default");
    }

    public async Task<SampleDto?> FindByIdAsync(string id)
    {
        var entity = await QueryEntityAsync(id);
        return entity?.ToDto(); // ✅ Domain Entity 在這裡轉換為 DTO 後才離開 Repository
    }

    public async Task<IReadOnlyList<SampleDto>> FindAllAsync()
    {
        await using var con = new SqlConnection(_connectionString);
        await con.OpenAsync();

        var cmd = new SqlCommand(
            "SELECT s.*, t.Name AS TypeName FROM Sample s LEFT JOIN Type t ON s.TypeId = t.Id",
            con);

        await using var reader = await cmd.ExecuteReaderAsync();
        var results = new List<SampleDto>();
        while (await reader.ReadAsync())
        {
            results.Add(ReadEntity(reader).ToDto());
        }
        return results;
    }

    public async Task<bool> RegisterAsync(SampleDto sample)
    {
        var entity = sample.ToDomain();
        if (!entity.IsValid()) return false; // ✅ 業務驗證留在 Domain Entity

        await using var con = new SqlConnection(_connectionString);
        await con.OpenAsync();

        var cmd = new SqlCommand(
            "INSERT INTO Sample (Id, Name, TypeId, Data) VALUES (@id, @name, @typeId, @data)",
            con);
        cmd.Parameters.AddWithValue("@id",     entity.Id);
        cmd.Parameters.AddWithValue("@name",   entity.Name);
        cmd.Parameters.AddWithValue("@typeId", entity.Type?.Id ?? string.Empty);
        cmd.Parameters.AddWithValue("@data",   entity.Data ?? string.Empty);

        return await cmd.ExecuteNonQueryAsync() > 0;
    }

    public async Task<bool> UpdateAsync(SampleDto sample)
    {
        var entity = sample.ToDomain();

        await using var con = new SqlConnection(_connectionString);
        await con.OpenAsync();

        var cmd = new SqlCommand(
            "UPDATE Sample SET Name = @name, TypeId = @typeId, Data = @data WHERE Id = @id",
            con);
        cmd.Parameters.AddWithValue("@id",     entity.Id);
        cmd.Parameters.AddWithValue("@name",   entity.Name);
        cmd.Parameters.AddWithValue("@typeId", entity.Type?.Id ?? string.Empty);
        cmd.Parameters.AddWithValue("@data",   entity.Data ?? string.Empty);

        return await cmd.ExecuteNonQueryAsync() > 0;
    }

    private async Task<Sample?> QueryEntityAsync(string id)
    {
        await using var con = new SqlConnection(_connectionString);
        await con.OpenAsync();

        var cmd = new SqlCommand(
            "SELECT s.*, t.Name AS TypeName FROM Sample s LEFT JOIN Type t ON s.TypeId = t.Id WHERE s.Id = @id",
            con);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        return await reader.ReadAsync() ? ReadEntity(reader) : null;
    }

    private static Sample ReadEntity(SqlDataReader reader) => new()
    {
        Id   = reader["Id"].ToString(),
        Name = reader["Name"].ToString(),
        Data = reader["Data"].ToString(),
        Type = new ObjectType(reader["TypeId"].ToString(), reader["TypeName"].ToString()),
    };
}
```

### Program.cs（DI 注入 + Swagger）

```csharp
// WebApi/Program.cs
using System.Reflection;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Sample API", Version = "v1" });

    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    options.IncludeXmlComments(xmlPath);
});

// Repository 介面來自 MCP.Contracts，實作來自 WebApi 自己的 Infrastructure 層
builder.Services.AddScoped<ISampleRepository, SqlSampleRepository>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Sample API v1");
    });
}

app.UseAuthorization();
app.MapControllers();
app.Run();
```

### .csproj 設定

```xml
<!-- WebApi/WebApi.csproj -->
<ItemGroup>
    <ProjectReference Include="..\MCP.Contracts\MCP.Contracts.csproj" />
</ItemGroup>

<PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <GenerateDocumentationFile>true</GenerateDocumentationFile>
    <NoWarn>$(NoWarn);1591</NoWarn>
</PropertyGroup>
```

```xml
<!-- MCP.Contracts/MCP.Contracts.csproj -->
<!-- ❌ 嚴禁：MCP.Contracts 不得參考 WebApi 專案或任何資料庫套件 -->
<PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
</PropertyGroup>
```
