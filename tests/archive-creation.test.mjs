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
    if (source[index] === "{") {
      depth += 1;
    } else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  assert.fail(`Unclosed ${name} implementation`);
}

test("creates a uniquely named archive, activates it and confirms success", () => {
  const state = {
    activeArchiveId: "archive-1",
    archives: [{ id: "archive-1", name: "档案 1" }]
  };
  let rendered = false;
  let toast;
  const context = {
    state,
    getUniqueArchiveName: (name) => name === "档案 2" ? "档案 2" : "unexpected",
    createArchive: (name) => ({ id: "archive-2", name }),
    render: () => {
      rendered = true;
    },
    showToast: (message, tone) => {
      toast = { message, tone };
    }
  };

  vm.runInNewContext(`${getFunctionSource("createNewArchive")}; action = createNewArchive;`, context);
  context.action();

  assert.equal(state.activeArchiveId, "archive-2");
  assert.deepEqual(state.archives, [
    { id: "archive-1", name: "档案 1" },
    { id: "archive-2", name: "档案 2" }
  ]);
  assert.equal(rendered, true);
  assert.deepEqual(toast, { message: "已新建「档案 2」。", tone: "success" });
});
