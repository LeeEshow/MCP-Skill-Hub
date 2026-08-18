using System.ComponentModel;
using ModelContextProtocol.Server;
using SkillHubNet8.Services;

namespace SkillHubNet8.Tools;

/// <summary>
/// 三個知識層 Tool，對應 v2 Dev-Core-Hub tools.ts。
/// 設計依據：v2 規格書 5.1～5.3。
/// 知識文件在 AppContext.BaseDirectory 下（CopyToOutputDirectory）。
/// </summary>
[McpServerToolType]
public sealed class KnowledgeTools(CallLogService callLog)
{
    private static readonly string Root = AppContext.BaseDirectory;

    private static readonly string[] ValidSpecNames =
        ["react-mvvm", "wpf-mvvm", "web-api-NET", "NET-SDK", "ui-token"];

    private static readonly string[] ValidSkillNames =
        ["code-review", "version-control"];

    private static string ReadFile(string relativePath) =>
        File.ReadAllText(Path.Combine(Root, relativePath));

    [McpServerTool(Name = "get_layer1_principles")]
    [Description(
        "強制規則：只要使用者的請求涉及程式碼（撰寫新程式、修改既有程式、審查、解釋、討論寫法是否合理、" +
        "甚至只是貼了一段程式碼問「這樣可以嗎」），就必須先呼叫此工具，不必等使用者明確說「審查」或提及" +
        "「Code Style」「規範」等字眼，籠統或簡短的描述也視為觸發條件，不可省略此步驟、不可只憑自身知識回答。" +
        "回傳內容為團隊通用開發原則：程式碼風格（命名規範、函式長度、參數上限、魔術數字禁用）、" +
        "物件導向與領域設計（單一職責、Domain 純粹性、Repository 模式）、" +
        "AI 協作行為（不確定時詢問、最小變更範圍、測試驗證意圖）。不限特定程式語言或技術棧。")]
    public string GetLayerOnePrinciples()
    {
        callLog.Log("tool", "get_layer1_principles");

        (string title, string path)[] sections =
        [
            ("程式碼風格", "principle/code-style.md"),
            ("物件導向與領域設計", "principle/oop-ddd.md"),
            ("AI 協作行為", "principle/ai-collaboration.md"),
        ];

        return string.Join("\n\n---\n\n",
            sections.Select(s => $"# {s.title}\n\n{ReadFile(s.path)}"));
    }

    [McpServerTool(Name = "get_spec")]
    [Description(
        "強制規則：只要看到或將要處理符合以下任一技術棧的程式碼，就必須呼叫此工具，不必等使用者明確要求規範，" +
        "即使請求很模糊（如「這樣寫可以嗎」「幫我看看」）也要先判斷技術棧並呼叫：" +
        "react-mvvm（React/TSX 元件）、wpf-mvvm（WPF/XAML 桌面應用）、" +
        "web-api-NET（.NET Web API/Controller/Repository 後端）、NET-SDK（.NET Client SDK/HttpClient 相關）、" +
        "ui-token（CSS/SCSS 設計系統 Token）。" +
        "tier 預設 rules（日常開發規則）；進行 Code Review 或需要完整範例時使用 full。")]
    public string GetSpec(
        [Description("技術棧名稱，必須是以下之一：react-mvvm | wpf-mvvm | web-api-NET | NET-SDK | ui-token")]
        string name,
        [Description("rules（日常開發規則，預設值）或 full（Code Review 完整版，含範例反例）")]
        string tier = "rules")
    {
        if (!ValidSpecNames.Contains(name))
            throw new ArgumentException(
                $"無效的 spec name：{name}。有效值：{string.Join(", ", ValidSpecNames)}");
        if (tier != "rules" && tier != "full")
            throw new ArgumentException("tier 只能是 'rules' 或 'full'");

        callLog.Log("tool", $"get_spec/{name}/{tier}");
        var file = tier == "full" ? "full-spec.md" : "rules.md";
        return ReadFile($"spec/{name}/{file}");
    }

    [McpServerTool(Name = "get_skill")]
    [Description(
        "強制規則：偵測到以下任務情境就必須呼叫，不必等使用者用「審查」「commit」等字眼明確指名：" +
        "code-review（任何要求檢查、看一下、評估、確認程式碼好壞或正確性的請求，即使說法籠統）、" +
        "version-control（任何要送出變更、整理變更說明、命名分支、寫 PR 描述的請求）。")]
    public string GetSkill(
        [Description("技能名稱，必須是以下之一：code-review | version-control")]
        string name)
    {
        if (!ValidSkillNames.Contains(name))
            throw new ArgumentException(
                $"無效的 skill name：{name}。有效值：{string.Join(", ", ValidSkillNames)}");

        callLog.Log("tool", $"get_skill/{name}");
        return ReadFile($"skill/{name}.md");
    }
}
