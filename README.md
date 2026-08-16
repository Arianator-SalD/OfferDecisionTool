# OfferDecisionTool

OfferDecisionTool 是一个面向职业选择场景的 offer 决策档案工具。它帮助用户把不同 offer 的关键信息、维度打分、权重偏好和最终排序放在同一个界面里，形成可复盘、可同步的决策记录。

当前版本以单页静态应用为主，入口文件是 `index.html`。本地可以直接打开使用；配置 Supabase 后，可以开启账号登录、云端同步和 AI 决策总结。

## 核心功能

- 多 offer 横向比较：为每个 offer 记录备注和 0-10 分。
- 自定义权重：按业务前景、兴趣程度、待遇、工作地、工作生活平衡、转正概率等维度调整排序逻辑。
- 实时推荐：自动计算加权分，展示当前最佳 offer 和完整排名。
- 雷达图：同时展示权重分布和当前最高分 offer 的能力轮廓。
- 职业选择档案：支持新建、切换、重命名、删除档案；每个档案独立保存 offer、权重、备注和排序。
- 本地保存：默认使用浏览器 `localStorage` 保存数据。
- 云端同步：配置 Supabase 后支持邮箱登录、GitHub OAuth 和跨设备恢复。
- AI 决策总结：通过 Supabase Edge Function 调用 DeepSeek，根据当前内部推荐 JSON 生成简短中文总结。

## 技术栈

- 前端：原生 HTML/CSS/JavaScript，单文件静态应用。
- 数据同步：Supabase Auth + Postgres + Row Level Security。
- 云函数：Supabase Edge Functions，Deno runtime。
- AI 总结：DeepSeek Chat Completions API。
- 部署：可直接部署到任意静态托管服务。

## 项目结构

```text
.
├── index.html
├── supabase-schema.sql
├── supabase/
│   └── functions/
│       ├── .env.example
│       └── generate-decision-summary/
│           └── index.ts
├── package.json
└── README.md
```

## 本地使用

这个项目不依赖前端构建流程。只需要在浏览器中打开 `index.html` 即可使用本地保存版本。

如果要通过本地静态服务器访问，也可以在项目根目录运行：

```bash
python3 -m http.server 5173
```

然后打开：

```text
http://localhost:5173
```

## Supabase 配置

云端同步依赖 `offer_boards` 表。先在 Supabase SQL Editor 中执行：

```sql
-- see supabase-schema.sql
```

也可以直接复制 `supabase-schema.sql` 的完整内容执行。该 schema 会创建 `offer_boards` 表，并启用 RLS，确保用户只能读写自己的决策档案。

前端目前在 `index.html` 中配置：

```js
const SUPABASE_URL = "...";
const SUPABASE_ANON_KEY = "...";
```

配置完成后，页面会启用登录、注册、退出和自动云端同步。

## GitHub OAuth

如果要使用 GitHub 登录，需要在 Supabase Dashboard 中开启 GitHub Provider，并配置 OAuth App 的 callback URL。前端会使用当前页面地址作为登录后的跳转地址。

## AI 决策总结

AI 总结由 Supabase Edge Function `generate-decision-summary` 提供。它接收前端生成的 `recommendation_result.v1` JSON，并调用 DeepSeek API 返回 2-3 句中文总结。

安装 Supabase CLI 依赖：

```bash
npm install
```

配置函数环境变量：

```bash
cp supabase/functions/.env.example supabase/functions/.env
```

在 Supabase 项目中配置 secrets：

```bash
npx supabase secrets set DEEPSEEK_API_KEY=sk-your-deepseek-api-key
npx supabase secrets set DEEPSEEK_MODEL=deepseek-v4-flash
```

部署函数：

```bash
npx supabase functions deploy generate-decision-summary
```

## AI 总结输入 JSON

前端在调用 AI 总结时会内部生成 `recommendation_result.v1` JSON，主要包含：

- `archive`：当前档案名称。
- `scoringRule`：加权平均公式、分数范围和总权重。
- `dimensions`：所有维度及当前权重。
- `offers`：每个 offer 的排名、加权分、原始分数、加权贡献和备注。
- `recommendation`：最终推荐 offer 的 ID、名称、排名和加权分。

这个 JSON 目前作为 AI 决策总结的内部输入，不作为前台导出功能展示。

## 当前状态

- 前端核心功能已在 `index.html` 中实现。
- Supabase 数据表 schema 已准备好。
- DeepSeek 总结函数已放在 `supabase/functions/generate-decision-summary`。
- 仍建议在正式发布前补充一次端到端测试：本地保存、登录同步、GitHub OAuth、AI 总结、JSON 导出和移动端布局。
