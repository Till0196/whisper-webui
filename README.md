# Whisper WebUI

ブラウザベースのWhisper音声文字起こしツール。WebAssemblyベースのFFmpegを使用して、クライアントサイドで音声ファイルの変換を行い、Whisper APIを使用して文字起こしを実行します。

## 特徴

### 音声処理
- WebAssembly版FFmpegによるクライアントサイド音声変換
- 音声ファイルの自動分割処理
- 進捗状況のリアルタイム表示
- 処理時間と総再生時間の表示

### 文字起こし機能
- 複数の出力フォーマット対応（VTT, SRT, JSON, テキスト）
- タイムスタンプの粒度設定（単語単位/セグメント単位）
- VADフィルター対応
- プロンプトとホットワード機能
- 温度パラメータの調整機能

### 多言語対応
- 日本語/英語インターフェース
- 自動言語検出機能
- 複数言語モデル対応

### サーバー設定
- カスタムサーバーURL設定
- APIキー認証対応
- ヘルスチェック機能
- プロキシモード対応

### UI/UX
- ドラッグ＆ドロップによるファイルアップロード
- ダークモード/ライトモード自動切替
- リアルタイム進捗表示
- 処理ステータスの視覚的フィードバック
- 詳細なログ表示

## 使用方法

1. サーバー設定
   - WhisperサーバーのURLを設定
   - 必要に応じてAPIキーを設定
   - ヘルスチェックの有効/無効を設定

2. 文字起こし設定
   - 使用するモデルを選択
   - 言語設定（自動検出または特定の言語を選択）
   - タイムスタンプの粒度を設定
   - 必要に応じてVADフィルターを有効化
   - プロンプトやホットワードを設定
   - 温度パラメータを調整

3. ファイル処理
   - 音声ファイルをドラッグ＆ドロップまたはクリックして選択
   - 処理の進捗状況を確認
   - 完了後、必要なフォーマットでダウンロード

## 技術スタック

- React
- TypeScript
- Material-UI (MUI)
- FFmpeg (WebAssembly)
- Whisper API

## 環境変数

```env
VITE_WHISPER_API_URL=http://localhost:9000  # WhisperサーバーのデフォルトURL
VITE_WHISPER_API_TOKEN=                     # デフォルトのAPIキー
VITE_HEALTH_CHECK_URL=                      # ヘルスチェックURL
VITE_USE_SERVER_PROXY=false                 # プロキシモードの有効/無効
VITE_HIDE_CREDENTIALS=false                 # 認証情報を隠すかどうか
VITE_ALLOW_CREDENTIAL_EDIT=true             # プロキシモード無効時に認証情報の編集を許可するか
```

## 設定方法

### 開発環境

開発環境では、`.env`ファイルを使用して設定します：

```
VITE_WHISPER_API_URL=http://localhost:9000
VITE_WHISPER_API_TOKEN=
VITE_USE_SERVER_PROXY=false
VITE_SERVER_PROXY_URL=http://localhost:9000
VITE_APP_TITLE=Whisper WebUI
VITE_HEALTH_CHECK_URL=
VITE_ENVIRONMENT=development
```

### 本番環境

本番環境（ビルド後のSPA）では、`public/config.js`を使用します：

1. `public/config.js.example`を`public/config.js`にコピーします
2. 必要に応じて設定を変更します

```js
window.APP_CONFIG = {
  WHISPER_API_URL: "http://localhost:9000",
  WHISPER_API_TOKEN: "",
  USE_SERVER_PROXY: "false",
  SERVER_PROXY_URL: "http://localhost:9000",
  APP_TITLE: "Whisper WebUI",
  HEALTH_CHECK_URL: "",
  ENVIRONMENT: "production",
  HIDE_CREDENTIALS: "false",
  ALLOW_CREDENTIAL_EDIT: "true"
};
```

この方法により、Dockerコンテナを再ビルドすることなく設定を変更できます。

## ローカル開発

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# ビルド
npm run build
```

## 注意事項

- 音声ファイルへの変換はクライアントサイドで処理されるため、ブラウザのメモリ制限に注意が必要です
- 大きなファイルは自動的に分割して処理されます
- APIキーは環境変数またはUIから設定可能です
- ブラウザのローカルストレージに設定が保存されます

## セキュリティ設定

### 認証情報の保護

APIエンドポイントとトークンを隠すには、以下の設定を行います：

1. 環境変数またはconfig.jsで`HIDE_CREDENTIALS`を`true`に設定
2. 必要に応じて`ALLOW_CREDENTIAL_EDIT`の設定を変更
   - `true`: プロキシモードが無効の場合に編集可能
   - `false`: 常に編集不可

例（Docker-composeの場合）:
```yaml
environment:
  HIDE_CREDENTIALS: "true"
  ALLOW_CREDENTIAL_EDIT: "false"
```

### プロキシモード

プロキシモードを有効にすると、クライアントはサーバーを介してWhisper APIにアクセスします。
これにより、クライアント側でAPIキーを扱う必要がなくなり、セキュリティが向上します。

1. `USE_SERVER_PROXY`を`true`に設定
2. サーバー側のCaddyがAPIリクエストを中継
3. 必要に応じて`HIDE_CREDENTIALS`を設定し、UIでの表示を制限

プロキシモード有効時は `/whisper` エンドポイントを通じてAPIリクエストが中継されます。

# プロキシモードの強制無効化

サーバープロキシモードを強制的に無効化し、UIでの変更を禁止するには：

```
# .env または環境変数
USE_SERVER_PROXY=false
VITE_USE_SERVER_PROXY=false
```

または、Docker Composeの場合：

```yaml
environment:
  USE_SERVER_PROXY: "false"
  VITE_USE_SERVER_PROXY: "false"
```

この設定を行うと、UIでサーバープロキシのトグルが無効化され、常にクライアント側から直接APIにアクセスするようになります。