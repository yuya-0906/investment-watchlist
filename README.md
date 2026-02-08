# 📈 投資ウォッチリスト

投資したい銘柄を管理するWebアプリ。スマホからもサクッと使えます。

## 機能

- 銘柄の追加・編集・削除
- 目標購入価格の設定と通知
- 優先度管理（高・中・低）
- 検索・フィルター・ソート
- データのエクスポート/インポート（JSON）
- PWA対応（ホーム画面に追加可能）

## セットアップ

```bash
npm install
npm run dev
```

## デプロイ（Vercel）

1. GitHubにリポジトリを作成してpush
2. [Vercel](https://vercel.com) でGitHubリポジトリをインポート
3. 自動でビルド＆デプロイされます

## 技術スタック

- React 19 + Vite
- Tailwind CSS v4
- localStorage（データ永続化）
