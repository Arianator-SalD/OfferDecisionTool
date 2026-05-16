#!/usr/bin/env bash
set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:-}"
DEPLOY_USER="${DEPLOY_USER:-ubuntu}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
SITE_NAME="${SITE_NAME:-offer-score}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/${SITE_NAME}}"

if [[ -z "${DEPLOY_HOST}" ]]; then
  echo "Missing DEPLOY_HOST."
  echo "Example:"
  echo "  DEPLOY_HOST=1.2.3.4 DEPLOY_USER=ubuntu ./scripts/deploy-hk.sh"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Deploying ${ROOT_DIR} to ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}"

ssh -p "${DEPLOY_PORT}" "${DEPLOY_USER}@${DEPLOY_HOST}" "sudo mkdir -p '${DEPLOY_PATH}' && sudo chown -R '${DEPLOY_USER}:${DEPLOY_USER}' '${DEPLOY_PATH}'"

rsync -az --delete \
  -e "ssh -p ${DEPLOY_PORT}" \
  --filter=":- .deployignore" \
  "${ROOT_DIR}/" \
  "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"

ssh -p "${DEPLOY_PORT}" "${DEPLOY_USER}@${DEPLOY_HOST}" "sudo chown -R www-data:www-data '${DEPLOY_PATH}' && sudo nginx -t && sudo systemctl reload nginx"

echo "Deploy finished."
