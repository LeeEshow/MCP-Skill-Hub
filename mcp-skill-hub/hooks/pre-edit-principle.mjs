#!/usr/bin/env node
/**
 * Claude Code PreToolUse Hook — 在 Edit / Write 前強制注入 Layer 1 原則內容
 * 解決語意判斷可能失效的風險（規格書 13.7）：不依賴 AI 自行判斷對話是否為開發情境，
 * 改用「本 Session 內第一次嘗試編輯程式碼檔案」作為決定性觸發點。
 *
 * 機制：
 * - Session 內第一次對程式碼檔案執行 Edit/Write 時，以 exit code 2 阻擋該次呼叫，
 *   並將 Layer 1 內容透過 stderr 回傳給 AI；AI 收到後會重新嘗試該次編輯
 * - 同一 Session 內後續呼叫，因標記檔案已存在，直接放行（exit 0），不重複注入，
 *   避免每次 Edit 都重複消耗 Token
 *
 * 使用前置條件：
 * - 設定環境變數 MCP_SKILL_HUB_PATH 指向本機 mcp-skill-hub 專案根目錄
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { extname, join } from "path";
import { tmpdir } from "os";

const SKILL_HUB_PATH = process.env.MCP_SKILL_HUB_PATH;
const CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".cs"];
const MARKER_DIR = join(tmpdir(), "mcp-skill-hub-sessions");

async function main() {
  if (!SKILL_HUB_PATH) process.exit(0); // 未接線此機制，直接放行

  const input = JSON.parse(await readStdin());
  const filePath = input.tool_input?.file_path;
  const sessionId = input.session_id;
  if (!filePath || !sessionId) process.exit(0);

  if (!CODE_EXTENSIONS.includes(extname(filePath))) process.exit(0); // 非程式碼檔案，放行

  const markerPath = join(MARKER_DIR, `${sessionId}.injected`);
  if (existsSync(markerPath)) process.exit(0); // 此 Session 已注入過，放行

  let principles;
  try {
    principles = loadPrinciples();
  } catch {
    process.exit(0); // 讀取失敗（路徑錯誤等環境問題）不應阻斷編輯流程
  }

  markInjected(markerPath);

  process.stderr.write(
    `[Layer 1 原則注入]\n以下為本次開發 Session 必須套用的通用原則，請先閱讀後再重新執行剛才的編輯：\n\n${principles}`
  );
  process.exit(2);
}

const PRINCIPLE_FILES = ["code-style", "oop-ddd", "ai-collaboration"];

function loadPrinciples() {
  return PRINCIPLE_FILES
    .map((name) => readFileSync(join(SKILL_HUB_PATH, `principle/${name}.md`), "utf-8"))
    .join("\n\n");
}

function markInjected(markerPath) {
  mkdirSync(MARKER_DIR, { recursive: true });
  writeFileSync(markerPath, String(Date.now()));
}

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
  });
}

main();
