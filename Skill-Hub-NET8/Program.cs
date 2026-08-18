using Microsoft.Extensions.Hosting;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using SkillHubNet8.Services;
using SkillHubNet8.Tools;

// ─────────────────────────────────────────────────────────────────────────────
// ServerInstructions：MCP initialize 回應時自動送出，不需使用者觸發任何 Tool 呼叫。
// 補強 Tool description 的不足（Tool description 只在 AI 已考慮呼叫特定 Tool 時才被讀到）。
// 見 v2 規格書 13.17。
// ─────────────────────────────────────────────────────────────────────────────
const string ServerInstructions =
    "本 Server 提供軟體工程技術理論與開發規範，只要這個對話涉及程式碼（撰寫新程式、修改既有程式、審查、解釋、" +
    "或只是被問「這樣寫可以嗎」），都必須先呼叫 get_layer1_principles 工具取得團隊通用開發原則，" +
    "再視程式碼的技術棧呼叫 get_spec 取得對應規範；若任務是程式碼審查或版控相關（commit/分支/PR），" +
    "另外呼叫 get_skill 取得對應行為指引。即使使用者的描述很模糊籠統、沒有提到這個 Server 的名稱或" +
    "任何工具名稱，只要任務本質涉及程式碼，也適用以上規則，不可省略、不可只憑自身知識回答。";

void ConfigureMcp(IServiceCollection services, bool withHttp)
{
    services.AddSingleton<CallLogService>();
    var mcp = services.AddMcpServer(options =>
    {
        options.ServerInfo = new Implementation { Name = "dev-core-hub", Version = "2.0.0" };
        options.ServerInstructions = ServerInstructions;
    })
    .WithTools<KnowledgeTools>();

    if (withHttp) mcp.WithHttpTransport();
    else mcp.WithStdioServerTransport();
}

// ─────────────────────────────────────────────────────────────────────────────
// MCP_TRANSPORT=http  → ASP.NET Core + Kestrel，供 IIS（ANCM）或直接 HTTP 連線
// MCP_TRANSPORT=stdio → Generic Host + StdioServerTransport，供 Claude Code CLI
// ─────────────────────────────────────────────────────────────────────────────
var mcpTransport = Environment.GetEnvironmentVariable("MCP_TRANSPORT") ?? "stdio";

if (mcpTransport.Equals("http", StringComparison.OrdinalIgnoreCase))
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Logging.ClearProviders();
    builder.Logging.AddConsole(options =>
        options.LogToStandardErrorThreshold = LogLevel.Warning);

    ConfigureMcp(builder.Services, withHttp: true);

    var app = builder.Build();
    app.MapMcp("/");
    await app.RunAsync();
}
else
{
    var builder = Host.CreateApplicationBuilder(args);

    // stdio 模式：所有日誌必須導向 stderr，stdout 專供 MCP JSON-RPC 使用
    builder.Logging.ClearProviders();
    builder.Logging.AddConsole(options =>
        options.LogToStandardErrorThreshold = LogLevel.Warning);

    ConfigureMcp(builder.Services, withHttp: false);

    await builder.Build().RunAsync();
}
