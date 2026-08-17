# Offer 比较

一个本地优先的 Offer 决策工具，用于对比多个 Offer 的权重、评分、备注和最终排名。

## 功能

- 对多个 Offer 进行 0-10 分的六维比较。
- 调整各维度权重，并按需设置底线。
- 保存 Offer 整体备注和每项评分依据。
- 实时生成排名、关键差异和评分画像。
- 支持多个决策档案，数据默认保存在当前浏览器。
- AI 服务不可用时，仍会生成本地决策分析。

## 快速启动

项目不需要安装依赖或构建。解压后在项目目录运行：

```bash
python3 -m http.server 5173
```

Windows 也可以使用：

```powershell
py -m http.server 5173
```

然后打开 `http://127.0.0.1:5173/`。由于页面使用 ES Module，不建议直接双击 `index.html`。

## 数据与隐私

- 档案、评分和备注保存在浏览器 `localStorage` 中。
- 清除该站点的浏览器数据会删除本地档案。
- 默认不上传备注。启用远程 AI 时，只传递权重、分数、排名和推荐结果。

## 静态部署

将以下三个文件部署到任意静态托管服务即可：

```text
index.html
decision-logic.mjs
summary-payload.mjs
```

## 可选：Cloudflare AI

默认情况下，“生成 AI 分析”会使用本地逻辑给出结果。需要接入 Cloudflare Workers AI 时：

1. 把 `wrangler.jsonc` 中的 `ALLOWED_ORIGIN` 改为静态站点来源。
2. 运行 `npx wrangler login` 和 `npx wrangler deploy`。
3. 把 Worker URL 填入 `index.html` 中的 `AI_SUMMARY_ENDPOINT`。

远程 AI 请求失败时会自动使用本地分析，不影响主要功能。

## 测试

需要 Node.js 18 或更高版本：

```bash
npm test
```

## 文件说明

```text
index.html             页面、样式与交互
decision-logic.mjs     评分、排名与底线逻辑
summary-payload.mjs    本地分析与 AI 请求数据
worker.js              Cloudflare Workers AI 接口
wrangler.jsonc         Cloudflare Worker 配置
tests/                 回归测试
```
