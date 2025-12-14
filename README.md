# Duolingo Classroom CSV to Webhook

Duolingo Classroom の Activity Report CSV を自動ダウンロードし、JSON 形式に変換して Webhook に POST するツールです。

## 機能

- セッション情報を使用して Duolingo Classroom にアクセス
- 指定したクラスの Activity Report CSV をダウンロード
- CSV を JSON 形式に変換
- Webhook URL に POST
- GitHub Actions による定期実行（毎日 16:50 JST）

## セットアップ

### 1. セッション情報の取得

ローカルの Chrome で既にログイン済みの場合、そのセッション情報を取得できます。

```bash
npm install
npm run save-auth
```

**注意**: 実行前に Chrome を閉じてください。

Chrome が起動し、既にログイン済みであれば自動的にセッション情報が `duolingo-session.txt` に保存されます。

### 2. GitHub Secrets の設定

リポジトリの Settings → Secrets and variables → Actions で以下の Secrets を設定してください：

| Secret 名 | 説明 |
|-----------|------|
| `DUOLINGO_SESSION` | `duolingo-session.txt` の内容 |
| `WEBHOOK_URL` | データを POST する Webhook URL |
| `CLASS_NAME` | Duolingo Classroom のクラス名 |

gh コマンドで設定する場合:

```bash
gh secret set DUOLINGO_SESSION < duolingo-session.txt
gh secret set WEBHOOK_URL
gh secret set CLASS_NAME
```

### 3. 手動実行

GitHub Actions の「Actions」タブから「Export Duolingo Classroom CSV」ワークフローを選択し、「Run workflow」ボタンで手動実行できます。

## セッションの更新

セッション情報は有効期限があります。ログインが失敗した場合は、再度 `npm run save-auth` を実行してセッション情報を更新してください。

## ローカル実行

### 前提条件

- Node.js 20.x 以上
- npm

### インストール

```bash
npm install
```

### ビルド

```bash
npm run build
```

### 実行

```bash
export DUOLINGO_SESSION="$(cat duolingo-session.txt)"
export WEBHOOK_URL="https://your-webhook-url.com/endpoint"
export CLASS_NAME="YourClassName"
export HEADLESS="true"  # オプション（デフォルト: true）

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

### セッション期限切れ

「Session expired」エラーが表示された場合:
1. ローカルで `npm run save-auth` を実行
2. `duolingo-session.txt` の内容を `DUOLINGO_SESSION` Secret に再設定

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
│   ├── duolingo.ts       # Duolingo アクセス・ダウンロード
│   ├── save-auth.ts      # セッション情報保存スクリプト
│   ├── csv-parser.ts     # CSV パーサー
│   ├── webhook.ts        # Webhook POST
│   └── types.ts          # 型定義
├── package.json
├── tsconfig.json
└── README.md
```

## 注意事項

- このツールは Playwright を使用したブラウザ自動化を行います
- セッション情報には認証情報が含まれます。安全に管理してください
- Duolingo の利用規約に従ってご使用ください

## ライセンス

MIT
