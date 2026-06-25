/**
 * Task 11 部分驗收：manifest.json 的 hint / trigger 關鍵字覆蓋率稽核
 *
 * 重要限制：這是機械式的字串比對模擬，用來檢查關鍵字設計本身是否合理
 * （有無遺漏、有無誤判風險），不是真實 AI 語意判斷的替代品。真實 AI 行為
 * 驗收需要實際連線的 MCP Client Session，見規格書 13.1 / 13.7。
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(__dirname, "../manifest.json"), "utf-8"));

function matches(prompt, keywords) {
  const lower = prompt.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.toLowerCase()));
}

function checkPrinciples(prompt) {
  return matches(prompt, manifest.principles.hint);
}

function checkSpecs(prompt) {
  const hits = {};
  for (const [name, spec] of Object.entries(manifest.specs)) {
    const m = matches(prompt, spec.hint);
    if (m.length > 0) hits[name] = m;
  }
  return hits;
}

function checkSkills(prompt) {
  const hits = {};
  for (const [name, skill] of Object.entries(manifest.skills)) {
    const m = matches(prompt, skill.trigger);
    if (m.length > 0) hits[name] = m;
  }
  return hits;
}

const cases = [
  { prompt: "幫我看一下這個 React 元件的 .tsx 檔案", expectSpec: "react-mvvm" },
  { prompt: "這個 WPF 的 UserControl 要怎麼綁定 Command", expectSpec: "wpf-mvvm" },
  { prompt: "幫我寫一個 ASP.NET Controller", expectSpec: "web-api-NET" },
  { prompt: "這個 HttpClient 要怎麼注入 DI", expectSpec: "NET-SDK" },
  { prompt: "幫我設計一下 CSS 的設計系統 token", expectSpec: "ui-token" },
  { prompt: "幫我審查這段程式碼", expectSkill: "code-review" },
  { prompt: "我要 commit 這些變更", expectSkill: "version-control" },
  { prompt: "今天天氣如何", expectNone: true },
  { prompt: "請幫我重構這個函式，它有單一職責問題", expectPrinciple: true },
  { prompt: "ISampleRepository 的 DTO 轉換邏輯要怎麼設計", expectSpecAny: ["web-api-NET", "NET-SDK"] },
  { prompt: "The client wants a new dashboard feature next sprint", expectNotSpec: "NET-SDK" },
];

let failCount = 0;

console.log("=== Hint / Trigger 覆蓋率稽核 ===\n");

for (const c of cases) {
  const principleHits = checkPrinciples(c.prompt);
  const specHits = checkSpecs(c.prompt);
  const skillHits = checkSkills(c.prompt);

  console.log(`📝 "${c.prompt}"`);
  console.log(`   Principle 命中: ${principleHits.length ? principleHits.join(", ") : "無"}`);
  console.log(`   Spec 命中: ${Object.keys(specHits).length ? JSON.stringify(specHits) : "無"}`);
  console.log(`   Skill 命中: ${Object.keys(skillHits).length ? JSON.stringify(skillHits) : "無"}`);

  if (c.expectSpec) {
    const ok = c.expectSpec in specHits;
    console.log(`   ${ok ? "✅" : "❌"} 預期命中 Spec: ${c.expectSpec}`);
    if (!ok) failCount++;
  }
  if (c.expectSkill) {
    const ok = c.expectSkill in skillHits;
    console.log(`   ${ok ? "✅" : "❌"} 預期命中 Skill: ${c.expectSkill}`);
    if (!ok) failCount++;
  }
  if (c.expectPrinciple) {
    const ok = principleHits.length > 0;
    console.log(`   ${ok ? "✅" : "❌"} 預期命中 Layer 1 Hint`);
    if (!ok) failCount++;
  }
  if (c.expectNone) {
    const ok = principleHits.length === 0 && Object.keys(specHits).length === 0 && Object.keys(skillHits).length === 0;
    console.log(`   ${ok ? "✅" : "⚠️ "} 預期完全無命中（避免無關話題誤觸發）`);
    if (!ok) failCount++;
  }
  if (c.expectSpecAny) {
    const ok = c.expectSpecAny.some((name) => name in specHits);
    console.log(`   ${ok ? "✅" : "❌"} 預期命中 Spec（任一）: ${c.expectSpecAny.join(" 或 ")}`);
    if (!ok) failCount++;
  }
  if (c.expectNotSpec) {
    const ok = !(c.expectNotSpec in specHits);
    console.log(`   ${ok ? "✅" : "❌"} 預期不誤判為: ${c.expectNotSpec}`);
    if (!ok) failCount++;
  }
  console.log("");
}

console.log(`=== 稽核完成：${failCount === 0 ? "✅ 全部預期項目通過" : `❌ ${failCount} 項預期未通過`} ===`);
process.exit(failCount === 0 ? 0 : 1);
