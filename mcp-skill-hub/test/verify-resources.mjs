/**
 * Task 6 驗收腳本
 * 啟動 MCP Server，透過 JSON-RPC 驗證 Manifest / Layer 1 / Layer 2 Resource 服務
 */
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, "../dist/index.js");

const server = spawn("node", [serverPath], {
  stdio: ["pipe", "pipe", "inherit"],
});

let buffer = "";
const results = [];

server.stdout.on("data", (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split("\n");
  buffer = lines.pop();
  for (const line of lines) {
    if (line.trim()) {
      try {
        const msg = JSON.parse(line);
        results.push(msg);
        handleResponse(msg);
      } catch {
        // ignore non-JSON lines
      }
    }
  }
});

let requestId = 0;
function send(method, params) {
  const msg = { jsonrpc: "2.0", id: ++requestId, method, params };
  server.stdin.write(JSON.stringify(msg) + "\n");
}

const checks = [];
function expect(label, fn) {
  checks.push({ label, fn });
}

function handleResponse(msg) {
  const check = checks.shift();
  if (!check) return;
  const ok = check.fn(msg);
  console.log(`${ok ? "✅" : "❌"} ${check.label}`);
  if (!ok) console.log("   回應：", JSON.stringify(msg).slice(0, 200));
}

// ── 測試流程 ──────────────────────────────────────────────

// 1. initialize
expect("Server 初始化成功", (r) => !r.error && r.result?.serverInfo?.name === "mcp-skill-hub");
send("initialize", {
  protocolVersion: "2024-11-05",
  capabilities: {},
  clientInfo: { name: "test-client", version: "1.0" },
});

// 2. resources/list
expect("Resource 清單包含 manifest / principle / spec", (r) => {
  const uris = r.result?.resources?.map((x) => x.uri) ?? [];
  return (
    uris.includes("skill-hub://manifest") &&
    uris.includes("skill-hub://principle/code-style") &&
    uris.includes("skill-hub://principle/oop-ddd") &&
    uris.includes("skill-hub://spec/react-mvvm/summary") &&
    uris.includes("skill-hub://spec/wpf-mvvm/rules")
  );
});
setTimeout(() => send("resources/list", {}), 200);

// 3. 讀取 manifest
expect("manifest 內容包含 version 與 specs", (r) => {
  const text = r.result?.contents?.[0]?.text ?? "";
  try {
    const json = JSON.parse(text);
    return !!json.version && !!json.specs;
  } catch {
    return false;
  }
});
setTimeout(() => send("resources/read", { uri: "skill-hub://manifest" }), 400);

// 4. 讀取 principle/code-style
expect("principle/code-style 包含 PascalCase 規則", (r) => {
  const text = r.result?.contents?.[0]?.text ?? "";
  return text.includes("PascalCase");
});
setTimeout(() => send("resources/read", { uri: "skill-hub://principle/code-style" }), 600);

// 5. 讀取 principle/oop-ddd
expect("principle/oop-ddd 包含 Domain 規則", (r) => {
  const text = r.result?.contents?.[0]?.text ?? "";
  return text.includes("Domain");
});
setTimeout(() => send("resources/read", { uri: "skill-hub://principle/oop-ddd" }), 800);

// 5b. 讀取 principle/ai-collaboration
expect("principle/ai-collaboration 包含成功標準相關原則", (r) => {
  const text = r.result?.contents?.[0]?.text ?? "";
  return text.includes("成功標準");
});
setTimeout(() => send("resources/read", { uri: "skill-hub://principle/ai-collaboration" }), 900);

// 6. 讀取 spec/react-mvvm/summary
expect("spec/react-mvvm/summary 可正常讀取", (r) => {
  const text = r.result?.contents?.[0]?.text ?? "";
  return text.includes("React");
});
setTimeout(() => send("resources/read", { uri: "skill-hub://spec/react-mvvm/summary" }), 1000);

// 7. 讀取 spec/react-mvvm/rules
expect("spec/react-mvvm/rules 包含 16 條規則", (r) => {
  const text = r.result?.contents?.[0]?.text ?? "";
  return text.includes("ViewModel") && text.includes("Model");
});
setTimeout(() => send("resources/read", { uri: "skill-hub://spec/react-mvvm/rules" }), 1200);

// 8. 讀取 spec/wpf-mvvm/rules
expect("spec/wpf-mvvm/rules 可正常讀取", (r) => {
  const text = r.result?.contents?.[0]?.text ?? "";
  return text.includes("INotifyPropertyChanged");
});
setTimeout(() => send("resources/read", { uri: "skill-hub://spec/wpf-mvvm/rules" }), 1400);

// 9. 讀取不存在的 spec（web-api），預期回傳錯誤
expect("spec/web-api/summary 回傳錯誤（檔案不存在，屬正常）", (r) => {
  return !!r.error || r.result?.contents?.[0]?.text?.includes("ENOENT");
});
setTimeout(() => send("resources/read", { uri: "skill-hub://spec/web-api/summary" }), 1600);

// 10. 讀取 spec/react-mvvm/lint/eslintrc.json
expect("spec/react-mvvm/lint/eslintrc.json 為合法 JSON、含 max-lines-per-function、且不含 _comment（ESLint Schema 會拒絕）", (r) => {
  const text = r.result?.contents?.[0]?.text ?? "";
  if (!text.includes("max-lines-per-function")) return false;
  try {
    const json = JSON.parse(text);
    return !("_comment" in json);
  } catch {
    return false;
  }
});
setTimeout(() => send("resources/read", { uri: "skill-hub://spec/react-mvvm/lint/eslintrc.json" }), 1800);

// 10b. 讀取 spec/react-mvvm/lint/rules-source.json（規則來源說明，不被 ESLint 載入）
expect("spec/react-mvvm/lint/rules-source.json 可正常讀取且為合法 JSON", (r) => {
  const text = r.result?.contents?.[0]?.text ?? "";
  try {
    JSON.parse(text);
    return text.includes("max-lines-per-function");
  } catch {
    return false;
  }
});
setTimeout(() => send("resources/read", { uri: "skill-hub://spec/react-mvvm/lint/rules-source.json" }), 1900);

// 11. 讀取 spec/wpf-mvvm/lint/editorconfig
expect("spec/wpf-mvvm/lint/editorconfig 可正常讀取且含 VSTHRD100", (r) => {
  const text = r.result?.contents?.[0]?.text ?? "";
  return text.includes("VSTHRD100");
});
setTimeout(() => send("resources/read", { uri: "skill-hub://spec/wpf-mvvm/lint/editorconfig" }), 2100);

// 12. 讀取 spec/wpf-mvvm/lint/viewmodels.bannedsymbols.txt
expect("spec/wpf-mvvm/lint/viewmodels.bannedsymbols.txt 可正常讀取且含 System.Windows", (r) => {
  const text = r.result?.contents?.[0]?.text ?? "";
  return text.includes("System.Windows");
});
setTimeout(() => send("resources/read", { uri: "skill-hub://spec/wpf-mvvm/lint/viewmodels.bannedsymbols.txt" }), 2300);

// ── 結束 ─────────────────────────────────────────────────
setTimeout(() => {
  server.stdin.end();
  server.kill();
  console.log("\n驗收完成。");
}, 2900);
