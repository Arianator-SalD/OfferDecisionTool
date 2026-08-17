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

test("score input accepts only whole numbers from zero through ten", () => {
  const sanitize = loadFunction("sanitizeScoreInput");
  const validate = loadFunction("getScoreValidationMessage");

  assert.equal(sanitize("8.5"), "8");
  assert.equal(validate("8.5"), "请输入 0-10 的整数");
  assert.equal(validate("0"), "");
  assert.equal(validate("10"), "");
  assert.equal(validate("11"), "请输入 0-10 的整数");
});
