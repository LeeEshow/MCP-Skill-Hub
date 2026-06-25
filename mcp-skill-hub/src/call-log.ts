import { appendFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";

const ROOT = join(import.meta.dirname, "..");
const LOG_PATH = process.env.MCP_CALL_LOG_PATH
  ? join(ROOT, process.env.MCP_CALL_LOG_PATH)
  : join(ROOT, "logs/call-log.jsonl");

export type TransportKind = "stdio" | "http";

export interface ServerContext {
  transport: TransportKind;
  sessionId?: string;
}

export interface CallLogEntry {
  type: "resource" | "prompt";
  name: string;
  transport: TransportKind;
  sessionId?: string;
}

/**
 * 附加寫入 JSON Lines 格式的呼叫紀錄，用於觀察 Resource / Prompt 的實際載入行為
 * （規格書 13.10：機械式紀錄無法驗證 AI 語意判斷是否正確，但能呈現載入順序與次數）。
 * 寫入失敗（如磁碟問題）僅記錄錯誤，不應阻斷 Server 正常服務。
 */
export function logCall(entry: CallLogEntry): void {
  const line = JSON.stringify({ timestamp: new Date().toISOString(), ...entry });
  try {
    mkdirSync(dirname(LOG_PATH), { recursive: true });
    appendFileSync(LOG_PATH, line + "\n", "utf-8");
  } catch (err) {
    console.error("[mcp-skill-hub] Call Log 寫入失敗：", err);
  }
}
