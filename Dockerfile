FROM caddy:2-alpine

# 必要なパッケージのインストール
RUN apk add --no-cache nodejs npm

WORKDIR /app

# アプリケーションのファイルをコピー
COPY . .
COPY Caddyfile /etc/caddy/Caddyfile

# 依存関係のインストール
RUN npm install

# ポートの公開
EXPOSE 3000

# 起動コマンドの設定
CMD npm run build && \
    cp -r /app/dist/* /srv/ && \
    caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
