#!/bin/bash
cd "$(dirname "$0")"
echo "📈 投資ウォッチリストをデプロイ中..."
git add .
git commit -m "update: $(date '+%Y-%m-%d %H:%M')"
git push
echo ""
echo "✅ デプロイ完了！Vercelが自動で更新されます。"
read -p "Enterキーで閉じる..."
