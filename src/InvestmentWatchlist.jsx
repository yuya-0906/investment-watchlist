import { useState, useEffect, useCallback } from "react";
import { auth, googleProvider, db } from "./firebase";
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";

// ========== ユーティリティ ==========
const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

const formatPrice = (price) => {
  if (!price && price !== 0) return "—";
  return `¥${Number(price).toLocaleString()}`;
};

const getPriorityColor = (priority) => {
  const colors = {
    high: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", badge: "bg-red-500" },
    medium: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-300", badge: "bg-yellow-500" },
    low: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200", badge: "bg-blue-400" },
  };
  return colors[priority] || colors.medium;
};

const getPriorityLabel = (p) => ({ high: "高", medium: "中", low: "低" }[p] || "中");

// ========== ログイン画面 ==========
function LoginScreen({ onLogin, loading }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
        <p className="text-6xl mb-4">📈</p>
        <h1 className="text-2xl font-black text-gray-800 mb-2">投資ウォッチリスト</h1>
        <p className="text-gray-400 text-sm mb-8">
          銘柄を管理して、買い時を逃さない
        </p>
        <button
          onClick={onLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {loading ? "ログイン中..." : "Googleでログイン"}
        </button>
      </div>
    </div>
  );
}

// ========== 通知コンポーネント ==========
function NotificationBanner({ notifications, onDismiss, onDismissAll }) {
  if (notifications.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {notifications.length > 1 && (
        <button
          onClick={onDismissAll}
          className="self-end text-xs text-gray-400 hover:text-gray-600 underline mb-1"
        >
          すべて閉じる
        </button>
      )}
      {notifications.map((n) => (
        <div
          key={n.id}
          className="bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-start gap-3 animate-pulse"
        >
          <span className="text-xl mt-0.5">🔔</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">{n.name}</p>
            <p className="text-xs opacity-90 mt-0.5">{n.message}</p>
          </div>
          <button
            onClick={() => onDismiss(n.id)}
            className="text-white opacity-70 hover:opacity-100 text-lg leading-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// ========== 銘柄カード ==========
function StockCard({ stock, onEdit, onDelete, onUpdatePrice }) {
  const [currentPrice, setCurrentPrice] = useState(stock.currentPrice || "");
  const [isEditing, setIsEditing] = useState(false);
  const priority = getPriorityColor(stock.priority);

  const priceStatus = (() => {
    if (!stock.targetPrice || !stock.currentPrice) return null;
    const target = Number(stock.targetPrice);
    const current = Number(stock.currentPrice);
    if (current <= target) return { label: "買い時！", color: "text-green-600", icon: "✅" };
    const diff = (((current - target) / target) * 100).toFixed(1);
    return { label: `目標まで -${diff}%`, color: "text-orange-500", icon: "⏳" };
  })();

  const handlePriceUpdate = () => {
    if (currentPrice !== "") {
      onUpdatePrice(stock.id, Number(currentPrice));
    }
    setIsEditing(false);
  };

  return (
    <div className={`rounded-2xl border-2 ${priority.border} ${priority.bg} p-5 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full text-white font-bold ${priority.badge}`}>
              {getPriorityLabel(stock.priority)}
            </span>
            {stock.code && (
              <span className="text-xs text-gray-500 font-mono">{stock.code}</span>
            )}
          </div>
          <h3 className="font-bold text-lg text-gray-800 truncate">{stock.name}</h3>
        </div>
        <div className="flex gap-1 ml-2">
          <button
            onClick={() => onEdit(stock)}
            className="p-1.5 rounded-lg hover:bg-white/60 text-gray-400 hover:text-gray-600 transition-colors"
            title="編集"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(stock.id)}
            className="p-1.5 rounded-lg hover:bg-white/60 text-gray-400 hover:text-red-500 transition-colors"
            title="削除"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">目標購入価格</span>
          <span className="font-bold text-gray-700">{formatPrice(stock.targetPrice)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">現在価格</span>
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
                className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-lg text-right"
                onKeyDown={(e) => e.key === "Enter" && handlePriceUpdate()}
                autoFocus
              />
              <button
                onClick={handlePriceUpdate}
                className="text-xs bg-gray-700 text-white px-2 py-1 rounded-lg hover:bg-gray-600"
              >
                更新
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setCurrentPrice(stock.currentPrice || "");
                setIsEditing(true);
              }}
              className="font-bold text-gray-700 hover:text-blue-600 transition-colors cursor-pointer"
            >
              {stock.currentPrice ? formatPrice(stock.currentPrice) : "価格を入力 →"}
            </button>
          )}
        </div>
      </div>

      {priceStatus && (
        <div className={`flex items-center gap-1.5 text-sm font-bold ${priceStatus.color} mb-3`}>
          <span>{priceStatus.icon}</span>
          <span>{priceStatus.label}</span>
        </div>
      )}

      {stock.memo && (
        <p className="text-sm text-gray-600 bg-white/50 rounded-xl px-3 py-2 leading-relaxed">
          {stock.memo}
        </p>
      )}

      {stock.addedAt && (
        <p className="text-xs text-gray-400 mt-3">
          追加日: {new Date(stock.addedAt).toLocaleDateString("ja-JP")}
        </p>
      )}
    </div>
  );
}

// ========== 銘柄追加/編集フォーム ==========
function StockForm({ stock, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: stock?.name || "",
    code: stock?.code || "",
    targetPrice: stock?.targetPrice || "",
    currentPrice: stock?.currentPrice || "",
    memo: stock?.memo || "",
    priority: stock?.priority || "medium",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      ...stock,
      id: stock?.id || generateId(),
      name: form.name.trim(),
      code: form.code.trim(),
      targetPrice: form.targetPrice ? Number(form.targetPrice) : null,
      currentPrice: form.currentPrice ? Number(form.currentPrice) : null,
      memo: form.memo.trim(),
      priority: form.priority,
      addedAt: stock?.addedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-xl font-bold text-gray-800">
          {stock ? "銘柄を編集" : "新しい銘柄を追加"}
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">銘柄名 *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="例: トヨタ自動車"
            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none transition-colors"
            required
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">証券コード</label>
          <input
            type="text"
            value={form.code}
            onChange={(e) => update("code", e.target.value)}
            placeholder="例: 7203"
            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">目標購入価格 (¥)</label>
            <input
              type="number"
              value={form.targetPrice}
              onChange={(e) => update("targetPrice", e.target.value)}
              placeholder="2500"
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">現在価格 (¥)</label>
            <input
              type="number"
              value={form.currentPrice}
              onChange={(e) => update("currentPrice", e.target.value)}
              placeholder="2800"
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">優先度</label>
          <div className="flex gap-2">
            {[
              { value: "high", label: "高 🔥", color: "bg-red-500" },
              { value: "medium", label: "中", color: "bg-yellow-500" },
              { value: "low", label: "低", color: "bg-blue-400" },
            ].map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => update("priority", p.value)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                  form.priority === p.value
                    ? `${p.color} text-white shadow-md scale-105`
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">メモ</label>
          <textarea
            value={form.memo}
            onChange={(e) => update("memo", e.target.value)}
            placeholder="投資理由や気になるポイントなど..."
            rows={3}
            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none transition-colors resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md"
          >
            {stock ? "更新する" : "追加する"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ========== メインアプリ ==========
export default function InvestmentWatchlist() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [stocks, setStocks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [sortBy, setSortBy] = useState("date");

  // PWAスタンドアロンモードかどうか判定
  const isPWA = window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;

  // 認証状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // PWAモードでリダイレクトから戻ってきた時の処理
  useEffect(() => {
    if (isPWA) {
      getRedirectResult(auth).catch((err) => {
        console.error("リダイレクトログインエラー:", err);
      });
    }
  }, [isPWA]);

  // Firestore リアルタイム同期
  useEffect(() => {
    if (!user) {
      setStocks([]);
      return;
    }
    const stocksRef = collection(db, "users", user.uid, "stocks");
    const q = query(stocksRef, orderBy("addedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setStocks(data);
      // 通知チェック
      checkNotifications(data);
    });
    return unsubscribe;
  }, [user]);

  // ログイン（PWAならリダイレクト、通常ブラウザならポップアップ）
  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      if (isPWA) {
        // PWAモードではポップアップが開けないのでリダイレクト
        await signInWithRedirect(auth, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (err) {
      console.error("ログインエラー:", err);
      // ポップアップがブロックされた場合もリダイレクトにフォールバック
      if (err.code === "auth/popup-blocked") {
        await signInWithRedirect(auth, googleProvider);
      } else {
        alert("ログインに失敗しました。もう一度お試しください。");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // ログアウト
  const handleLogout = async () => {
    await signOut(auth);
  };

  // 通知チェック
  const checkNotifications = useCallback((stockList) => {
    const newNotifications = [];
    stockList.forEach((s) => {
      if (s.targetPrice && s.currentPrice && s.currentPrice <= s.targetPrice) {
        newNotifications.push({
          id: s.id,
          name: s.name,
          message: `現在価格 ${formatPrice(s.currentPrice)} が目標 ${formatPrice(s.targetPrice)} 以下です！`,
        });
      }
    });
    setNotifications(newNotifications);
  }, []);

  // Firestore に保存
  const saveStock = async (stock) => {
    if (!user) return;
    const stockRef = doc(db, "users", user.uid, "stocks", stock.id);
    const { id, ...data } = stock;
    await setDoc(stockRef, data);
  };

  // Firestore から削除
  const removeStock = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "stocks", id));
  };

  const handleSave = async (stock) => {
    await saveStock(stock);
    setShowForm(false);
    setEditingStock(null);
  };

  const handleDelete = async (id) => {
    if (confirm("この銘柄を削除しますか？")) {
      await removeStock(id);
    }
  };

  const handleUpdatePrice = async (id, price) => {
    const stock = stocks.find((s) => s.id === id);
    if (!stock) return;
    await saveStock({
      ...stock,
      currentPrice: price,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleEdit = (stock) => {
    setEditingStock(stock);
    setShowForm(true);
  };

  const dismissNotification = (id) => setNotifications((n) => n.filter((x) => x.id !== id));
  const dismissAllNotifications = () => setNotifications([]);

  // フィルター & ソート
  const filteredStocks = stocks
    .filter((s) => {
      if (filter !== "all" && s.priority !== filter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          (s.code && s.code.includes(q)) ||
          (s.memo && s.memo.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "date") return new Date(b.addedAt) - new Date(a.addedAt);
      if (sortBy === "priority") {
        const order = { high: 0, medium: 1, low: 2 };
        return (order[a.priority] || 1) - (order[b.priority] || 1);
      }
      if (sortBy === "name") return a.name.localeCompare(b.name, "ja");
      return 0;
    });

  const buyableCount = stocks.filter(
    (s) => s.targetPrice && s.currentPrice && s.currentPrice <= s.targetPrice
  ).length;

  // ローディング中
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-3">📈</p>
          <p className="text-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  // 未ログイン
  if (!user) {
    return <LoginScreen onLogin={handleLogin} loading={loginLoading} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <NotificationBanner
        notifications={notifications}
        onDismiss={dismissNotification}
        onDismissAll={dismissAllNotifications}
      />

      {/* ヘッダー */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-gray-800 tracking-tight">
                📈 投資ウォッチリスト
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {stocks.length}件の銘柄
                {buyableCount > 0 && (
                  <span className="text-green-600 font-bold ml-2">
                    🔔 {buyableCount}件が買い時！
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* ユーザー情報 */}
              <div className="flex items-center gap-2">
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt=""
                    className="w-8 h-8 rounded-full border-2 border-gray-200"
                  />
                )}
                <button
                  onClick={handleLogout}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  title="ログアウト"
                >
                  ログアウト
                </button>
              </div>
              <button
                onClick={() => {
                  setEditingStock(null);
                  setShowForm(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
              >
                + 銘柄追加
              </button>
            </div>
          </div>

          {/* 検索 & フィルター */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <div className="flex-1 min-w-48">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 銘柄名・コードで検索..."
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
              />
            </div>
            <div className="flex gap-1.5">
              {[
                { value: "all", label: "すべて" },
                { value: "high", label: "🔥 高" },
                { value: "medium", label: "中" },
                { value: "low", label: "低" },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filter === f.value
                      ? "bg-gray-800 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs text-gray-600 border-none focus:outline-none"
            >
              <option value="date">追加日順</option>
              <option value="priority">優先度順</option>
              <option value="name">名前順</option>
            </select>
          </div>
        </div>
      </header>

      {/* 銘柄一覧 */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {filteredStocks.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">📋</p>
            <p className="text-gray-400 text-lg">
              {stocks.length === 0 ? "まだ銘柄がありません" : "該当する銘柄がありません"}
            </p>
            {stocks.length === 0 && (
              <button
                onClick={() => {
                  setEditingStock(null);
                  setShowForm(true);
                }}
                className="mt-4 text-blue-600 font-bold hover:underline"
              >
                最初の銘柄を追加する →
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredStocks.map((stock) => (
              <StockCard
                key={stock.id}
                stock={stock}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onUpdatePrice={handleUpdatePrice}
              />
            ))}
          </div>
        )}
      </main>

      {/* フォームモーダル */}
      {showForm && (
        <StockForm
          stock={editingStock}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingStock(null);
          }}
        />
      )}
    </div>
  );
}
