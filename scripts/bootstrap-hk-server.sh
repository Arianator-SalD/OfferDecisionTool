#!/usr/bin/env bash
set -euo pipefail

SITE_NAME="${SITE_NAME:-offer-score}"
DOMAIN="${DOMAIN:-_}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/${SITE_NAME}}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run this script on the server with sudo:"
  echo "  sudo SITE_NAME=${SITE_NAME} DOMAIN=${DOMAIN} DEPLOY_PATH=${DEPLOY_PATH} bash $0"
  exit 1
fi

apt-get update
apt-get install -y nginx rsync ca-certificates curl

mkdir -p "${DEPLOY_PATH}"
chown -R www-data:www-data "${DEPLOY_PATH}"

cat > "/etc/nginx/sites-available/${SITE_NAME}" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    root ${DEPLOY_PATH};
    index index.html;

    access_log /var/log/nginx/${SITE_NAME}.access.log;
    error_log /var/log/nginx/${SITE_NAME}.error.log;

    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~ /\.(?!well-known) {
        deny all;
    }

    location ~* \.(?:css|js|mjs|png|jpg|jpeg|gif|svg|ico|webp|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
        try_files \$uri =404;
    }
}
NGINX

ln -sf "/etc/nginx/sites-available/${SITE_NAME}" "/etc/nginx/sites-enabled/${SITE_NAME}"
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx
systemctl reload nginx

echo "Nginx is ready."
echo "Deploy path: ${DEPLOY_PATH}"
echo "Domain: ${DOMAIN}"
