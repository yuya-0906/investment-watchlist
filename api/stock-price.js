// Vercel サーバーレス関数
// Yahoo Finance から日本株の株価を取得する中継API
//
// 使い方: GET /api/stock-price?codes=7203,6758,7974
// → 各銘柄の現在価格をJSON で返す

export default async function handler(req, res) {
  // CORS ヘッダー（フロントエンドからのアクセスを許可）
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const { codes } = req.query;

  if (!codes) {
    return res.status(400).json({ error: "codes パラメータが必要です" });
  }

  // カンマ区切りの証券コードを配列にする
  const codeList = codes.split(",").map((c) => c.trim()).filter(Boolean);

  if (codeList.length === 0) {
    return res.status(400).json({ error: "有効な証券コードがありません" });
  }

  // 一度に10銘柄までに制限（API負荷軽減）
  if (codeList.length > 10) {
    return res.status(400).json({ error: "一度に取得できるのは10銘柄までです" });
  }

  try {
    // Yahoo Finance のティッカー形式に変換（日本株は .T をつける）
    const tickers = codeList.map((code) => {
      // すでに .T がついていたらそのまま
      if (code.endsWith(".T")) return code;
      // 数字4桁なら日本株とみなして .T をつける
      if (/^\d{4}$/.test(code)) return `${code}.T`;
      // それ以外はそのまま（米国株など）
      return code;
    });

    const results = {};

    // 各銘柄の株価を取得
    for (const ticker of tickers) {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0",
          },
        });

        if (!response.ok) {
          results[ticker.replace(".T", "")] = { error: "取得失敗" };
          continue;
        }

        const data = await response.json();
        const meta = data?.chart?.result?.[0]?.meta;

        if (meta) {
          const originalCode = ticker.replace(".T", "");
          results[originalCode] = {
            price: meta.regularMarketPrice,
            previousClose: meta.previousClose || meta.chartPreviousClose,
            currency: meta.currency,
            name: meta.shortName || meta.longName || originalCode,
            marketTime: meta.regularMarketTime,
          };
        }
      } catch (err) {
        const originalCode = ticker.replace(".T", "");
        results[originalCode] = { error: "取得失敗" };
      }
    }

    return res.status(200).json({
      success: true,
      data: results,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("株価取得エラー:", err);
    return res.status(500).json({ error: "株価の取得に失敗しました" });
  }
}
