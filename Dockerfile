FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM caddy:2-alpine AS release

# 必要なパッケージのインストール
RUN apk add --no-cache gettext

# 作業ディレクトリの作成
WORKDIR /srv

# 必要なディレクトリの作成
RUN mkdir -p /etc/caddy/conf.d

# ビルド済みファイルのコピー
COPY --from=builder /app/dist /app/dist

# entrypoint.shのコピーと実行権限の付与
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Caddyfileのコピー
COPY Caddyfile /etc/caddy/Caddyfile

# エントリーポイントの設定
ENTRYPOINT ["/entrypoint.sh"]
