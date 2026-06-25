#!/usr/bin/env node
/**
 * Claude Code PostToolUse Hook — 在 Edit / Write 後對 TS/React 檔案執行 ESLint 即時檢查
 * 違規時以 exit code 2 + stderr 回饋給 Claude，讓 AI 立即看到並自我修正。
 *
 * 注意：C#/.NET 的重型檢查（Roslyn Analyzer、BannedSymbols）已移至 Commit 階段，
 * 見 hooks/pre-commit-lint.mjs，不在此即時軌處理（規格書 7.5 分級雙軌）。
 *
 * 注意：ESLint 9+ 已移除 legacy config（--no-eslintrc/--config <json>）支援，改用
 * 必須為 JS 格式的 Flat Config，會重新引入 13.6 已排除的 RCE 風險。為維持 JSON-only
 * 安全限制，此腳本透過 npx 明確鎖定 eslint@8 執行，與消費端專案實際安裝的 ESLint
 * 版本無關（npx 優先採用本地 node_modules，若無則對 v8 單獨下載快取）。
 *
 * 使用前置條件：
 * - 設定環境變數 MCP_SKILL_HUB_PATH 指向本機 mcp-skill-hub 專案根目錄
 * - TS/React 專案需安裝 eslint、@typescript-eslint/parser、@typescript-eslint/eslint-plugin、
 *   eslint-plugin-react、eslint-plugin-react-hooks
 */

import { execSync } from "child_process";
import { extname } from "path";

const SKILL_HUB_PATH = process.env.MCP_SKILL_HUB_PATH;

const SPEC_BY_EXTENSION = {
  ".tsx": "react-mvvm",
  ".ts": "react-mvvm",
};

async function main() {
  if (!SKILL_HUB_PATH) {
    process.exit(0); // 未設定環境變數時直接放行，避免阻斷未接線此機制的開發者
  }

  const input = JSON.parse(await readStdin());
  const filePath = input.tool_input?.file_path;
  if (!filePath) process.exit(0); // 非檔案操作，放行

  const spec = SPEC_BY_EXTENSION[extname(filePath)];
  if (!spec) process.exit(0); // 無對應 Spec（含 .cs，已移至 Commit 階段），放行

  const result = runEslint(spec, filePath);

  if (result.kind === "tool-error") {
    // 工具本身執行失敗（套件未安裝、設定檔語法錯誤等），不可誤判為規則違規餵給 AI，
    // 否則 AI 會嘗試修正一個不存在的程式碼問題
    process.stderr.write(
      `[${spec} Lint 工具錯誤，非規則違規]\n${result.message}\n請檢查本機是否已安裝 eslint 與相關 plugin。`
    );
    process.exit(0); // 環境問題不應阻斷 AI 的編輯流程
  }

  if (result.kind === "violation") {
    process.stderr.write(
      `[${spec} Lint 違規]\n${result.message}\n請依上述訊息修正後再繼續。`
    );
    process.exit(2);
  }

  process.exit(0); // 無違規
}

function runEslint(spec, filePath) {
  const cfgPath = `${SKILL_HUB_PATH}/spec/${spec}/lint/.eslintrc.json`;
  try {
    execSync(`npx --yes eslint@8 --no-eslintrc --config "${cfgPath}" "${filePath}"`, {
      stdio: "pipe",
    });
    return { kind: "clean" };
  } catch (err) {
    return classifyEslintError(err);
  }
}

function classifyEslintError(err) {
  // ENOENT：找不到指令本身（npx / eslint 未安裝）
  if (err.code === "ENOENT") {
    return { kind: "tool-error", message: `指令無法執行：${err.message}` };
  }

  const stdout = err.stdout?.toString() ?? "";
  const stderr = err.stderr?.toString() ?? "";

  // ESLint 找到違規時，報告印在 stdout；執行失敗（找不到 plugin、設定檔語法錯誤等）則只有 stderr
  if (stdout.trim().length > 0) {
    return { kind: "violation", message: stdout };
  }
  if (stderr.includes("Cannot find module") || stderr.includes("is not recognized")) {
    return { kind: "tool-error", message: stderr };
  }
  // 無法分類時保守視為工具錯誤，避免誤判為規則違規阻斷 AI
  return { kind: "tool-error", message: stderr || err.message };
}

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
  });
}

main();
