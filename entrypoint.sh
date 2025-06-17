#!/bin/sh

# デフォルト値の設定
export WHISPER_API_URL=${WHISPER_API_URL:-""}
export WHISPER_API_TOKEN=${WHISPER_API_TOKEN:-""}
export WHISPER_PROXY_TOKEN=${WHISPER_PROXY_TOKEN:-""}
export HIDE_CREDENTIALS=${HIDE_CREDENTIALS:-"false"}
export SERVER_PROXY_URL=${SERVER_PROXY_URL:-""}
export APP_TITLE=${APP_TITLE:-"Whisper WebUI"}
export HEALTH_CHECK_URL=${HEALTH_CHECK_URL:-""}
export ENVIRONMENT=${ENVIRONMENT:-"production"}

# プロキシモードとクレデンシャル編集設定の決定
if [ "${HIDE_CREDENTIALS}" = "true" ]; then
  export USE_SERVER_PROXY="true"
  export ALLOW_CREDENTIAL_EDIT="false"
  echo "認証情報保護が有効です - プロキシモードを強制的に有効化し、認証情報編集を無効化しました"
elif [ -n "${WHISPER_API_TOKEN}" ]; then
  export USE_SERVER_PROXY="true"
  export ALLOW_CREDENTIAL_EDIT=${ALLOW_CREDENTIAL_EDIT:-"true"}
  echo "API トークンが設定されています - プロキシモードを有効化します"
else
  export USE_SERVER_PROXY=${USE_SERVER_PROXY:-"true"}
  export ALLOW_CREDENTIAL_EDIT=${ALLOW_CREDENTIAL_EDIT:-"true"}
fi

# config.js生成関数
generate_config() {
  local whisper_url="$1"
  local whisper_token="$2"
  local proxy_token="$3"
  
  cat > /srv/config.js << EOF
window.APP_CONFIG = {
  WHISPER_API_URL: '${whisper_url}',
  WHISPER_API_TOKEN: '${whisper_token}',
  WHISPER_PROXY_TOKEN: '${proxy_token}',
  USE_SERVER_PROXY: '${USE_SERVER_PROXY}',
  SERVER_PROXY_URL: '${SERVER_PROXY_URL}',
  APP_TITLE: '${APP_TITLE}',
  HEALTH_CHECK_URL: '${HEALTH_CHECK_URL}',
  ENVIRONMENT: '${ENVIRONMENT}',
  HIDE_CREDENTIALS: '${HIDE_CREDENTIALS}',
  ALLOW_CREDENTIAL_EDIT: '${ALLOW_CREDENTIAL_EDIT}'
};
EOF
}

# プロキシ設定生成関数
generate_proxy_config() {
  local target_url="$1"
  local auth_header="$2"
  
  mkdir -p /etc/caddy/conf.d
  
  cat > /etc/caddy/conf.d/proxy.conf << EOF
# Whisper APIへのプロキシ設定
handle /whisper/* {
    uri strip_prefix /whisper
    reverse_proxy ${target_url} {
        header_up Host {upstream_hostport}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
        header_up X-Forwarded-Host {host}
        header_up User-Agent {>User-Agent}${auth_header}
    }
}
EOF
}

# 設定ファイルの生成
if [ "${HIDE_CREDENTIALS}" = "true" ]; then
  generate_config "" "" ""
else
  generate_config "${WHISPER_API_URL}" "${WHISPER_API_TOKEN}" "${WHISPER_PROXY_TOKEN}"
fi

# プロキシ設定の処理
if [ "${USE_SERVER_PROXY}" = "true" ]; then
  # HIDE_CREDENTIALS=falseの場合、認証情報がある場合でもクライアント側で直接APIを呼び出せるように
  # プロキシではSERVER_PROXY_URLを使用し、認証はクライアント側で処理
  if [ "${HIDE_CREDENTIALS}" = "false" ] && [ -n "${WHISPER_API_TOKEN}" ]; then
    generate_proxy_config "${SERVER_PROXY_URL}" ""
    echo "クライアント認証モード用のプロキシ設定ファイルを生成しました"
  elif [ "${HIDE_CREDENTIALS}" = "true" ] && [ -n "${WHISPER_API_TOKEN}" ]; then
    generate_proxy_config "${WHISPER_API_URL}" "
        header_up Authorization \"Bearer ${WHISPER_API_TOKEN}\""
    echo "サーバー認証モード用のプロキシ設定ファイルを生成しました"
  else
    generate_proxy_config "${SERVER_PROXY_URL}" ""
    echo "標準プロキシ設定ファイルを生成しました"
  fi
else
  [ -f /etc/caddy/conf.d/proxy.conf ] && rm /etc/caddy/conf.d/proxy.conf
  echo "プロキシモードが無効なため、プロキシ設定ファイルは生成/削除しました"
fi

# ビルド済みファイルのコピー
cp -r /app/dist/* /srv/

# Caddyの起動
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile