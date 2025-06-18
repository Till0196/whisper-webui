# Whisper WebUI

ブラウザベースのWhisper音声文字起こしツール。WebAssemblyベースのFFmpegを使用して、クライアントサイドで音声ファイルの変換を行い、Whisper APIを使用して文字起こしを実行します。

## 📋 目次

- [クイックスタート](#クイックスタート)
- [特徴](#特徴)
- [使用方法](#使用方法)
- [技術スタック](#技術スタック)
- [設定方法](#設定方法)
- [セキュリティとモード管理](#セキュリティとモード管理)
- [ローカル開発](#ローカル開発)
- [トラブルシューティング](#トラブルシューティング)
- [設定変数リファレンス](#設定変数リファレンス)

## 🚀 クイックスタート

### Docker Composeで簡単起動

```bash
# リポジトリをクローン
git clone [repository-url]
cd whisper-webui

# 設定ファイルをコピー
cp public/config.js.example public/config.js

# コンテナを起動
docker-compose up -d
```

ブラウザで http://localhost:3000 にアクセスして利用開始！

### 基本的な使い方

1. **サーバー設定**: プロキシモード（推奨）またはダイレクトモードを選択
2. **音声ファイル**: ドラッグ&ドロップでアップロード
3. **設定調整**: モデル、言語、出力フォーマットを選択
4. **文字起こし実行**: 処理完了後、結果をダウンロード

> 💡 **ヒント**: 初回利用時はプロキシモードがセキュアで推奨です

## ✨ 特徴

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

### 高度なサーバー設定
- **プロキシモード/ダイレクトモード**: セキュアな2つの接続方式
- **モード別設定管理**: 各モードで独立した設定値の保存・復元
- **認証情報保護**: 本番環境での安全な認証情報管理
- **動的設定切り替え**: UIから直感的なモード切り替え
- **ヘルスチェック機能**: API接続状態のリアルタイム監視

### UI/UX
- ドラッグ＆ドロップによるファイルアップロード
- ダークモード/ライトモード自動切替
- リアルタイム進捗表示
- 処理ステータスの視覚的フィードバック
- 詳細なログ表示
- **直感的な設定UI**: モードに応じた編集可否制御と適切な説明表示

## 📖 使用方法

### 1. サーバー設定

#### プロキシモード vs ダイレクトモード

| 項目 | プロキシモード | ダイレクトモード |
|------|----------------|-------------------|
| **セキュリティ** | 🔒 高（APIキーをサーバーで管理） | ⚠️ 低（APIキーをクライアントで管理） |
| **設定の自由度** | 制限あり | 自由に設定可能 |
| **推奨環境** | 本番環境 | 開発・テスト環境 |
| **API接続** | サーバー経由 | 直接接続 |

#### 設定手順
1. **モード選択**: サーバープロキシのトグルでモードを切り替え
2. **プロキシモード時**: 
   - サーバーから取得した設定値が表示される
   - URL・APIキー・認証状態は編集不可
   - 「リセット」→「適用」で設定を確定
3. **ダイレクトモード時**:
   - WhisperサーバーのURLを入力
   - 必要に応じてAPIキーを設定
   - 「リセット」→「適用」で設定を保存

> ⚠️ **重要**: 「適用」ボタンで設定確定後、自動的にヘルスチェックとAPI接続テストが実行されます

### 2. 文字起こし設定
- **モデル選択**: 用途に応じて適切なWhisperモデルを選択
- **言語設定**: 自動検出または特定の言語を選択
- **タイムスタンプ**: 単語単位またはセグメント単位を選択
- **高度な設定**: VADフィルター、プロンプト、ホットワード、温度パラメータ

### 3. ファイル処理
- **アップロード**: ドラッグ&ドロップまたはファイル選択
- **進捗確認**: リアルタイムで処理状況を監視
- **結果取得**: VTT、SRT、JSON、テキスト形式でダウンロード

## 🛠️ 技術スタック

### フロントエンド
- **React 18**: 最新のフック機能とConcurrent Features
- **TypeScript**: 型安全性とコード品質の向上
- **Material-UI (MUI)**: モダンなUIコンポーネント
- **i18next**: 多言語対応（日本語・英語）

### 状態管理
- **カスタムState Manager**: Zustandライクな軽量状態管理
- **モード別設定**: プロキシ/ダイレクトモードで独立した設定管理
- **LocalStorage連携**: 設定値の永続化と自動復元
- **React Hooks**: useCallback/useMemoによる最適化

### オーディオ処理
- **FFmpeg (WebAssembly)**: クライアントサイド音声変換
- **Web Audio API**: 音声ファイル解析
- **Blob API**: ファイル操作

### API通信
- **Fetch API**: RESTful API通信
- **Whisper API**: 音声文字起こしエンジン
- **プロキシ対応**: セキュアなAPI中継機能

## ⚙️ 設定方法

### 開発環境での設定

`.env`ファイルを作成して設定します：

```env
# API設定
VITE_WHISPER_API_URL=http://localhost:9000
VITE_WHISPER_API_TOKEN=

# プロキシ設定
VITE_USE_SERVER_PROXY=false
VITE_SERVER_PROXY_URL=http://localhost:9000
VITE_WHISPER_PROXY_TOKEN=


# その他
VITE_APP_TITLE=Whisper WebUI
VITE_ENVIRONMENT=development
```

### 本番環境での設定

`public/config.js`を使用してコンテナ起動後でも設定変更可能：

```bash
# 設定ファイルをコピー
cp public/config.js.example public/config.js
```

```javascript
window.APP_CONFIG = {
  WHISPER_API_URL: "http://localhost:9000",
  USE_SERVER_PROXY: "false",
  APP_TITLE: "Whisper WebUI",
  ENVIRONMENT: "production",
  HIDE_CREDENTIALS: "false",
  ALLOW_CREDENTIAL_EDIT: "true"
};
```

> 💡 **利点**: Dockerコンテナを再ビルドせずに設定変更可能

## 🖥️ ローカル開発

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動（ホットリロード有効）
npm run dev

# 本番ビルド
npm run build

# ビルドしたファイルのプレビュー
npm run preview
```

### 認証情報保護機能

#### レベル1: 認証情報の隠匿表示
```env
HIDE_CREDENTIALS=true
VITE_HIDE_CREDENTIALS=true
```

#### レベル2: 編集権限の完全制限
```env
HIDE_CREDENTIALS=true
ALLOW_CREDENTIAL_EDIT=false
```

### Docker Compose設定例

#### 本番環境（セキュア運用）
```yaml
services:
  whisper-webui:
    environment:
      USE_SERVER_PROXY: "true"
      WHISPER_API_URL: ""
      WHISPER_PROXY_TOKEN: ""
      HIDE_CREDENTIALS: "true"
      ALLOW_CREDENTIAL_EDIT: "false"
      WHISPER_API_URL: "https://api.openai.com/v1"
      WHISPER_API_TOKEN: "sk-your-api-key"
```

#### 開発環境（柔軟運用）
```yaml
services:
  whisper-webui:
    environment:
      USE_SERVER_PROXY: "false"
      WHISPER_API_URL: ""
      WHISPER_PROXY_TOKEN: ""
      HIDE_CREDENTIALS: "false"
      ALLOW_CREDENTIAL_EDIT: "true"
      WHISPER_API_URL: "http://localhost:9000"
      WHISPER_API_TOKEN: "sk-your-api-key"
```

## ❗ トラブルシューティング

### よくある問題と解決方法

#### API接続エラー
```
問題: "API接続に失敗しました"
解決: 
1. WhisperサーバーのURLを確認
2. ネットワーク接続を確認
3. APIキーの有効性を確認
4. CORSエラーの場合はプロキシモードを使用
```

#### ファイルアップロードの問題
```
問題: "ファイルの変換に失敗しました"
解決:
1. ブラウザのメモリ制限を確認（大きなファイルの場合）
2. サポートされる音声形式を確認
3. ブラウザコンソールでエラーログを確認
```

#### 設定が保存されない
```
問題: 設定変更が反映されない
解決:
1. ブラウザのローカルストレージを確認
2. 「適用」ボタンをクリック
3. ブラウザのキャッシュをクリア
```

### パフォーマンス最適化

- **大きなファイル**: 自動分割機能を活用
- **メモリ使用量**: ブラウザのタスクマネージャーで監視
- **処理速度**: 適切なモデルサイズを選択

## 📚 設定変数リファレンス

### 環境変数一覧

| 変数名 | 説明 | デフォルト値 | 例 |
|--------|------|-------------|-----|
| `VITE_WHISPER_API_URL` | Whisper APIのURL | `http://localhost:9000` | `https://api.openai.com/v1` |
| `VITE_WHISPER_API_TOKEN` | APIトークン | - | `sk-...` |
| `VITE_USE_SERVER_PROXY` | プロキシモード | `false` | `true` |
| `VITE_SERVER_PROXY_URL` | プロキシサーバーURL | - | `http://localhost:9000` |
| `VITE_WHISPER_PROXY_TOKEN` | APIトークン | - | `sk-...` |
| `VITE_HIDE_CREDENTIALS` | 認証情報の隠匿 | `false` | `true` |
| `VITE_ALLOW_CREDENTIAL_EDIT` | 編集許可 | `true` | `false` |
| `VITE_APP_TITLE` | アプリタイトル | `Whisper WebUI` | `音声文字起こしツール` |
| `VITE_ENVIRONMENT` | 環境識別子 | `development` | `production` |

### 設定値の優先順位
1. **ユーザー設定** (UI経由で設定、LocalStorageに保存)
2. **config.js設定** (本番環境、`public/config.js`)
3. **環境変数** (開発環境、`.env`)
4. **デフォルト値** (ハードコード)

### よく使われる設定パターン

#### パターン1: 完全セキュア運用
```env
USE_SERVER_PROXY=true
HIDE_CREDENTIALS=true
ALLOW_CREDENTIAL_EDIT=false
```

#### パターン2: 開発・テスト環境
```env
USE_SERVER_PROXY=false
HIDE_CREDENTIALS=false
ALLOW_CREDENTIAL_EDIT=true
```

#### パターン3: ハイブリッド運用
```env
USE_SERVER_PROXY=true
HIDE_CREDENTIALS=false
ALLOW_CREDENTIAL_EDIT=true
```