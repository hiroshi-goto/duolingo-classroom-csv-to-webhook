# Duolingo Classroom CSV to Webhook

Duolingo Classroom の Activity Report CSV を自動ダウンロードし、JSON 形式に変換して Webhook に POST するツールです。

## 機能

- Google OAuth を使用して Duolingo Classroom にログイン
- 指定したクラスの Activity Report CSV をダウンロード
- CSV を JSON 形式に変換
- Webhook URL に POST
- GitHub Actions による定期実行（毎日 16:50 JST）

## セットアップ

### 1. GitHub Secrets の設定

リポジトリの Settings → Secrets and variables → Actions で以下の Secrets を設定してください：

| Secret 名 | 説明 |
|-----------|------|
| `GOOGLE_EMAIL` | Google アカウントのメールアドレス |
| `GOOGLE_PASSWORD` | Google アカウントのパスワード |
| `WEBHOOK_URL` | データを POST する Webhook URL |

### 2. Google アカウントの準備

**重要**: Google アカウントで以下の設定が必要な場合があります：

1. **2段階認証が有効な場合**: アプリパスワードを生成して `GOOGLE_PASSWORD` に設定
2. **「安全性の低いアプリのアクセス」**: 有効にする（非推奨、可能ならアプリパスワードを使用）

### 3. 手動実行

GitHub Actions の「Actions」タブから「Export Duolingo Classroom CSV」ワークフローを選択し、「Run workflow」ボタンで手動実行できます。

## ローカル実行

### 前提条件

- Node.js 20.x 以上
- npm

### インストール

```bash
npm install
npx playwright install chromium --with-deps
```

### ビルド

```bash
npm run build
```

### 実行

```bash
export GOOGLE_EMAIL="your-email@gmail.com"
export GOOGLE_PASSWORD="your-password"
export WEBHOOK_URL="https://your-webhook-url.com/endpoint"
export CLASS_NAME="GotoFamily"  # オプション（デフォルト: GotoFamily）
export HEADLESS="true"          # オプション（デフォルト: true）

npm start
```

## JSON 出力形式

```json
{
  "exported_at": "2024-01-15T07:50:00.000Z",
  "members": [
    {
      "full_name": "フルネーム",
      "username": "ユーザー名",
      "email": "メールアドレス",
      "class": "クラス名",
      "language": "学習言語",
      "streak": 30,
      "completed_units": 15,
      "completion_rate": "75%",
      "study_days": 45,
      "total_xp": 12500,
      "study_time": "10h 30m",
      "other": "",
      "lessons": 120
    }
  ]
}
```

## スケジュール

GitHub Actions は毎日 07:50 UTC（= 16:50 JST）に実行されます。

`.github/workflows/export-csv.yml` の cron 式を変更することでスケジュールを調整できます。

## トラブルシューティング

### ログイン失敗

1. **Secrets の確認**: GOOGLE_EMAIL と GOOGLE_PASSWORD が正しく設定されているか確認
2. **2段階認証**: 有効な場合はアプリパスワードを使用
3. **スクリーンショット**: ワークフロー失敗時は Artifacts からスクリーンショットをダウンロードして確認

### ダウンロード失敗

1. **クラス名の確認**: CLASS_NAME が正しいか確認
2. **UI変更**: Duolingo の UI が変更された可能性があります。スクリーンショットを確認してセレクタを更新

### Webhook エラー

1. **URL の確認**: WEBHOOK_URL が正しいか確認
2. **レスポンス**: ログでエラーメッセージを確認

## ファイル構成

```
.
├── .github/workflows/
│   └── export-csv.yml    # GitHub Actions ワークフロー
├── src/
│   ├── index.ts          # メインエントリポイント
│   ├── duolingo.ts       # Duolingo ログイン・ダウンロード
│   ├── csv-parser.ts     # CSV パーサー
│   ├── webhook.ts        # Webhook POST
│   └── types.ts          # 型定義
├── package.json
├── tsconfig.json
└── README.md
```

## 注意事項

- このツールは Playwright を使用したブラウザ自動化を行います
- Google のボット検出により、ログインがブロックされる場合があります
- 本番環境では適切な認証方法（アプリパスワード等）を使用してください
- Duolingo の利用規約に従ってご使用ください

## ライセンス

MIT
