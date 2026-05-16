# OfferDecisionTool

OfferDecisionTool 是一个面向职业选择场景的 offer 决策档案工具。它帮助用户把不同 offer 的关键信息、维度打分、权重偏好和最终排序放在同一个界面里，形成可复盘、可导出、可同步的决策记录。

当前版本以单页静态应用为主，入口文件是 `index.html`。本地可以直接打开使用；配置 Supabase 后，可以开启账号登录、云端同步和 AI 决策总结。

## 核心功能

- 多 offer 横向比较：为每个 offer 记录备注和 0-10 分。
- 自定义权重：按业务前景、兴趣程度、待遇、工作地、工作生活平衡、转正概率等维度调整排序逻辑。
- 实时推荐：自动计算加权分，展示当前最佳 offer 和完整排名。
- 雷达图：同时展示权重分布和当前最高分 offer 的能力轮廓。
- 职业选择档案：支持新建、切换、重命名、删除档案；每个档案独立保存 offer、权重、备注和排序。
- 本地保存：默认使用浏览器 `localStorage` 保存数据。
- 云端同步：配置 Supabase 后支持邮箱登录、GitHub OAuth 和跨设备恢复。
- AI 决策总结：通过 Supabase Edge Function 调用 DeepSeek，根据当前推荐 JSON 生成简短中文总结。
- 推荐结果导出：导出包含评分公式、维度权重、排名、加权贡献和最终推荐的 JSON 文件。

## 技术栈

- 前端：原生 HTML/CSS/JavaScript，单文件静态应用。
- 数据同步：Supabase Auth + Postgres + Row Level Security。
- 云函数：Supabase Edge Functions，Deno runtime。
- AI 总结：DeepSeek Chat Completions API。
- 部署：可直接静态托管，也可用 Nginx 部署到香港轻量服务器。

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
├── scripts/
│   ├── bootstrap-hk-server.sh
│   └── deploy-hk.sh
├── deploy/
│   └── nginx-site.conf.template
├── DEPLOY-HK.md
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

## 推荐 JSON 格式

前端导出的 JSON 使用 `recommendation_result.v1` schema，主要包含：

- `archive`：当前档案名称。
- `scoringRule`：加权平均公式、分数范围和总权重。
- `dimensions`：所有维度及当前权重。
- `offers`：每个 offer 的排名、加权分、原始分数、加权贡献和备注。
- `recommendation`：最终推荐 offer 的 ID、名称、排名和加权分。

这个 JSON 既用于本地导出，也用于 AI 决策总结。

## 部署

纯静态版本可以部署到任意静态托管服务。仓库也提供了香港服务器部署脚本，适合短期让国内访问更稳定。

详细步骤见 `DEPLOY-HK.md`。

常用命令：

```bash
DEPLOY_HOST=你的服务器IP DEPLOY_USER=ubuntu ./scripts/deploy-hk.sh
```

服务器初始化脚本：

```bash
sudo SITE_NAME=offer-score DOMAIN=你的域名 DEPLOY_PATH=/var/www/offer-score bash /tmp/bootstrap-hk-server.sh
```

## 当前状态

- 前端核心功能已在 `index.html` 中实现。
- Supabase 数据表 schema 已准备好。
- DeepSeek 总结函数已放在 `supabase/functions/generate-decision-summary`。
- 香港服务器部署方案已写入 `DEPLOY-HK.md`。
- 仍建议在正式发布前补充一次端到端测试：本地保存、登录同步、GitHub OAuth、AI 总结、JSON 导出和移动端布局。
