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

## 使用方法

### 1. サーバー設定

#### プロキシモード vs ダイレクトモード

**プロキシモード（推奨・セキュア）**
- サーバーを経由してWhisper APIにアクセス
- クライアント側でAPIキーを扱わない
- 設定値はサーバーから取得・表示（編集不可）
- 本番環境での使用に適している

**ダイレクトモード（開発・テスト用）**
- クライアントから直接Whisper APIにアクセス
- APIエンドポイントとキーを自由に設定可能
- 開発・テスト環境での使用に適している

#### 設定手順
1. **モード選択**: サーバープロキシのトグルでモードを切り替え
2. **プロキシモード時**: 
   - サーバーから取得した設定値が表示される
   - URL・APIキー・認証状態は編集不可
   - 「リセット」ボタンでUIの表示をサーバー設定に戻す（即座に適用されない）
   - 「適用」ボタンで設定を確定し、API接続状態を更新
3. **ダイレクトモード時**:
   - WhisperサーバーのURLを入力
   - 必要に応じてAPIキーを設定
   - 認証の有効/無効を選択
   - 「リセット」ボタンでUIの表示をデフォルト設定に戻す（即座に適用されない）
   - 「適用」ボタンで設定を保存・確定し、API接続状態を更新

#### 重要な動作仕様
- **「適用」ボタンの効果**: 設定を確定後、自動的にヘルスチェック、モデルリスト、言語リストを再取得
- **「リセット」ボタンの効果**: UIの表示状態のみをリセット（実際の設定変更は「適用」まで保留）
- **モード切り替え時**: UI状態とバックエンド状態が自動的に同期され、適切なエンドポイントが使用される

### 2. 文字起こし設定
- 使用するモデルを選択
- 言語設定（自動検出または特定の言語を選択）
- タイムスタンプの粒度を設定
- 必要に応じてVADフィルターを有効化
- プロンプトやホットワードを設定
- 温度パラメータを調整

### 3. ファイル処理
- 音声ファイルをドラッグ＆ドロップまたはクリックして選択
- 処理の進捗状況を確認
- 完了後、必要なフォーマットでダウンロード

## 技術スタック

### フロントエンド
- **React 18**: 最新のフック機能とConcurrent Features
- **TypeScript**: 型安全性とコード品質の向上
- **Material-UI (MUI)**: モダンなUIコンポーネント
- **i18next**: 多言語対応（日本語・英語）

### 状態管理
- **カスタムState Manager**: Zustandライクな軽量状態管理
- **モード別設定**: プロキシ/ダイレクトモードで独立した設定管理と分離保存
- **UI/バックエンド同期**: リアルタイムな状態同期とタイミング制御
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

## 設定変数一覧

### 基本設定
```env
# API接続設定
VITE_WHISPER_API_URL=http://localhost:9000     # Whisper APIのデフォルトURL
VITE_WHISPER_API_TOKEN=                        # デフォルトAPIキー
VITE_HEALTH_CHECK_URL=                         # ヘルスチェックエンドポイント

# プロキシ設定
VITE_USE_SERVER_PROXY=false                    # プロキシモードの有効/無効
VITE_SERVER_PROXY_URL=http://localhost:9000    # プロキシサーバーのURL

# セキュリティ設定
VITE_HIDE_CREDENTIALS=false                    # 認証情報の表示/非表示
VITE_ALLOW_CREDENTIAL_EDIT=true                # 認証情報の編集許可

# アプリケーション設定
VITE_APP_TITLE=Whisper WebUI                   # アプリタイトル
VITE_ENVIRONMENT=development                   # 環境識別子
```

### 本番環境用設定（config.js）
```env
# サーバーサイド設定（config.jsで使用）
WHISPER_API_URL=http://localhost:9000          # サーバー用Whisper API URL
WHISPER_API_TOKEN=                             # サーバー用APIキー
USE_SERVER_PROXY=false                         # サーバー用プロキシ設定
SERVER_PROXY_URL=http://localhost:9000         # サーバー用プロキシURL
HIDE_CREDENTIALS=false                         # サーバー用認証情報保護
ALLOW_CREDENTIAL_EDIT=true                     # サーバー用編集許可設定
APP_TITLE=Whisper WebUI                        # サーバー用アプリタイトル
ENVIRONMENT=production                         # サーバー用環境識別子
```

## 設定方法

### 開発環境

開発環境では、`.env`ファイルを使用して設定します：

```
VITE_WHISPER_API_URL=http://localhost:9000
VITE_WHISPER_API_TOKEN=
VITE_USE_SERVER_PROXY=false
VITE_SERVER_PROXY_URL=http://localhost:9000
VITE_WHISPER_PROXY_TOKEN=
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
  WHISPER_PROXY_TOKEN: "",
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

### プロキシモード時のトークン設定

プロキシモードでは、通常Whisper APIサーバーへの認証はサーバー側で処理されますが、一部のWhisperサーバー実装ではプロキシ経由でもクライアントからのAPIトークンが必要な場合があります。

- **デフォルト動作**: プロキシモード時はAPIトークンフィールドは空白
- **トークンが必要な場合**: 環境変数 `VITE_WHISPER_PROXY_TOKEN` またはUIから設定可能
- **自動検出**: 環境変数でトークンが設定されている場合、プロキシモード時に自動的に表示・使用されます
- **編集制御**: `allowCredentialEdit=true` かつ `hideCredentials=false` の場合のみ編集可能

```bash
# プロキシモード用のAPIトークンを設定（必要に応じて）
VITE_WHISPER_PROXY_TOKEN=your_proxy_token_here
```

## セキュリティ設定とモード管理

### プロキシモード vs ダイレクトモード

#### プロキシモード（本番環境推奨）
- **セキュリティ**: クライアント側でAPIキーを保持しない
- **設定管理**: サーバーから設定値を取得・表示
- **編集制限**: URL・APIキー・認証状態は編集不可
- **用途**: 本番環境、セキュアな運用

```env
# プロキシモード有効化
USE_SERVER_PROXY=true
VITE_USE_SERVER_PROXY=true
SERVER_PROXY_URL=https://your-proxy-server.com
```

#### ダイレクトモード（開発・テスト用）
- **柔軟性**: APIエンドポイントとキーを自由に設定可能
- **設定管理**: ローカル設定値の保存・復元
- **編集自由**: 全ての設定項目が編集可能
- **用途**: 開発環境、テスト環境

```env
# ダイレクトモード有効化
USE_SERVER_PROXY=false
VITE_USE_SERVER_PROXY=false
```

### 認証情報保護機能

#### レベル1: 認証情報非表示
設定値を`********`で隠し、表示のみ制限

```env
HIDE_CREDENTIALS=true
VITE_HIDE_CREDENTIALS=true
```

#### レベル2: 編集完全禁止
認証情報の表示・編集を完全に制限し、プロキシモードを強制

```env
HIDE_CREDENTIALS=true
ALLOW_CREDENTIAL_EDIT=false
VITE_HIDE_CREDENTIALS=true
VITE_ALLOW_CREDENTIAL_EDIT=false
```

### モード別設定管理

#### 設定の分離と保存
- **プロキシモード設定**: `whisper-webui-proxy-settings`キーで保存
- **ダイレクトモード設定**: `whisper-webui-direct-settings`キーで保存
- **モード切り替え**: 各モードの設定値を自動的に復元・同期
- **適用機能**: 設定確定と同時にAPI接続状態を自動更新
- **リセット機能**: UIの表示をデフォルト設定に戻す（適用まで保留）

#### 設定の優先順位
1. **ユーザー設定** (LocalStorage)
2. **config.js設定** (本番環境)
3. **環境変数** (.env)
4. **デフォルト値** (ハードコード)

### Docker Compose設定例

#### セキュア運用（プロキシモード）
```yaml
services:
  whisper-webui:
    environment:
      # プロキシモード有効化
      USE_SERVER_PROXY: "true"
      VITE_USE_SERVER_PROXY: "true"
      
      # 認証情報保護
      HIDE_CREDENTIALS: "true"
      ALLOW_CREDENTIAL_EDIT: "false"
      
      # API設定（サーバー側）
      WHISPER_API_URL: "https://api.openai.com/v1"
      WHISPER_API_TOKEN: "sk-your-api-key"
      SERVER_PROXY_URL: "https://your-proxy-server.com"
      WHISPER_PROXY_TOKEN: "your-proxy-specific-token"
```

#### 開発環境（ダイレクトモード）
```yaml
services:
  whisper-webui:
    environment:
      # ダイレクトモード有効化
      USE_SERVER_PROXY: "false"
      VITE_USE_SERVER_PROXY: "false"
      
      # 認証情報編集許可
      HIDE_CREDENTIALS: "false"
      ALLOW_CREDENTIAL_EDIT: "true"
      
      # デフォルト設定
      VITE_WHISPER_API_URL: "http://localhost:9000"
      VITE_WHISPER_API_TOKEN: ""
```

### UI制御とユーザビリティ

#### モード別UI表示
- **プロキシモード時**: 
  - 設定フィールドは読み取り専用
  - 「プロキシモード時は表示のみ」警告表示
  - サーバー設定値を動的に取得・表示
  
- **ダイレクトモード時**:
  - 全ての設定フィールドが編集可能
  - ローカル設定値の保存・復元
  - リアルタイムバリデーション

#### 認証情報保護時の制御
- **HIDE_CREDENTIALS=true**: 設定値を`********`で隠す
- **ALLOW_CREDENTIAL_EDIT=false**: プロキシモードを強制、編集UI無効化
- **制約表示**: 適切な警告メッセージとアイコン表示

## プロキシモード時のトークン設定

### トークン自動検出の優先順位

プロキシモードでは、以下の優先順位でトークンが自動検出され、UIに表示されます：

1. **保存されている設定値** - ユーザーが以前に設定した値
2. **プロキシ専用環境変数** - `WHISPER_PROXY_TOKEN` / `VITE_WHISPER_PROXY_TOKEN`
3. **一般的なAPI設定** - `WHISPER_API_TOKEN` / `VITE_WHISPER_API_TOKEN`

### 環境変数設定例

#### サーバー側（config.js または環境変数）
```javascript
// config.js
window.APP_CONFIG = {
  // プロキシ専用のトークン設定
  WHISPER_PROXY_TOKEN: "proxy-specific-token",
  
  // または一般的なAPI設定
  WHISPER_API_TOKEN: "general-api-token",
  
  // プロキシサーバーURL
  SERVER_PROXY_URL: "/api/transcribe"
};
```

#### クライアント側（.env ファイル）
```bash
# プロキシ専用トークン（優先）
VITE_WHISPER_PROXY_TOKEN=proxy-specific-token

# 一般的なAPIトークン（フォールバック）
VITE_WHISPER_API_TOKEN=general-api-token

# プロキシサーバーURL
VITE_SERVER_PROXY_URL=/api/transcribe
```

### トークン編集の可否条件

プロキシモード時のトークン編集は以下の条件で制御されます：

- **編集可能**: `ALLOW_CREDENTIAL_EDIT=true` かつ `HIDE_CREDENTIALS=false`
- **読み取り専用**: `ALLOW_CREDENTIAL_EDIT=false` または `HIDE_CREDENTIALS=true`

### 実装の動作

1. **初期表示**: 環境変数またはconfig.jsからトークンを自動検出
2. **モード切替**: プロキシ⇔ダイレクトモード切替時に適切な値を自動設定
3. **設定保存**: モード別にローカルストレージに設定を分離保存
4. **リセット機能**: 現在のモードのデフォルト設定に戻す機能

### 実用例

一部のWhisperサーバー実装では、プロキシ経由でもAPIトークンによる認証が必要な場合があります。この実装により、そのようなケースでも適切にトークン設定を管理できます。