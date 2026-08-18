using System.Text.Json;
using System.Text.Json.Serialization;

namespace SkillHubNet8.Services;

/// <summary>
/// JSON Lines 格式呼叫記錄，對應 v2 Dev-Core-Hub call-log.ts 的功能。
/// 記錄檔位於 AppContext.BaseDirectory/logs/calls.jsonl。
/// </summary>
public sealed class CallLogService
{
    private static readonly string LogFile = Path.Combine(
        AppContext.BaseDirectory, "logs", "calls.jsonl");

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public void Log(string type, string name, string? transport = null, string? sessionId = null)
    {
        var entry = new CallLogEntry(
            timestamp: DateTimeOffset.UtcNow.ToString("O"),
            type: type,
            name: name,
            transport: transport,
            sessionId: sessionId);

        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(LogFile)!);
            File.AppendAllText(LogFile, JsonSerializer.Serialize(entry, JsonOptions) + "\n");
        }
        catch
        {
            // 日誌失敗不應影響主要 MCP 功能
        }
    }
}

internal sealed record CallLogEntry(
    string timestamp,
    string type,
    string name,
    string? transport,
    string? sessionId);
