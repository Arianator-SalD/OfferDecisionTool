# 香港服务器短期部署方案

这个项目目前是纯静态站，入口是 `index.html`，适合直接部署到香港轻量服务器，再用 Nginx 托管。

## 1. 购买服务器

推荐先用腾讯云 Lighthouse 香港或阿里云 ECS 香港。系统选择 Ubuntu 22.04 或 24.04。

最低配置可以从 1 核 1G 开始。如果你只是给面试官或朋友访问，这个规格够用。

## 2. DNS

在域名解析里添加一条记录：

```text
类型: A
主机记录: @ 或 www
记录值: 你的香港服务器公网 IP
```

如果暂时没有域名，也可以先用服务器 IP 访问。

## 3. 初始化服务器

把初始化脚本传到服务器：

```bash
scp ./scripts/bootstrap-hk-server.sh ubuntu@你的服务器IP:/tmp/bootstrap-hk-server.sh
```

然后在服务器上执行：

```bash
sudo SITE_NAME=offer-score DOMAIN=你的域名 DEPLOY_PATH=/var/www/offer-score bash /tmp/bootstrap-hk-server.sh
```

没有域名时可以先用：

```bash
sudo SITE_NAME=offer-score DOMAIN=_ DEPLOY_PATH=/var/www/offer-score bash /tmp/bootstrap-hk-server.sh
```

## 4. 发布网站

在本地项目根目录执行：

```bash
DEPLOY_HOST=你的服务器IP DEPLOY_USER=ubuntu ./scripts/deploy-hk.sh
```

如果 SSH 端口不是 22：

```bash
DEPLOY_HOST=你的服务器IP DEPLOY_USER=ubuntu DEPLOY_PORT=你的端口 ./scripts/deploy-hk.sh
```

## 5. 配 HTTPS

有域名并且 DNS 已经生效后，在服务器上执行：

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名
```

如果你同时配置了 `www`：

```bash
sudo certbot --nginx -d example.com -d www.example.com
```

## 6. 大陆访问检查

部署完成后，用下面几种方式测：

- 手机关闭 VPN，用 5G 打开域名。
- 让国内不同网络的朋友打开。
- 用国内站长工具测全国节点。

## 注意

页面会在浏览器里加载 Supabase SDK 并连接 Supabase：

```text
https://esm.sh/@supabase/supabase-js@2
https://*.supabase.co
```

香港服务器可以改善网页本体的打开速度，但如果大陆网络对这些外部服务不稳定，登录和云同步仍可能失败。短期可以先接受本地浏览器保存；长期更稳的方案是把数据层换到国内云服务或自建 API。
