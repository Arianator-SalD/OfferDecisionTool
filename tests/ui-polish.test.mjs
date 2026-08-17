import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

function getFunctionSource(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Missing ${name} implementation`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0 && index > bodyStart) return source.slice(start, index + 1);
  }
  assert.fail(`Unclosed ${name} implementation`);
}

function loadFunction(name) {
  const context = {};
  vm.runInNewContext(`${getFunctionSource(name)}; result = ${name};`, context);
  return context.result;
}

test("summarizes configured minimum scores without repeating empty controls", () => {
  const summarize = loadFunction("getMinimumSettingsSummary");
  assert.equal(summarize({ salary: "", location: "" }).label, "设置底线");
  const configured = summarize({ salary: 6, location: 7, workload: "" });
  assert.equal(configured.count, 2);
  assert.equal(configured.label, "底线 2 项");
  assert.equal(summarize({ salary: 6 }, true).label, "完成");
  assert.doesNotMatch(source, /不设底线/);
});

test("keeps score cells compact and removes blurred focus glow", () => {
  assert.match(source, /\.scoreInput\s*\{[\s\S]*?width:\s*48px/);
  assert.doesNotMatch(source, /box-shadow:\s*0 0 0 3px/);
  assert.match(source, /note \|\| "\+ 添加依据"/);
  assert.match(source, /classList\.toggle\("hasNote", Boolean\(note\)\)/);
});

test("moves focus directly to a configured minimum after expanding", () => {
  assert.match(
    source,
    /document\.getElementById\(`minimum-\$\{dimension\.id\}`\)\?\.focus\(\{ preventScroll: true \}\)/
  );
});

test("moves focus directly into the evidence editor", () => {
  assert.match(source, /textarea\.focus\(\{ preventScroll: true \}\)/);
});

test("keeps offer note editing compact and makes auto-save completion explicit", () => {
  const offerButton = getFunctionSource("updateOfferNoteButtonState");
  const evidenceButton = getFunctionSource("updateNoteButtonState");
  const offerEditor = getFunctionSource("openOfferNoteEditor");
  const evidenceEditor = getFunctionSource("openNoteEditor");

  assert.match(source, /className = "offerNoteButton"/);
  assert.match(offerButton, /button\.replaceChildren\(preview\)/);
  assert.doesNotMatch(offerButton, /已保存|offerNoteStatus/);
  assert.match(evidenceButton, /button\.replaceChildren\(preview\)/);
  assert.doesNotMatch(evidenceButton, /已保存|noteButtonStatus/);
  assert.match(offerEditor, /editorStatus\.textContent = hasNote \? "已保存" : "自动保存"/);
  assert.match(evidenceEditor, /editorStatus\.textContent = hasNote \? "已保存" : "未填写"/);
  assert.match(offerEditor, /closeButton\.textContent = "×"/);
  assert.match(evidenceEditor, /completeButton\.textContent = "完成"/);
  assert.match(offerEditor, /header\.append\(title, editorStatus, closeButton, completeButton\)/);
  assert.match(evidenceEditor, /header\.append\(title, editorStatus, closeButton, completeButton\)/);
  assert.doesNotMatch(source, /offerNoteDisclosure/);
  assert.match(source, /noteEditorStatus/);
});

test("collapses either note editor when its open trigger is clicked again", () => {
  const offerEditor = getFunctionSource("openOfferNoteEditor");
  const evidenceEditor = getFunctionSource("openNoteEditor");
  assert.match(
    offerEditor,
    /activeOfferNoteId === offerId && currentEditor\) \{\s*closeOfferNoteEditor\(\);\s*return;/
  );
  assert.match(
    evidenceEditor,
    /activeNoteSelection\?\.offerId === offerId[\s\S]*?currentEditor\s*\) \{\s*closeNoteEditor\(\);\s*return;/
  );
});

test("keeps AI analysis discoverable and opens the score profile by default", () => {
  assert.match(source, /<details class="summaryBox" id="summaryBox" open>/);
  assert.match(source, /id="generateSummaryButton"[^>]*>生成 AI 分析/);
  assert.match(source, /id="summaryHint"/);
  assert.match(source, /buildLocalDecisionSummary/);
  assert.match(source, /let summary = buildLocalDecisionSummary/);
  assert.match(source, /decisionSummaryText\.textContent = summary/);
  assert.match(source, /signal:\s*AbortSignal\.timeout\(8000\)/);
  assert.doesNotMatch(source, /配置 AI 服务后可生成分析/);
  assert.match(source, /<details class="panel chartPanel" id="radarDetails" open>/);
});

test("keeps AI analysis collapsible without replacing the regenerate action", () => {
  assert.match(source, /<summary class="summaryHeader">/);
  assert.match(source, /\.summaryBox > summary::after\s*\{[\s\S]*?content:\s*"\+";/);
  assert.match(source, /\.summaryBox\[open\] > summary::after\s*\{[\s\S]*?content:\s*"-";/);
  assert.match(source, /\.summaryBox:not\(\[open\]\) > \.summaryContent\s*\{[\s\S]*?display:\s*none;/);
  assert.match(source, /generateSummaryButton\.addEventListener\("click", generateDecisionSummary\)/);
  assert.match(source, /hasGeneratedDecisionSummary && !hasMarkedDecisionSummaryStale[\s\S]*?"重新生成 AI 分析"/);
});

test("keeps the default score profile compact enough to align both columns", () => {
  assert.match(source, /\.chartPanel\s*\{[\s\S]*?padding-top:\s*20px;[\s\S]*?margin-top:\s*24px;/);
  assert.match(source, /\.radarBox\s*\{[\s\S]*?max-width:\s*280px;/);
});
