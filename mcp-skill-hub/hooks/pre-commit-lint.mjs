#!/usr/bin/env node
/**
 * Git pre-commit Hook — Commit 前對 C#/.NET 專案執行重型驗證（延遲軌）
 * 對應規格書 7.5 分級雙軌：Roslyn Analyzer 需完整專案編譯語意樹，單檔案即時觸發
 * 會造成 Claude Code 對話卡頓，故不掛在 PostToolUse，改於 Commit 階段執行。
 *
 * 使用方式：在消費端專案的 .git/hooks/pre-commit 內呼叫
 *   node "<MCP_SKILL_HUB_PATH>/hooks/pre-commit-lint.mjs"
 *
 * 使用前置條件：
 * - 設定環境變數 MCP_SKILL_HUB_PATH（此腳本目前僅用於訊息提示，不讀取遠端設定檔，
 *   實際規則由消費端專案的 .editorconfig 與 NuGet 套件決定，spec/wpf-mvvm/lint/
 *   下的檔案需先複製或連結進消費端專案）
 * - .NET SDK 已安裝
 * - VSTHRD100 規則需專案參考 NuGet 套件 Microsoft.VisualStudio.Threading.Analyzers
 * - ViewModels 專案需參考 NuGet 套件 Microsoft.CodeAnalysis.BannedApiAnalyzers，
 *   並將 ViewModels.BannedSymbols.txt 設定為 <AdditionalFiles>
 */

import { execSync } from "child_process";

function main() {
  try {
    execSync("dotnet format analyzers --severity warn --verify-no-changes", {
      stdio: "inherit",
    });
    console.log("[wpf-mvvm Lint] 通過。");
    process.exit(0);
  } catch {
    console.error("[wpf-mvvm Lint] 發現違規，已阻擋此次 commit，請修正後再試。");
    process.exit(1);
  }
}

main();
