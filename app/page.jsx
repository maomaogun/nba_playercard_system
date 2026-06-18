import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  LayoutDashboard, Package, CreditCard, Plus, Pencil, Trash2,
  TrendingUp, DollarSign, BarChart3, X, AlertTriangle, CheckCircle2,
  Clock, Archive, ShoppingBag, RefreshCw, Boxes, PlusCircle,
  MinusCircle, Search, Filter, Star, LogIn, LogOut, Lock, Mail, Loader2,
  Wrench, ShoppingCart, Tag, ChevronLeft, ChevronRight, Download
} from "lucide-react";

// ─── SUPABASE ────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://mwrwkjldppabqerdihcm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13cndramxkcHBhYnFlcmRpaGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODMzODQsImV4cCI6MjA5NDY1OTM4NH0.JGB8aQfkO3GnG_abY3t4CdikwnPK89sHzzcZ28tIvms";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── uid ─────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// 取得今天的 YYYY-MM-DD（本地時區）
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// 將二維陣列匯出成 CSV（含 UTF-8 BOM，Excel 開啟中文不亂碼）
const exportCSV = (filename, headers, rows) => {
  const esc = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers, ...rows].map(r => r.map(esc).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + lines], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${todayISO()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n, decimals = 0) => {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
};
const fmtPct = (n) => isFinite(n) && !isNaN(n) ? `${n.toFixed(1)}%` : "0.0%";

const STATUS_META = {
  in_stock: { label: "已入庫（待售）", color: "bg-sky-900/60 text-sky-300 border-sky-700", icon: Archive },
  reserved: { label: "已保留", color: "bg-amber-900/60 text-amber-300 border-amber-700", icon: Clock },
  sold:     { label: "已售出（待發貨）", color: "bg-violet-900/60 text-violet-300 border-violet-700", icon: ShoppingBag },
  closed:   { label: "已結案", color: "bg-emerald-900/60 text-emerald-300 border-emerald-700", icon: CheckCircle2 },
};

const CHANNELS = ["蝦皮拍賣", "Facebook", "麥當勞面交", "eBay", "Yahoo拍賣", "Line私訊", "其他"];

// 自用標記：以 channel === SELF_USE 表示此筆為自用消耗（扣庫存，但不列入銷售額/獲利/ROI 統計）
const SELF_USE = "自用";
const isSelfUse = (sale) => sale?.channel === SELF_USE;
const PAGE_SIZE = 15;

const calcPkgCost = (usages, pkgMap) =>
  (usages || []).reduce((s, u) => {
    const cost = u.unit_cost_snap ?? pkgMap[u.pkg_id]?.unit_cost ?? 0;
    return s + cost * (Number(u.qty) || 0);
  }, 0);

const calcProfit = (card, pkgMap) => {
  if (!card.sell_price || card.status === "in_stock" || card.status === "reserved") return null;
  const pkgCost = calcPkgCost(card.pkg_usages, pkgMap);
  return (card.sell_price ?? 0) - (card.buy_price ?? 0) - pkgCost - (card.platform_fee ?? 0);
};

// ─── AuthView ─────────────────────────────────────────────────────────────────
function AuthView({ onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", isError: false });

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setMsg({ text: "", isError: false });
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg({ text: "註冊成功！請至信箱收取驗證信，或直接嘗試登入。", isError: false });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) onAuthSuccess(data.user);
      }
    } catch (err) {
      setMsg({ text: err.message || "認證失敗，請檢查輸入內容", isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center mx-auto shadow-lg shadow-violet-900/40">
            <Star size={20} className="text-white fill-white" />
          </div>
          <h2 className="text-xl font-bold text-zinc-100">球員卡雲端交易系統</h2>
          <p className="text-zinc-500 text-xs">登入後即可在全裝置跨設備同步記帳數據</p>
        </div>
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="text-zinc-400 text-xs font-medium mb-1 block">電子郵件信箱</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input type="email" required className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-3 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-violet-500 transition" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-zinc-400 text-xs font-medium mb-1 block">密碼設定</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input type="password" required className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-3 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-violet-500 transition" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          </div>
          {msg.text && (
            <p className={`text-xs font-medium p-3 rounded-lg border ${msg.isError ? "bg-rose-950/40 text-rose-400 border-rose-900" : "bg-emerald-950/40 text-emerald-400 border-emerald-900"}`}>
              {msg.text}
            </p>
          )}
          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            {isSignUp ? "註冊新帳號" : "登入系統"}
          </button>
        </form>
        <div className="text-center">
          <button onClick={() => { setIsSignUp(!isSignUp); setMsg({ text: "", isError: false }); }} className="text-xs text-zinc-400 hover:text-violet-400 underline transition">
            {isSignUp ? "已經有帳號了？返回登入" : "還沒有帳號？立即免費註冊"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const m = STATUS_META[status] ?? STATUS_META.in_stock;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${m.color}`}>
      <Icon size={11} />{m.label}
    </span>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-2 transition-all hover:border-zinc-600">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent}`}>
        <Icon size={18} className="text-white" />
      </div>
      <p className="text-zinc-400 text-xs font-medium tracking-wider uppercase">{label}</p>
      <p className="text-white text-2xl font-bold leading-none">{value}</p>
      {sub && <p className="text-zinc-500 text-xs">{sub}</p>}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ cards, pkgMap, accSales, accMap }) {
  // 球員卡統計
  const soldCards = cards.filter(c => c.status === "sold" || c.status === "closed");
  const cardRevenue = soldCards.reduce((s, c) => s + Number(c.sell_price ?? 0), 0);
  const cardBuyCost = soldCards.reduce((s, c) => s + Number(c.buy_price ?? 0), 0);
  const cardProfit  = soldCards.reduce((s, c) => s + (calcProfit(c, pkgMap) ?? 0), 0);
  const cardRoi     = cardBuyCost ? (cardProfit / cardBuyCost) * 100 : 0;

  // 卡具統計（自用不列入）
  const billableAccSales = accSales.filter(s => !isSelfUse(s));
  const accRevenue = billableAccSales.reduce((s, sale) => s + (sale.sell_price ?? 0), 0);
  const accCogs    = billableAccSales.reduce((s, sale) => {
    const cogs = (sale.items || []).reduce((ss, it) => ss + (it.unit_cost_snap ?? accMap[it.acc_id]?.unit_cost ?? 0) * (it.qty || 0), 0);
    const pkg  = calcPkgCost(sale.pkg_usages, pkgMap);
    return s + cogs + pkg + (sale.platform_fee ?? 0);
  }, 0);
  const accProfit  = accRevenue - accCogs;
  const accRoi     = accCogs ? (accProfit / accCogs) * 100 : 0;

  // 綜合
  const grandProfit = cardProfit + accProfit;

  // 每月趨勢（卡片＋卡具）
  const monthlyProfit = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${d.getMonth() + 1}月`;

      const cp = soldCards
        .filter(c => (c.created_at || c.updated_at || "").startsWith(key))
        .reduce((s, c) => s + (calcProfit(c, pkgMap) ?? 0), 0);

      const ap = accSales
        .filter(s => !isSelfUse(s) && (s.created_at || s.updated_at || "").startsWith(key))
        .reduce((s, sale) => {
          const cogs = (sale.items || []).reduce((ss, it) => ss + (it.unit_cost_snap ?? accMap[it.acc_id]?.unit_cost ?? 0) * (it.qty || 0), 0);
          const pkg  = calcPkgCost(sale.pkg_usages, pkgMap);
          return s + (sale.sell_price ?? 0) - cogs - pkg - (sale.platform_fee ?? 0);
        }, 0);

      result.push({ key, label, profit: cp + ap });
    }
    return result;
  }, [soldCards, accSales, pkgMap, accMap]);

  const maxProfit = Math.max(...monthlyProfit.map(m => Math.abs(m.profit)), 1);

  // 圖表切換：'monthly' | 'weekly' | 'daily'
  const [chartMode, setChartMode] = useState("monthly");
  const [dayRange, setDayRange] = useState(14);
  const [hoverIdx, setHoverIdx] = useState(null);

  // 每週獲利（禮拜一～禮拜日為一週，最近 8 週）
  const weeklyProfit = useMemo(() => {
    const result = [];
    const now = new Date();
    // 找到本週的禮拜一
    const dow = now.getDay(); // 0=日,1=一...6=六
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
    for (let w = 7; w >= 0; w--) {
      const mon = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - w * 7);
      const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
      // 產生這週每一天的 key（YYYY-MM-DD）
      const dayKeys = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + d);
        dayKeys.push(`${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`);
      }
      const cp = soldCards
        .filter(c => dayKeys.some(k => (c.created_at || c.updated_at || "").startsWith(k)))
        .reduce((s, c) => s + (calcProfit(c, pkgMap) ?? 0), 0);
      const ap = accSales
        .filter(s => !isSelfUse(s) && dayKeys.some(k => (s.created_at || s.updated_at || "").startsWith(k)))
        .reduce((s, sale) => {
          const cogs = (sale.items || []).reduce((ss, it) => ss + (it.unit_cost_snap ?? accMap[it.acc_id]?.unit_cost ?? 0) * (it.qty || 0), 0);
          const pkg  = calcPkgCost(sale.pkg_usages, pkgMap);
          return s + (sale.sell_price ?? 0) - cogs - pkg - (sale.platform_fee ?? 0);
        }, 0);
      const label = `${mon.getMonth() + 1}/${mon.getDate()}-${sun.getMonth() + 1}/${sun.getDate()}`;
      result.push({ label, profit: cp + ap });
    }
    return result;
  }, [soldCards, accSales, pkgMap, accMap]);

  // 每日收益（賣出價扣成本，卡片＋卡具）
  const dailyRevenue = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = dayRange - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const cardProfitDay = soldCards
        .filter(c => (c.created_at || c.updated_at || "").startsWith(key))
        .reduce((s, c) => s + (calcProfit(c, pkgMap) ?? 0), 0);
      const accProfitDay = accSales
        .filter(s => !isSelfUse(s) && (s.created_at || s.updated_at || "").startsWith(key))
        .reduce((s, sale) => {
          const cogs = (sale.items || []).reduce((ss, it) => ss + (it.unit_cost_snap ?? accMap[it.acc_id]?.unit_cost ?? 0) * (it.qty || 0), 0);
          const pkg  = calcPkgCost(sale.pkg_usages, pkgMap);
          return s + (sale.sell_price ?? 0) - cogs - pkg - (sale.platform_fee ?? 0);
        }, 0);
      result.push({ key, label: `${d.getMonth() + 1}/${d.getDate()}`, revenue: cardProfitDay + accProfitDay });
    }
    return result;
  }, [soldCards, accSales, pkgMap, accMap, dayRange]);

  const maxDailyRev = Math.max(...dailyRevenue.map(d => Math.abs(d.revenue)), 1);
  const dailyTotal = dailyRevenue.reduce((s, d) => s + d.revenue, 0);

  // 右側面板：球員卡 vs 卡具的營業額與獲利進度條
  const grandRevenue = cardRevenue + accRevenue;
  const grandRevMax  = Math.max(grandRevenue, 1);
  const grandProfitAbs = Math.max(Math.abs(cardProfit), Math.abs(accProfit), 1);

  return (
    <div className="space-y-6">
      {/* 第一行：球員卡 */}
      <div>
        <p className="text-zinc-500 text-xs font-semibold tracking-wider uppercase mb-2 flex items-center gap-1.5">
          <CreditCard size={11} /> 球員卡交易
        </p>
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={DollarSign} label="卡片總營業額" value={fmt(cardRevenue)} sub={`共 ${soldCards.length} 筆交易`} accent="bg-sky-600" />
          <StatCard icon={TrendingUp} label="卡片總獲利"   value={fmt(cardProfit)}  sub={cardProfit >= 0 ? "盈利中" : "虧損中"} accent={cardProfit >= 0 ? "bg-emerald-600" : "bg-rose-600"} />
          <StatCard icon={BarChart3}  label="卡片投資報酬率" value={fmtPct(cardRoi)} sub="總獲利 / 售出總成本" accent="bg-violet-600" />
        </div>
      </div>

      {/* 第二行：卡具 */}
      <div>
        <p className="text-zinc-500 text-xs font-semibold tracking-wider uppercase mb-2 flex items-center gap-1.5">
          <Wrench size={11} /> 卡具銷售
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={ShoppingCart} label="卡具總銷售額"   value={fmt(accRevenue)} sub={`共 ${accSales.length} 筆訂單`} accent="bg-teal-600" />
          <StatCard icon={TrendingUp}   label="卡具總獲利"     value={fmt(accProfit)}  sub={accProfit >= 0 ? "盈利中" : "虧損中"} accent={accProfit >= 0 ? "bg-emerald-600" : "bg-rose-600"} />
          <StatCard icon={BarChart3}    label="卡具投資報酬率" value={fmtPct(accRoi)}  sub="卡具獲利 / 卡具成本" accent="bg-cyan-700" />
          <StatCard icon={DollarSign}   label="綜合總獲利"     value={fmt(grandProfit)} sub="卡片＋卡具合計" accent={grandProfit >= 0 ? "bg-violet-600" : "bg-rose-600"} />
        </div>
      </div>

      {/* 第三行：圖表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 左：趨勢圖（可切換每月長條 / 每日折線） */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="text-zinc-200 font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-violet-400" />
            {chartMode === "monthly" ? "每月獲利趨勢（卡片＋卡具）" : chartMode === "weekly" ? "每週獲利趨勢（卡片＋卡具）" : "每日收益趨勢（卡片＋卡具）"}
          </h3>

          {chartMode === "monthly" ? (
            <div className="flex items-end gap-2 h-40 pt-4">
              {monthlyProfit.map((m) => {
                const pct = (Math.abs(m.profit) / maxProfit) * 100;
                const isPos = m.profit >= 0;
                return (
                  <div key={m.key} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className={`text-[10px] font-bold ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
                      {m.profit !== 0 ? `${isPos ? "+" : ""}${m.profit}` : ""}
                    </span>
                    <div className="w-full flex flex-col justify-end" style={{ height: "100px" }}>
                      <div className={`w-full rounded-t-md transition-all ${isPos ? "bg-violet-600" : "bg-rose-600"}`} style={{ height: `${Math.max(pct, m.profit !== 0 ? 4 : 0)}%` }} />
                    </div>
                    <span className="text-zinc-500 text-xs mt-1">{m.label}</span>
                  </div>
                );
              })}
            </div>
          ) : chartMode === "weekly" ? (() => {
            const maxWeekProfit = Math.max(...weeklyProfit.map(w => Math.abs(w.profit)), 1);
            return (
              <div className="flex items-end gap-1.5 h-40 pt-4">
                {weeklyProfit.map((w, i) => {
                  const pct = (Math.abs(w.profit) / maxWeekProfit) * 100;
                  const isPos = w.profit >= 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end min-w-0">
                      <span className={`text-[9px] font-bold leading-tight text-center ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
                        {w.profit !== 0 ? `${isPos ? "+" : ""}${w.profit}` : ""}
                      </span>
                      <div className="w-full flex flex-col justify-end" style={{ height: "100px" }}>
                        <div className={`w-full rounded-t-md transition-all ${isPos ? "bg-teal-600" : "bg-rose-600"}`} style={{ height: `${Math.max(pct, w.profit !== 0 ? 4 : 0)}%` }} />
                      </div>
                      <span className="text-zinc-500 text-[8px] mt-1 text-center leading-tight break-all">{w.label}</span>
                    </div>
                  );
                })}
              </div>
            );
          })() : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-500 text-xs">最近 {dayRange} 天 · 總收益 <span className="text-teal-400 font-mono">{fmt(dailyTotal)}</span></span>
                <span className="text-zinc-600 text-[10px] font-mono">高峰 {fmt(maxDailyRev)}</span>
              </div>
              <div className="relative h-48">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                  {/* 折線 */}
                  <polyline
                    fill="none"
                    stroke="#14b8a6"
                    strokeWidth="0.8"
                    vectorEffect="non-scaling-stroke"
                    points={dailyRevenue.map((d, i) => {
                      const x = dailyRevenue.length > 1 ? (i / (dailyRevenue.length - 1)) * 100 : 50;
                      const y = 96 - (d.revenue / maxDailyRev) * 84;
                      return `${x},${y}`;
                    }).join(" ")}
                  />
                  {/* 資料點 */}
                  {dailyRevenue.map((d, i) => {
                    if (d.revenue === 0) return null;
                    const x = dailyRevenue.length > 1 ? (i / (dailyRevenue.length - 1)) * 100 : 50;
                    const y = 96 - (d.revenue / maxDailyRev) * 84;
                    return <circle key={d.key} cx={x} cy={y} r={hoverIdx === i ? 1.8 : 1} fill="#2dd4bf" vectorEffect="non-scaling-stroke" />;
                  })}
                  {/* 透明感應區（含 0 元的點也能 hover） */}
                  {dailyRevenue.map((d, i) => {
                    const x = dailyRevenue.length > 1 ? (i / (dailyRevenue.length - 1)) * 100 : 50;
                    return (
                      <rect
                        key={d.key}
                        x={x - (50 / Math.max(dailyRevenue.length, 1))}
                        y="0"
                        width={100 / Math.max(dailyRevenue.length, 1)}
                        height="100"
                        fill="transparent"
                        onMouseEnter={() => setHoverIdx(i)}
                        onMouseLeave={() => setHoverIdx(null)}
                      />
                    );
                  })}
                </svg>
                {/* Tooltip */}
                {hoverIdx !== null && dailyRevenue[hoverIdx] && (() => {
                  const d = dailyRevenue[hoverIdx];
                  const x = dailyRevenue.length > 1 ? (hoverIdx / (dailyRevenue.length - 1)) * 100 : 50;
                  const y = 96 - (d.revenue / maxDailyRev) * 84;
                  return (
                    <div
                      className="absolute z-10 pointer-events-none -translate-x-1/2 -translate-y-full bg-zinc-800 border border-zinc-600 rounded-lg px-2 py-1 shadow-lg whitespace-nowrap"
                      style={{ left: `${x}%`, top: `${y}%`, marginTop: "-6px" }}
                    >
                      <p className="text-zinc-400 text-[10px] font-mono leading-tight">{d.label}</p>
                      <p className="text-teal-400 text-xs font-bold font-mono leading-tight">{fmt(d.revenue)}</p>
                    </div>
                  );
                })()}
              </div>
              {/* X 軸標籤（頭、中、尾） */}
              <div className="flex justify-between text-zinc-500 text-[10px] mt-1 font-mono">
                <span>{dailyRevenue[0]?.label}</span>
                {dayRange > 4 && <span>{dailyRevenue[Math.floor(dailyRevenue.length / 2)]?.label}</span>}
                <span>{dailyRevenue[dailyRevenue.length - 1]?.label}</span>
              </div>
              {/* 範圍縮放滑桿（往左放大看最近幾天，往右拉遠最多一個月） */}
              <div className="mt-2 flex items-center gap-3">
                <span className="text-zinc-500 text-[10px] whitespace-nowrap">放大</span>
                <input
                  type="range" min="3" max="30" step="1" value={dayRange}
                  onChange={e => setDayRange(Number(e.target.value))}
                  className="flex-1 accent-teal-500"
                />
                <span className="text-zinc-500 text-[10px] whitespace-nowrap">拉遠</span>
              </div>
            </div>
          )}

          {soldCards.length === 0 && accSales.length === 0 && (
            <p className="text-center text-zinc-600 text-sm mt-3">尚無已售出的交易紀錄</p>
          )}

          {/* 切換選項 */}
          <div className="flex justify-center gap-1 mt-3 pt-2 border-t border-zinc-800">
            <button
              onClick={() => setChartMode("monthly")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${chartMode === "monthly" ? "bg-zinc-800 text-zinc-100 border border-zinc-700/50" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              <BarChart3 size={12} /> 每月
            </button>
            <button
              onClick={() => setChartMode("weekly")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${chartMode === "weekly" ? "bg-zinc-800 text-zinc-100 border border-zinc-700/50" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              <BarChart3 size={12} /> 每週
            </button>
            <button
              onClick={() => setChartMode("daily")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${chartMode === "daily" ? "bg-zinc-800 text-zinc-100 border border-zinc-700/50" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              <TrendingUp size={12} /> 每日
            </button>
          </div>
        </div>

        {/* 右：球員卡 vs 卡具 進度條比較 */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="text-zinc-200 font-semibold mb-5 flex items-center gap-2">
            <BarChart3 size={16} className="text-sky-400" /> 球員卡 vs 卡具 銷售比較
          </h3>

          {grandRevenue === 0 && accRevenue === 0 && cardRevenue === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-10">尚無交易資料</p>
          ) : (
            <div className="space-y-6">
              {/* 營業額比較 */}
              <div>
                <p className="text-zinc-400 text-xs font-semibold tracking-wider uppercase mb-3">營業額</p>
                <div className="space-y-3">
                  {/* 球員卡 */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
                        <CreditCard size={11} className="text-violet-400" /> 球員卡
                      </span>
                      <span className="font-mono text-zinc-200">{fmt(cardRevenue)}</span>
                    </div>
                    <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-violet-500 transition-all"
                        style={{ width: `${grandRevMax > 0 ? (cardRevenue / grandRevMax) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-zinc-600 text-[10px] mt-0.5 text-right">
                      佔比 {grandRevMax > 0 ? ((cardRevenue / grandRevMax) * 100).toFixed(1) : "0.0"}%
                    </p>
                  </div>
                  {/* 卡具 */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
                        <Wrench size={11} className="text-teal-400" /> 卡具
                      </span>
                      <span className="font-mono text-zinc-200">{fmt(accRevenue)}</span>
                    </div>
                    <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-teal-500 transition-all"
                        style={{ width: `${grandRevMax > 0 ? (accRevenue / grandRevMax) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-zinc-600 text-[10px] mt-0.5 text-right">
                      佔比 {grandRevMax > 0 ? ((accRevenue / grandRevMax) * 100).toFixed(1) : "0.0"}%
                    </p>
                  </div>
                </div>
              </div>

              {/* 分隔線 */}
              <div className="border-t border-zinc-800" />

              {/* 獲利比較 */}
              <div>
                <p className="text-zinc-400 text-xs font-semibold tracking-wider uppercase mb-3">獲利</p>
                <div className="space-y-3">
                  {/* 球員卡獲利 */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
                        <CreditCard size={11} className="text-violet-400" /> 球員卡
                      </span>
                      <span className={`font-mono font-bold ${cardProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {cardProfit >= 0 ? "+" : ""}{fmt(cardProfit)}
                      </span>
                    </div>
                    <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${cardProfit >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                        style={{ width: `${grandProfitAbs > 0 ? (Math.abs(cardProfit) / grandProfitAbs) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  {/* 卡具獲利 */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
                        <Wrench size={11} className="text-teal-400" /> 卡具
                      </span>
                      <span className={`font-mono font-bold ${accProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {accProfit >= 0 ? "+" : ""}{fmt(accProfit)}
                      </span>
                    </div>
                    <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${accProfit >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                        style={{ width: `${grandProfitAbs > 0 ? (Math.abs(accProfit) / grandProfitAbs) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CardModal ────────────────────────────────────────────────────────────────
function CardModal({ card, packaging, onSave, onClose }) {
  const [form, setForm] = useState(() => ({
    name: card?.name ?? "",
    buy_price: card?.buy_price ?? "",
    sell_price: card?.sell_price ?? "",
    status: card?.status ?? "closed",
    channel: card?.channel ?? "蝦皮拍賣",
    platform_fee: card?.platform_fee ?? "",
    notes: card?.notes ?? "",
    sale_date: (card?.created_at || "").slice(0, 10) || todayISO(),
    pkg_usages: card?.pkg_usages ? JSON.parse(JSON.stringify(card.pkg_usages)) : [],
  }));

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addPkg = () => {
    if (packaging.length === 0) return alert("請先至包材管理頁面建立包材規格");
    set("pkg_usages", [...form.pkg_usages, { id: uid(), pkg_id: packaging[0].id, qty: 1, unit_cost_snap: packaging[0].unit_cost }]);
  };
  const rmPkg = (i) => set("pkg_usages", form.pkg_usages.filter((_, j) => j !== i));
  const setPkg = (i, field, val) => set("pkg_usages", form.pkg_usages.map((u, j) => {
    if (j !== i) return u;
    if (field === "pkg_id") {
      const p = packaging.find(item => item.id === val);
      return { ...u, pkg_id: val, unit_cost_snap: p?.unit_cost ?? 0 };
    }
    return { ...u, [field]: val };
  }));

  const pkgMap = useMemo(() => Object.fromEntries(packaging.map(p => [p.id, p])), [packaging]);
  const totalPkgCost = form.pkg_usages.reduce((s, u) => {
    const cost = pkgMap[u.pkg_id]?.unit_cost ?? u.unit_cost_snap ?? 0;
    return s + cost * (Number(u.qty) || 0);
  }, 0);

  const sellNum = Number(form.sell_price) || 0;
  const buyNum  = Number(form.buy_price) || 0;
  const feeNum  = Number(form.platform_fee) || 0;
  const netProfit = sellNum - buyNum - totalPkgCost - feeNum;

  const handleSave = () => {
    if (!form.name.trim()) return alert("請輸入卡片名稱");
    const snappedUsages = form.pkg_usages.map(u => ({
      ...u,
      unit_cost_snap: pkgMap[u.pkg_id]?.unit_cost ?? u.unit_cost_snap ?? 0,
      qty: Math.max(1, Number(u.qty) || 1),
    }));
    const { sale_date, ...rest } = form;
    onSave({
      ...card,
      ...rest,
      created_at: sale_date || todayISO(),
      pkg_usages: snappedUsages,
      buy_price: buyNum,
      sell_price: form.status === "sold" || form.status === "closed" ? sellNum : null,
      platform_fee: feeNum,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 w-full sm:max-w-lg bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-zinc-100 font-semibold text-base flex items-center gap-2">
            <CreditCard size={16} className="text-violet-400" />
            {card?.id ? "編輯卡片紀錄" : "登錄新購入卡片"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition"><X size={15} className="text-zinc-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div>
            <label className="text-zinc-400 text-xs font-medium mb-1 block">卡片名稱 *</label>
            <input className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-violet-500 transition" placeholder="例如：Wembanyama 2023 Prizm Base RC" value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          <div>
            <label className="text-zinc-400 text-xs font-medium mb-1 block">交易日期</label>
            <input type="date" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-violet-500 transition" value={form.sale_date} onChange={e => set("sale_date", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-400 text-xs font-medium mb-1 block">卡片買入價（元）</label>
              <input type="number" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-violet-500 transition" placeholder="0" value={form.buy_price} onChange={e => set("buy_price", e.target.value)} />
            </div>
            <div>
              <label className="text-zinc-400 text-xs font-medium mb-1 block">卡片賣出價（元）</label>
              <input type="number" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-violet-500 transition" placeholder="0" value={form.sell_price} onChange={e => set("sell_price", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-zinc-400 text-xs font-medium mb-1 block">平台手續費（元）</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-violet-500 transition" placeholder="0" value={form.platform_fee} onChange={e => set("platform_fee", e.target.value)} />
          </div>
          <div className="border-t border-zinc-800 pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-zinc-400 text-xs font-medium block">使用包材（可點擊追加多個）</label>
              <button onClick={addPkg} className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition"><PlusCircle size={13} /> 增加一項包材</button>
            </div>
            {form.pkg_usages.length === 0 && <p className="text-zinc-600 text-xs py-1">此訂單目前未記錄任何包材消耗</p>}
            <div className="space-y-2">
              {form.pkg_usages.map((u, i) => (
                <div key={u.id} className="flex items-center gap-2 bg-zinc-900/50 p-2 border border-zinc-800 rounded-xl">
                  <select className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg p-1.5 text-zinc-100 text-xs focus:outline-none" value={u.pkg_id} onChange={e => setPkg(i, "pkg_id", e.target.value)}>
                    {packaging.map(p => <option key={p.id} value={p.id}>{p.name} (庫存 {p.stock} 個)</option>)}
                  </select>
                  <div className="flex items-center gap-1">
                    <input type="number" min="1" className="w-14 bg-zinc-800 border border-zinc-700 rounded-lg p-1.5 text-zinc-100 text-xs text-center" value={u.qty} onChange={e => setPkg(i, "qty", Math.max(1, parseInt(e.target.value) || 0))} />
                    <span className="text-zinc-500 text-xs">個</span>
                  </div>
                  <span className="text-zinc-400 text-xs font-mono min-w-[50px] text-right">{fmt(pkgMap[u.pkg_id]?.unit_cost ?? u.unit_cost_snap ?? 0, 1)}</span>
                  <button onClick={() => rmPkg(i)} className="text-rose-500 hover:text-rose-400 p-1"><MinusCircle size={15} /></button>
                </div>
              ))}
            </div>
          </div>
          {(form.status === "sold" || form.status === "closed") && (
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3.5 space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-400"><span>卡片售出金額</span><span className="text-zinc-200">{fmt(sellNum)}</span></div>
              <div className="flex justify-between text-xs text-zinc-400"><span>− 卡片買入成本</span><span className="text-zinc-200">{fmt(buyNum)}</span></div>
              <div className="flex justify-between text-xs text-zinc-400"><span>− 消耗包材總成本</span><span className="text-zinc-200">{fmt(totalPkgCost, 1)}</span></div>
              {feeNum > 0 && <div className="flex justify-between text-xs text-zinc-400"><span>− 平台手續費</span><span className="text-zinc-200">{fmt(feeNum)}</span></div>}
              <div className="border-t border-zinc-800 pt-1.5 flex justify-between text-sm font-bold">
                <span className="text-zinc-300">本筆收益淨利</span>
                <span className={netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}>{fmt(netProfit, 1)}</span>
              </div>
            </div>
          )}
          <div>
            <label className="text-zinc-400 text-xs font-medium mb-1 block">備註（卡況描述/PSA證號）</label>
            <input className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-violet-500 transition" placeholder="例如：PSA 10 Gem Mint" value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
        </div>
        <div className="p-5 border-t border-zinc-800 flex gap-3 bg-zinc-950 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 text-sm hover:bg-zinc-800 transition">取消</button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition">儲存回傳雲端</button>
        </div>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  const pages = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);
  return (
    <div className="flex items-center justify-center gap-1.5 pt-4">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
      >
        <ChevronLeft size={14} />
      </button>
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onPage(p)}
          className={`w-8 h-8 rounded-lg text-xs font-semibold transition border ${p === page ? "bg-violet-600 border-violet-500 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"}`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages}
        className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

// ─── CardsPage ────────────────────────────────────────────────────────────────
function CardsPage({ cards, packaging, onAdd, onEdit, onDelete }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [modalCard, setModalCard] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const pkgMap = useMemo(() => Object.fromEntries(packaging.map(p => [p.id, p])), [packaging]);

  // 排序：最近的訂單在最上面（descending by created_at）
  const filtered = useMemo(() => {
    return [...cards]
      .sort((a, b) => {
        const ka = a.created_at ?? a.id ?? "";
        const kb = b.created_at ?? b.id ?? "";
        return ka < kb ? 1 : ka > kb ? -1 : 0;
      })
      .filter(c => {
        const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.notes || "").toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === "all" || c.status === filterStatus;
        return matchSearch && matchStatus;
      });
  }, [cards, search, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // 當篩選條件變動時回到第1頁
  const handleSearch = (v) => { setSearch(v); setPage(1); };
  const handleFilter = (v) => { setFilterStatus(v); setPage(1); };

  const handleExport = () => {
    if (filtered.length === 0) return alert("目前沒有可匯出的卡片資料");
    const headers = ["交易日期", "卡片名稱", "買入價", "賣出價", "平台手續費", "包材成本", "獲利", "備註"];
    const rows = filtered.map(c => {
      const pkgCost = calcPkgCost(c.pkg_usages, pkgMap);
      const profit = calcProfit(c, pkgMap);
      return [
        (c.created_at || "").slice(0, 10),
        c.name,
        c.buy_price ?? 0,
        c.sell_price ?? "",
        c.platform_fee ?? 0,
        pkgCost,
        profit ?? "",
        c.notes ?? "",
      ];
    });
    exportCSV("卡片交易紀錄", headers, rows);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-violet-500 transition" placeholder="搜尋卡片名稱或備註…" value={search} onChange={e => handleSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <select className="bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-8 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-violet-500 transition appearance-none" value={filterStatus} onChange={e => handleFilter(e.target.value)}>
              <option value="all">全部狀態</option>
              {Object.entries(STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
            </select>
          </div>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-xl text-sm font-medium transition" title="匯出目前清單為 CSV"><Download size={15} /> 匯出</button>
          <button onClick={() => { setModalCard(null); setShowModal(true); }} className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition"><Plus size={15} /> 登錄卡片</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-12 text-center text-zinc-600">
          <CreditCard size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">尚無任何交易清單</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-zinc-500 text-xs">共 {filtered.length} 筆記錄，第 {page} / {totalPages} 頁</p>
          </div>
          <div className="space-y-2">
            <div className="hidden lg:grid grid-cols-[2.5fr_1fr_1fr_1fr_1.2fr_auto] gap-4 px-4 py-2 text-zinc-500 text-xs font-semibold tracking-wider">
              <span>卡片明細</span><span>買入成本</span><span>出售價格</span><span>每筆訂單獲利</span><span>狀態</span><span>操作</span>
            </div>
            {paginated.map(card => {
              const profit = calcProfit(card, pkgMap);
              const dateLabel = (() => {
                const d = card.created_at || "";
                const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (m) return `${parseInt(m[2])}月${parseInt(m[3])}日`;
                const m2 = d.match(/^(\d{4})-(\d{2})/);
                if (m2) return `${parseInt(m2[2])}月`;
                return "";
              })();
              return (
                <div key={card.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition p-4">
                  {/* Mobile */}
                  <div className="lg:hidden space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {dateLabel && <span className="text-violet-400 text-xs font-mono block mb-0.5">{dateLabel}</span>}
                        <p className="text-zinc-100 font-medium text-sm leading-snug">{card.name}</p>
                        {card.notes && <p className="text-zinc-500 text-xs mt-0.5">{card.notes}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => { setModalCard(card); setShowModal(true); }} className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition"><Pencil size={13} className="text-zinc-400" /></button>
                        <button onClick={() => onDelete(card.id)} className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-rose-950 flex items-center justify-center transition text-zinc-500 hover:text-rose-400"><Trash2 size={13} /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-xs border-y border-zinc-800/50 py-1.5 my-1 font-mono">
                      <div><span className="text-zinc-500 block">買入</span><span className="text-zinc-300">{fmt(card.buy_price)}</span></div>
                      <div><span className="text-zinc-500 block">賣出</span><span className="text-zinc-300">{card.sell_price ? fmt(card.sell_price) : "—"}</span></div>
                      <div><span className="text-zinc-500 block">利潤</span>{profit !== null ? <span className={`font-bold ${profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{profit >= 0 ? "+" : ""}{fmt(profit, 1)}</span> : <span className="text-zinc-600">—</span>}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <StatusBadge status="closed" />
                      {card.channel && <span className="text-zinc-500 text-xs bg-zinc-800 px-2 py-0.5 rounded-md">{card.channel}</span>}
                    </div>
                  </div>
                  {/* Desktop */}
                  <div className="hidden lg:grid grid-cols-[2.5fr_1fr_1fr_1fr_1.2fr_auto] gap-4 items-center">
                    <div className="min-w-0">
                      {dateLabel && <span className="text-violet-400 text-xs font-mono block mb-0.5">{dateLabel}</span>}
                      <p className="text-zinc-100 text-sm font-medium truncate">{card.name}</p>
                      {card.notes ? <p className="text-zinc-500 text-xs truncate mt-0.5">{card.notes}</p> : <span className="text-zinc-700 text-xs">—</span>}
                    </div>
                    <span className="text-zinc-300 text-sm font-mono">{fmt(card.buy_price)}</span>
                    <span className="text-zinc-300 text-sm font-mono">{card.sell_price ? fmt(card.sell_price) : <span className="text-zinc-700">—</span>}</span>
                    <span className={`text-sm font-mono font-bold ${profit === null ? "text-zinc-600" : profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {profit === null ? "—" : `${profit >= 0 ? "+" : ""}${fmt(profit, 1)}`}
                    </span>
                    <StatusBadge status="closed" />
                    <div className="flex gap-1.5">
                      <button onClick={() => { setModalCard(card); setShowModal(true); }} className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition"><Pencil size={13} className="text-zinc-400" /></button>
                      <button onClick={() => onDelete(card.id)} className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-rose-950 flex items-center justify-center transition text-zinc-500 hover:text-rose-400"><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}

      {showModal && (
        <CardModal
          card={modalCard}
          packaging={packaging}
          onSave={(data) => { if (data.id) onEdit(data); else onAdd(data); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// ─── PkgModal ─────────────────────────────────────────────────────────────────
function PkgModal({ pkg, onSave, onClose }) {
  const isRestock = !!pkg?.id;
  const [form, setForm] = useState(isRestock ? { qty_add: "", total_cost: "" } : { name: "", stock: "", unit_cost: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const newUnitCost = isRestock && form.qty_add && form.total_cost
    ? (Number(form.total_cost) / Number(form.qty_add)).toFixed(1) : null;

  const handleSave = () => {
    if (isRestock) {
      if (!form.qty_add || !form.total_cost) return alert("請填寫補貨數量與購入總額");
      onSave({ type: "restock", id: pkg.id, qty_add: Number(form.qty_add), total_cost: Number(form.total_cost) });
    } else {
      if (!form.name.trim() || form.stock === "" || form.unit_cost === "") return alert("請完整填寫包材欄位");
      onSave({ type: "new", name: form.name, stock: Number(form.stock), unit_cost: Number(form.unit_cost) });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 w-full sm:max-w-md bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-zinc-100 font-semibold text-base flex items-center gap-2">
            <Package size={16} className="text-amber-400" />
            {isRestock ? `包材批次進貨：${pkg.name}` : "新增包材物料規格"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition"><X size={15} className="text-zinc-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          {isRestock ? (
            <>
              <div>
                <label className="text-zinc-400 text-xs font-medium mb-1 block">補貨增加數量 (個)</label>
                <input type="number" min="1" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-100 text-sm focus:outline-none" placeholder="100" value={form.qty_add} onChange={e => set("qty_add", e.target.value)} />
              </div>
              <div>
                <label className="text-zinc-400 text-xs font-medium mb-1 block">本次批次進貨總費用 (元)</label>
                <input type="number" min="0" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-100 text-sm focus:outline-none" placeholder="400" value={form.total_cost} onChange={e => set("total_cost", e.target.value)} />
              </div>
              {newUnitCost && (
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-sm flex justify-between items-center">
                  <span className="text-zinc-400">系統試算此批均價成本：</span>
                  <span className="text-amber-400 font-bold font-mono">{fmt(Number(newUnitCost), 1)} /個</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label className="text-zinc-400 text-xs font-medium mb-1 block">包材品項名稱/尺寸</label>
                <input className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-100 text-sm focus:outline-none" placeholder="例如：20×15×10 紙箱" value={form.name} onChange={e => set("name", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs font-medium mb-1 block">現有初始庫存量</label>
                  <input type="number" min="0" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-100 text-sm focus:outline-none" placeholder="0" value={form.stock} onChange={e => set("stock", e.target.value)} />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs font-medium mb-1 block">單個包材成本單價</label>
                  <input type="number" min="0" step="0.1" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-100 text-sm focus:outline-none" placeholder="4" value={form.unit_cost} onChange={e => set("unit_cost", e.target.value)} />
                </div>
              </div>
            </>
          )}
        </div>
        <div className="p-5 border-t border-zinc-800 flex gap-3 bg-zinc-950 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 text-sm hover:bg-zinc-800 transition">取消</button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition">確認存檔</button>
        </div>
      </div>
    </div>
  );
}

// ─── AccessoryModal ───────────────────────────────────────────────────────────
function AccessoryModal({ acc, onSave, onClose }) {
  const isRestock = !!acc?.id;
  const [form, setForm] = useState(
    isRestock ? { qty_add: "", total_cost: "" } : { name: "", stock: "", unit_cost: "" }
  );
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const newUnitCost = isRestock && form.qty_add && form.total_cost
    ? (Number(form.total_cost) / Number(form.qty_add)).toFixed(1) : null;

  const handleSave = () => {
    if (isRestock) {
      if (!form.qty_add || !form.total_cost) return alert("請填寫補貨數量與購入總額");
      onSave({ type: "restock", id: acc.id, qty_add: Number(form.qty_add), total_cost: Number(form.total_cost) });
    } else {
      if (!form.name.trim() || form.stock === "" || form.unit_cost === "") return alert("請完整填寫卡具欄位");
      onSave({ type: "new", name: form.name, stock: Number(form.stock), unit_cost: Number(form.unit_cost) });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 w-full sm:max-w-md bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-zinc-100 font-semibold text-base flex items-center gap-2">
            <Wrench size={16} className="text-teal-400" />
            {isRestock ? `卡具批次進貨：${acc.name}` : "新增卡具品項"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition"><X size={15} className="text-zinc-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          {isRestock ? (
            <>
              <div>
                <label className="text-zinc-400 text-xs font-medium mb-1 block">補貨增加數量（個）</label>
                <input type="number" min="1" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-100 text-sm focus:outline-none" placeholder="10" value={form.qty_add} onChange={e => set("qty_add", e.target.value)} />
              </div>
              <div>
                <label className="text-zinc-400 text-xs font-medium mb-1 block">本次批次進貨總費用（元）</label>
                <input type="number" min="0" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-100 text-sm focus:outline-none" placeholder="500" value={form.total_cost} onChange={e => set("total_cost", e.target.value)} />
              </div>
              {newUnitCost && (
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-sm flex justify-between items-center">
                  <span className="text-zinc-400">系統試算此批均價成本：</span>
                  <span className="text-teal-400 font-bold font-mono">{fmt(Number(newUnitCost), 1)} /個</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label className="text-zinc-400 text-xs font-medium mb-1 block">卡具品項名稱／規格</label>
                <input className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-100 text-sm focus:outline-none" placeholder="例如：35pt 一次性卡夾、磁吸硬殼、9格活頁…" value={form.name} onChange={e => set("name", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs font-medium mb-1 block">現有初始庫存量</label>
                  <input type="number" min="0" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-100 text-sm focus:outline-none" placeholder="0" value={form.stock} onChange={e => set("stock", e.target.value)} />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs font-medium mb-1 block">單個進貨成本（元）</label>
                  <input type="number" min="0" step="0.1" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-100 text-sm focus:outline-none" placeholder="10" value={form.unit_cost} onChange={e => set("unit_cost", e.target.value)} />
                </div>
              </div>
            </>
          )}
        </div>
        <div className="p-5 border-t border-zinc-800 flex gap-3 bg-zinc-950 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 text-sm hover:bg-zinc-800 transition">取消</button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition">確認存檔</button>
        </div>
      </div>
    </div>
  );
}

// ─── AccessorySaleModal ───────────────────────────────────────────────────────
function AccessorySaleModal({ sale, accessories, packaging, onSave, onClose }) {
  const [form, setForm] = useState(() => ({
    buyer_note: sale?.buyer_note ?? "",
    channel: sale?.channel ?? "蝦皮拍賣",
    platform_fee: sale?.platform_fee ?? "",
    sell_price: sale?.sell_price ?? "",
    sale_date: (sale?.created_at || "").slice(0, 10) || todayISO(),
    self_use: sale ? isSelfUse(sale) : false,
    pkg_usages: sale?.pkg_usages ? JSON.parse(JSON.stringify(sale.pkg_usages)) : [],
    items: sale?.items ? JSON.parse(JSON.stringify(sale.items)) : [],
  }));

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const pkgMap = useMemo(() => Object.fromEntries(packaging.map(p => [p.id, p])), [packaging]);
  const accMap = useMemo(() => Object.fromEntries(accessories.map(a => [a.id, a])), [accessories]);
  const sortedAccessories = useMemo(
    () => [...accessories].sort((a, b) => a.name.localeCompare(b.name, "zh-TW", { numeric: true, sensitivity: "base" })),
    [accessories]
  );

  const addItem = () => {
    if (sortedAccessories.length === 0) return alert("請先在卡具庫存頁面新增卡具品項");
    const first = sortedAccessories[0];
    setForm(f => ({ ...f, items: [...f.items, { id: uid(), acc_id: first.id, qty: 1, unit_cost_snap: first.unit_cost }] }));
  };
  const rmItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }));
  const setItem = (i, field, val) => setForm(f => ({
    ...f,
    items: f.items.map((it, j) => {
      if (j !== i) return it;
      if (field === "acc_id") {
        const a = accessories.find(a => a.id === val);
        return { ...it, acc_id: val, unit_cost_snap: a?.unit_cost ?? 0 };
      }
      return { ...it, [field]: val };
    }),
  }));

  const addPkg = () => {
    if (packaging.length === 0) return alert("請先至包材管理頁面建立包材規格");
    setForm(f => ({ ...f, pkg_usages: [...f.pkg_usages, { id: uid(), pkg_id: packaging[0].id, qty: 1, unit_cost_snap: packaging[0].unit_cost }] }));
  };
  const rmPkg = (i) => setForm(f => ({ ...f, pkg_usages: f.pkg_usages.filter((_, j) => j !== i) }));
  const setPkgUsage = (i, field, val) => setForm(f => ({
    ...f,
    pkg_usages: f.pkg_usages.map((u, j) => {
      if (j !== i) return u;
      if (field === "pkg_id") {
        const p = packaging.find(p => p.id === val);
        return { ...u, pkg_id: val, unit_cost_snap: p?.unit_cost ?? 0 };
      }
      return { ...u, [field]: val };
    }),
  }));

  const totalCostOfGoods = form.items.reduce((s, it) => {
    const cost = accMap[it.acc_id]?.unit_cost ?? it.unit_cost_snap ?? 0;
    return s + cost * (Number(it.qty) || 0);
  }, 0);
  const totalPkgCost = form.pkg_usages.reduce((s, u) => {
    const cost = pkgMap[u.pkg_id]?.unit_cost ?? u.unit_cost_snap ?? 0;
    return s + cost * (Number(u.qty) || 0);
  }, 0);
  const sellNum   = Number(form.sell_price) || 0;
  const feeNum    = Number(form.platform_fee) || 0;
  const netProfit = sellNum - totalCostOfGoods - totalPkgCost - feeNum;

  const handleSave = () => {
    if (form.items.length === 0) return alert("請至少選擇一項卡具");
    const snappedItems = form.items.map(it => ({
      ...it,
      unit_cost_snap: accMap[it.acc_id]?.unit_cost ?? it.unit_cost_snap ?? 0,
      qty: Math.max(1, Number(it.qty) || 1),
    }));
    const snappedPkgs = form.pkg_usages.map(u => ({
      ...u,
      unit_cost_snap: pkgMap[u.pkg_id]?.unit_cost ?? u.unit_cost_snap ?? 0,
      qty: Math.max(1, Number(u.qty) || 1),
    }));
    const { sale_date, self_use, ...rest } = form;
    onSave({
      ...sale, ...rest,
      created_at: sale_date || todayISO(),
      channel: self_use ? SELF_USE : (rest.channel === SELF_USE ? "蝦皮拍賣" : rest.channel),
      items: snappedItems,
      pkg_usages: snappedPkgs,
      sell_price: self_use ? 0 : sellNum,
      platform_fee: self_use ? 0 : feeNum,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 w-full sm:max-w-lg bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-zinc-100 font-semibold text-base flex items-center gap-2">
            <ShoppingCart size={16} className="text-teal-400" />
            {sale?.id ? "編輯卡具銷售紀錄" : "新增卡具銷售訂單"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition"><X size={15} className="text-zinc-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-zinc-300 text-sm font-semibold flex items-center gap-1.5"><Tag size={13} className="text-teal-400" />銷售卡具品項 *</label>
              <button onClick={addItem} className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 transition"><PlusCircle size={13} /> 新增品項</button>
            </div>
            {form.items.length === 0 && <p className="text-zinc-600 text-xs py-1">尚未選擇任何卡具品項</p>}
            <div className="space-y-2">
              {form.items.map((it, i) => (
                <div key={it.id} className="flex items-center gap-2 bg-zinc-900/50 p-2 border border-zinc-800 rounded-xl">
                  <select className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg p-1.5 text-zinc-100 text-xs focus:outline-none" value={it.acc_id} onChange={e => setItem(i, "acc_id", e.target.value)}>
                    {sortedAccessories.map(a => <option key={a.id} value={a.id}>{a.name}（庫存 {a.stock} 個）</option>)}
                  </select>
                  <div className="flex items-center gap-1">
                    <input type="number" min="1" className="w-14 bg-zinc-800 border border-zinc-700 rounded-lg p-1.5 text-zinc-100 text-xs text-center" value={it.qty} onChange={e => setItem(i, "qty", Math.max(1, parseInt(e.target.value) || 1))} />
                    <span className="text-zinc-500 text-xs">個</span>
                  </div>
                  <span className="text-zinc-400 text-xs font-mono min-w-[55px] text-right">{fmt((accMap[it.acc_id]?.unit_cost ?? it.unit_cost_snap ?? 0) * (Number(it.qty) || 1), 1)}</span>
                  <button onClick={() => rmItem(i)} className="text-rose-500 hover:text-rose-400 p-1"><MinusCircle size={15} /></button>
                </div>
              ))}
            </div>
            {form.items.length > 0 && (
              <p className="text-right text-xs text-zinc-500 mt-1.5">卡具成本合計：<span className="text-zinc-300 font-mono">{fmt(totalCostOfGoods, 1)}</span></p>
            )}
          </div>

          {/* 自用切換 */}
          <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition ${form.self_use ? "bg-amber-950/30 border-amber-800" : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"}`}>
            <input type="checkbox" className="w-4 h-4 accent-amber-500" checked={form.self_use} onChange={e => set("self_use", e.target.checked)} />
            <div>
              <p className="text-zinc-200 text-sm font-medium">此筆為自用（非販售）</p>
              <p className="text-zinc-500 text-xs">會扣除庫存，但不列入銷售額、獲利與投資報酬率統計</p>
            </div>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-400 text-xs font-medium mb-1 block">實際售出總金額（元）</label>
              <input type="number" disabled={form.self_use} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-teal-500 transition disabled:opacity-40" placeholder={form.self_use ? "自用免填" : "0"} value={form.self_use ? "" : form.sell_price} onChange={e => set("sell_price", e.target.value)} />
            </div>
            <div>
              <label className="text-zinc-400 text-xs font-medium mb-1 block">交易通路/平台</label>
              <select disabled={form.self_use} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-teal-500 transition disabled:opacity-40" value={form.self_use ? "" : form.channel} onChange={e => set("channel", e.target.value)}>
                {form.self_use && <option value="">—</option>}
                {CHANNELS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-400 text-xs font-medium mb-1 block">平台手續費（元）</label>
              <input type="number" disabled={form.self_use} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-teal-500 transition disabled:opacity-40" placeholder={form.self_use ? "自用免填" : "0"} value={form.self_use ? "" : form.platform_fee} onChange={e => set("platform_fee", e.target.value)} />
            </div>
            <div>
              <label className="text-zinc-400 text-xs font-medium mb-1 block">交易日期</label>
              <input type="date" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-teal-500 transition" value={form.sale_date} onChange={e => set("sale_date", e.target.value)} />
            </div>
          </div>
          <div className="border-t border-zinc-800 pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-zinc-400 text-xs font-medium block">使用包材（選填）</label>
              <button onClick={addPkg} className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition"><PlusCircle size={13} /> 增加包材</button>
            </div>
            {form.pkg_usages.length === 0 && <p className="text-zinc-600 text-xs py-1">此訂單未記錄包材消耗</p>}
            <div className="space-y-2">
              {form.pkg_usages.map((u, i) => (
                <div key={u.id} className="flex items-center gap-2 bg-zinc-900/50 p-2 border border-zinc-800 rounded-xl">
                  <select className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg p-1.5 text-zinc-100 text-xs focus:outline-none" value={u.pkg_id} onChange={e => setPkgUsage(i, "pkg_id", e.target.value)}>
                    {packaging.map(p => <option key={p.id} value={p.id}>{p.name}（庫存 {p.stock} 個）</option>)}
                  </select>
                  <div className="flex items-center gap-1">
                    <input type="number" min="1" className="w-14 bg-zinc-800 border border-zinc-700 rounded-lg p-1.5 text-zinc-100 text-xs text-center" value={u.qty} onChange={e => setPkgUsage(i, "qty", Math.max(1, parseInt(e.target.value) || 1))} />
                    <span className="text-zinc-500 text-xs">個</span>
                  </div>
                  <span className="text-zinc-400 text-xs font-mono min-w-[50px] text-right">{fmt(pkgMap[u.pkg_id]?.unit_cost ?? u.unit_cost_snap ?? 0, 1)}</span>
                  <button onClick={() => rmPkg(i)} className="text-rose-500 hover:text-rose-400 p-1"><MinusCircle size={15} /></button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="text-zinc-400 text-xs font-medium mb-1 block">備註（買家 / 訂單說明）</label>
            <input className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-teal-500 transition" placeholder="例如：蝦皮訂單 #123" value={form.buyer_note} onChange={e => set("buyer_note", e.target.value)} />
          </div>
          {!form.self_use && sellNum > 0 && (
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3.5 space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-400"><span>卡具售出金額</span><span className="text-zinc-200">{fmt(sellNum)}</span></div>
              <div className="flex justify-between text-xs text-zinc-400"><span>− 卡具進貨成本</span><span className="text-zinc-200">{fmt(totalCostOfGoods, 1)}</span></div>
              {totalPkgCost > 0 && <div className="flex justify-between text-xs text-zinc-400"><span>− 消耗包材總成本</span><span className="text-zinc-200">{fmt(totalPkgCost, 1)}</span></div>}
              {feeNum > 0 && <div className="flex justify-between text-xs text-zinc-400"><span>− 平台手續費</span><span className="text-zinc-200">{fmt(feeNum)}</span></div>}
              <div className="border-t border-zinc-800 pt-1.5 flex justify-between text-sm font-bold">
                <span className="text-zinc-300">本筆收益淨利</span>
                <span className={netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}>{fmt(netProfit, 1)}</span>
              </div>
            </div>
          )}
        </div>
        <div className="p-5 border-t border-zinc-800 flex gap-3 bg-zinc-950 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 text-sm hover:bg-zinc-800 transition">取消</button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition">確認存檔</button>
        </div>
      </div>
    </div>
  );
}

// ─── AccessoriesPage ──────────────────────────────────────────────────────────
function AccessoriesPage({ accessories, accSales, packaging, onAccUpdate, onDeleteAcc, onAddSale, onEditSale, onDeleteSale }) {
  const [subTab, setSubTab] = useState("inventory");
  const [accModal, setAccModal] = useState(null);
  const [saleModal, setSaleModal] = useState(null);
  const [showSaleModal, setShowSaleModal] = useState(false);

  const pkgMap = useMemo(() => Object.fromEntries(packaging.map(p => [p.id, p])), [packaging]);
  const accMap = useMemo(() => Object.fromEntries(accessories.map(a => [a.id, a])), [accessories]);

  const totalInventoryCost = accessories.reduce((s, a) => s + a.stock * a.unit_cost, 0);
  const billableSales = accSales.filter(s => !isSelfUse(s));
  const totalSalesRevenue  = billableSales.reduce((s, sale) => s + (sale.sell_price ?? 0), 0);
  const totalSalesProfit   = billableSales.reduce((s, sale) => {
    const cogsCost = (sale.items || []).reduce((ss, it) => ss + (it.unit_cost_snap ?? accMap[it.acc_id]?.unit_cost ?? 0) * (it.qty || 0), 0);
    const pkgCost  = calcPkgCost(sale.pkg_usages, pkgMap);
    return s + (sale.sell_price ?? 0) - cogsCost - pkgCost - (sale.platform_fee ?? 0);
  }, 0);

  const handleExportInventory = () => {
    if (accessories.length === 0) return alert("目前沒有可匯出的卡具庫存");
    const headers = ["卡具名稱/規格", "當前庫存", "單位成本", "庫存總成本"];
    const rows = [...accessories]
      .sort((a, b) => a.name.localeCompare(b.name, "zh-TW", { numeric: true, sensitivity: "base" }))
      .map(a => [a.name, a.stock, a.unit_cost, a.stock * a.unit_cost]);
    exportCSV("卡具庫存", headers, rows);
  };

  const handleExportSales = () => {
    if (accSales.length === 0) return alert("目前沒有可匯出的銷售訂單");
    const headers = ["交易日期", "品項明細", "成本合計", "售出金額", "平台手續費", "獲利", "備註"];
    const rows = [...accSales]
      .sort((a, b) => {
        const ka = a.created_at ?? a.id ?? "", kb = b.created_at ?? b.id ?? "";
        return ka < kb ? 1 : ka > kb ? -1 : 0;
      })
      .map(sale => {
        const cogsCost = (sale.items || []).reduce((s, it) => s + (it.unit_cost_snap ?? accMap[it.acc_id]?.unit_cost ?? 0) * (it.qty || 0), 0);
        const pkgCost = calcPkgCost(sale.pkg_usages, pkgMap);
        const selfUse = isSelfUse(sale);
        const profit = (sale.sell_price ?? 0) - cogsCost - pkgCost - (sale.platform_fee ?? 0);
        const itemSummary = (sale.items || []).map(it => `${accMap[it.acc_id]?.name ?? "已刪除品項"} ×${it.qty}`).join("、");
        return [(sale.created_at || "").slice(0, 10), itemSummary, cogsCost + pkgCost, selfUse ? "自用" : (sale.sell_price ?? 0), selfUse ? "" : (sale.platform_fee ?? 0), selfUse ? "自用" : profit, sale.buyer_note ?? ""];
      });
    exportCSV("卡具銷售訂單", headers, rows);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-1">
          <button onClick={() => setSubTab("inventory")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${subTab === "inventory" ? "bg-zinc-800 text-zinc-100 border border-zinc-700/50 shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}>
            <Wrench size={12} /> 卡具庫存
          </button>
          <button onClick={() => setSubTab("sales")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${subTab === "sales" ? "bg-zinc-800 text-zinc-100 border border-zinc-700/50 shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}>
            <ShoppingCart size={12} /> 銷售訂單
          </button>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={subTab === "inventory" ? handleExportInventory : handleExportSales} className="flex items-center gap-1.5 px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-xl text-sm font-medium transition" title="匯出為 CSV"><Download size={15} /> 匯出</button>
          {subTab === "inventory" && (
            <button onClick={() => setAccModal({ type: "new" })} className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-medium transition"><Plus size={15} /> 新增卡具品項</button>
          )}
          {subTab === "sales" && (
            <button onClick={() => { setSaleModal(null); setShowSaleModal(true); }} className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-medium transition"><Plus size={15} /> 登錄銷售訂單</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Boxes}      label="卡具總庫存成本" value={fmt(totalInventoryCost, 1)} sub={`${accessories.length} 種品項`} accent="bg-teal-700" />
        <StatCard icon={DollarSign} label="卡具總銷售額"   value={fmt(totalSalesRevenue)}     sub={`共 ${accSales.length} 筆訂單`} accent="bg-sky-600" />
        <StatCard icon={TrendingUp} label="卡具總獲利"     value={fmt(totalSalesProfit, 1)}   sub={totalSalesProfit >= 0 ? "盈利中" : "虧損中"} accent={totalSalesProfit >= 0 ? "bg-emerald-600" : "bg-rose-600"} />
      </div>

      {subTab === "inventory" && (
        <div className="space-y-2">
          <p className="text-zinc-400 text-sm">目前已建立 <span className="text-teal-400 font-bold">{accessories.length}</span> 種卡具品項</p>
          {accessories.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-12 text-center text-zinc-600">
              <Wrench size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">尚無卡具庫存，請新增品項</p>
            </div>
          ) : (
            <>
              <div className="hidden sm:grid grid-cols-[2.5fr_1.2fr_1.2fr_1.2fr_auto] gap-4 px-4 py-2 text-zinc-500 text-xs font-semibold tracking-wider">
                <span>卡具名稱/規格</span><span>當前庫存</span><span>單位成本</span><span>庫存總成本</span><span>操作</span>
              </div>
              {[...accessories].sort((a, b) => a.name.localeCompare(b.name, "zh-TW", { numeric: true, sensitivity: "base" })).map(a => {
                const low = a.stock <= 5;
                const totalCost = a.stock * a.unit_cost;
                return (
                  <div key={a.id} className={`rounded-2xl border transition p-4 ${low ? "border-rose-900 bg-rose-950/20" : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"}`}>
                    <div className="sm:hidden flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-zinc-100 font-medium text-sm">{a.name}</p>
                          {low && <span className="px-1.5 py-0.5 bg-rose-950 text-rose-400 text-[10px] font-bold rounded-full border border-rose-800 flex items-center gap-0.5"><AlertTriangle size={10} />低庫存</span>}
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-zinc-400 font-mono flex-wrap">
                          <div>庫存：<span className={`font-bold ${low ? "text-rose-400" : "text-zinc-200"}`}>{a.stock}</span> 個</div>
                          <div>成本：<span className="text-zinc-200">{fmt(a.unit_cost, 1)}</span></div>
                          <div>總值：<span className="text-teal-300">{fmt(totalCost, 1)}</span></div>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => setAccModal(a)} className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800 hover:bg-teal-900/40 border border-zinc-700 rounded-xl text-xs text-teal-400 transition"><RefreshCw size={11} /> 補貨</button>
                        <button onClick={() => onDeleteAcc(a.id)} className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-rose-950 flex items-center justify-center text-zinc-600 hover:text-rose-400 transition border border-transparent"><Trash2 size={13} /></button>
                      </div>
                    </div>
                    <div className="hidden sm:grid grid-cols-[2.5fr_1.2fr_1.2fr_1.2fr_auto] gap-4 items-center">
                      <div className="flex items-center gap-2">
                        <Wrench size={14} className={low ? "text-rose-500" : "text-teal-500"} />
                        <span className="text-zinc-100 text-sm font-medium">{a.name}</span>
                        {low && <span className="px-1.5 py-0.5 bg-rose-950 text-rose-400 text-[10px] font-bold rounded-full border border-rose-800 flex items-center gap-0.5"><AlertTriangle size={10} />低庫存</span>}
                      </div>
                      <span className={`text-sm font-mono font-bold ${low ? "text-rose-400" : "text-zinc-200"}`}>{a.stock} <span className="text-zinc-600 text-xs font-normal">個</span></span>
                      <span className="text-zinc-200 text-sm font-mono">{fmt(a.unit_cost, 1)}<span className="text-zinc-600 text-xs"> /個</span></span>
                      <span className="text-teal-300 text-sm font-mono">{fmt(totalCost, 1)}</span>
                      <div className="flex gap-1.5">
                        <button onClick={() => setAccModal(a)} className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-teal-900/40 border border-zinc-700 rounded-xl text-xs text-teal-400 transition font-medium"><RefreshCw size={11} /> 批次補貨</button>
                        <button onClick={() => onDeleteAcc(a.id)} className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-rose-950 flex items-center justify-center text-zinc-500 hover:text-rose-400 transition"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {subTab === "sales" && (
        <div className="space-y-2">
          <p className="text-zinc-400 text-sm">共 <span className="text-teal-400 font-bold">{accSales.length}</span> 筆卡具銷售紀錄</p>
          {accSales.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-12 text-center text-zinc-600">
              <ShoppingCart size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">尚無卡具銷售紀錄</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="hidden lg:grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_auto] gap-4 px-4 py-2 text-zinc-500 text-xs font-semibold tracking-wider">
                <span>品項明細</span><span>成本合計</span><span>售出金額</span><span>獲利</span><span>操作</span>
              </div>
              {[...accSales].sort((a, b) => {
                const ka = a.created_at ?? a.id ?? "";
                const kb = b.created_at ?? b.id ?? "";
                return ka < kb ? 1 : ka > kb ? -1 : 0;
              }).map(sale => {
                const cogsCost = (sale.items || []).reduce((s, it) => s + (it.unit_cost_snap ?? accMap[it.acc_id]?.unit_cost ?? 0) * (it.qty || 0), 0);
                const pkgCost  = calcPkgCost(sale.pkg_usages, pkgMap);
                const profit   = (sale.sell_price ?? 0) - cogsCost - pkgCost - (sale.platform_fee ?? 0);
                const itemSummary = (sale.items || []).map(it => `${accMap[it.acc_id]?.name ?? "已刪除品項"} ×${it.qty}`).join("、");
                const selfUse = isSelfUse(sale);
                const dateLabel = (() => {
                  const d = sale.created_at || "";
                  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
                  if (m) return `${parseInt(m[2])}月${parseInt(m[3])}日`;
                  const m2 = d.match(/^(\d{4})-(\d{2})/);
                  if (m2) return `${parseInt(m2[2])}月`;
                  return "";
                })();
                return (
                  <div key={sale.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition p-4">
                    <div className="lg:hidden space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            {dateLabel && <span className="text-teal-500 text-xs font-mono">{dateLabel}</span>}
                            {selfUse && <span className="px-1.5 py-0.5 bg-amber-950 text-amber-400 text-[10px] font-bold rounded-full border border-amber-800">自用</span>}
                          </div>
                          <p className="text-zinc-100 font-medium text-sm leading-snug break-words">{itemSummary || "（無品項）"}</p>
                          {sale.buyer_note && <p className="text-zinc-500 text-xs mt-0.5">{sale.buyer_note}</p>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => { setSaleModal(sale); setShowSaleModal(true); }} className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition"><Pencil size={13} className="text-zinc-400" /></button>
                          <button onClick={() => onDeleteSale(sale.id)} className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-rose-950 flex items-center justify-center transition text-zinc-500 hover:text-rose-400"><Trash2 size={13} /></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-xs border-y border-zinc-800/50 py-1.5 my-1 font-mono">
                        <div><span className="text-zinc-500 block">成本</span><span className="text-zinc-300">{fmt(cogsCost + pkgCost, 1)}</span></div>
                        <div><span className="text-zinc-500 block">售出</span><span className="text-zinc-300">{selfUse ? "—" : fmt(sale.sell_price)}</span></div>
                        <div><span className="text-zinc-500 block">獲利</span>{selfUse ? <span className="text-amber-400">自用</span> : <span className={`font-bold ${profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{profit >= 0 ? "+" : ""}{fmt(profit, 1)}</span>}</div>
                      </div>
                    </div>
                    <div className="hidden lg:grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_auto] gap-4 items-center">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {dateLabel && <span className="text-teal-500 text-xs font-mono">{dateLabel}</span>}
                          {selfUse && <span className="px-1.5 py-0.5 bg-amber-950 text-amber-400 text-[10px] font-bold rounded-full border border-amber-800">自用</span>}
                        </div>
                        <p className="text-zinc-100 text-sm font-medium truncate">{itemSummary || "（無品項）"}</p>
                        {sale.buyer_note && <p className="text-zinc-500 text-xs truncate mt-0.5">{sale.buyer_note}</p>}
                      </div>
                      <span className="text-zinc-300 text-sm font-mono">{fmt(cogsCost + pkgCost, 1)}</span>
                      <span className="text-zinc-300 text-sm font-mono">{selfUse ? "—" : fmt(sale.sell_price)}</span>
                      {selfUse ? <span className="text-amber-400 text-sm">自用</span> : <span className={`text-sm font-mono font-bold ${profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{profit >= 0 ? "+" : ""}{fmt(profit, 1)}</span>}
                      <div className="flex gap-1.5">
                        <button onClick={() => { setSaleModal(sale); setShowSaleModal(true); }} className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition"><Pencil size={13} className="text-zinc-400" /></button>
                        <button onClick={() => onDeleteSale(sale.id)} className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-rose-950 flex items-center justify-center transition text-zinc-500 hover:text-rose-400"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {accModal && <AccessoryModal acc={accModal?.type === "new" ? null : accModal} onSave={(data) => { onAccUpdate(data); setAccModal(null); }} onClose={() => setAccModal(null)} />}
      {showSaleModal && <AccessorySaleModal sale={saleModal} accessories={accessories} packaging={packaging} onSave={(data) => { if (data.id) onEditSale(data); else onAddSale(data); setShowSaleModal(false); }} onClose={() => setShowSaleModal(false)} />}
    </div>
  );
}

// ─── PackagingPage ────────────────────────────────────────────────────────────
function PackagingPage({ packaging, onPkgUpdate, onDeletePkg }) {
  const [modal, setModal] = useState(null);
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-zinc-400 text-sm">目前已建立 <span className="text-amber-400 font-bold">{packaging.length}</span> 種基本包材</p>
        <button onClick={() => setModal({ type: "new" })} className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-medium transition"><Plus size={15} /> 新增包材規格</button>
      </div>
      {packaging.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-12 text-center text-zinc-600">
          <Package size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">尚無包材數據</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="hidden sm:grid grid-cols-[2.5fr_1.2fr_1.2fr_auto] gap-4 px-4 py-2 text-zinc-500 text-xs font-semibold tracking-wider">
            <span>物料名稱/規格描述</span><span>當前庫存餘額</span><span>單位攤提成本</span><span>操作</span>
          </div>
          {packaging.map(p => {
            const low = p.stock <= 10;
            return (
              <div key={p.id} className={`rounded-2xl border transition p-4 ${low ? "border-rose-900 bg-rose-950/20" : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"}`}>
                <div className="sm:hidden flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-zinc-100 font-medium text-sm">{p.name}</p>
                      {low && <span className="px-1.5 py-0.5 bg-rose-950 text-rose-400 text-[10px] font-bold rounded-full border border-rose-800 flex items-center gap-0.5"><AlertTriangle size={10} />低庫存</span>}
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-zinc-400 font-mono">
                      <div>庫存：<span className={`font-bold ${low ? "text-rose-400" : "text-zinc-200"}`}>{p.stock}</span> 個</div>
                      <div>成本：<span className="text-zinc-200">{fmt(p.unit_cost, 1)}</span></div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setModal(p)} className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800 hover:bg-amber-900/40 border border-zinc-700 rounded-xl text-xs text-amber-400 transition"><RefreshCw size={11} /> 進貨</button>
                    <button onClick={() => onDeletePkg(p.id)} className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-rose-950 flex items-center justify-center text-zinc-600 hover:text-rose-400 transition border border-transparent"><Trash2 size={13} /></button>
                  </div>
                </div>
                <div className="hidden sm:grid grid-cols-[2.5fr_1.2fr_1.2fr_auto] gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <Package size={14} className={low ? "text-rose-500" : "text-zinc-500"} />
                    <span className="text-zinc-100 text-sm font-medium">{p.name}</span>
                    {low && <span className="px-1.5 py-0.5 bg-rose-950 text-rose-400 text-[10px] font-bold rounded-full border border-rose-800 flex items-center gap-0.5"><AlertTriangle size={10} />低庫存</span>}
                  </div>
                  <span className={`text-sm font-mono font-bold ${low ? "text-rose-400" : "text-zinc-200"}`}>{p.stock} <span className="text-zinc-600 text-xs font-normal">個</span></span>
                  <span className="text-zinc-200 text-sm font-mono">{fmt(p.unit_cost, 1)}<span className="text-zinc-600 text-xs"> /個</span></span>
                  <div className="flex gap-1.5">
                    <button onClick={() => setModal(p)} className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-amber-900/40 border border-zinc-700 rounded-xl text-xs text-amber-400 transition font-medium"><RefreshCw size={11} /> 批次補貨進貨</button>
                    <button onClick={() => onDeletePkg(p.id)} className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-rose-950 flex items-center justify-center text-zinc-500 hover:text-rose-400 transition"><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {modal && <PkgModal pkg={modal?.type === "new" ? null : modal} onSave={(data) => { onPkgUpdate(data); setModal(null); }} onClose={() => setModal(null)} />}
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]           = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab]             = useState("dashboard");
  const [cards, setCards]         = useState([]);
  const [packaging, setPkg]       = useState([]);
  const [accessories, setAcc]     = useState([]);
  const [accSales, setAccSales]   = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchCloudData = useCallback(async (currentUser) => {
    if (!currentUser) return;
    setDataLoading(true);
    try {
      const [cardsRes, pkgRes, accRes, accSalesRes] = await Promise.all([
        // 越早新增的在上面 → ascending
        supabase.from("cards").select("*").order("created_at", { ascending: true }),
        supabase.from("packaging").select("*").order("created_at", { ascending: true }),
        supabase.from("accessories").select("*").order("created_at", { ascending: true }),
        supabase.from("acc_sales").select("*").order("created_at", { ascending: false }),
      ]);
      if (cardsRes.error) throw cardsRes.error;
      if (pkgRes.error) throw pkgRes.error;
      setCards(cardsRes.data || []);
      setPkg(pkgRes.data || []);
      setAcc(accRes.data || []);
      setAccSales(accSalesRes.data || []);
    } catch (err) {
      console.error("雲端讀取錯誤:", err.message);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchCloudData(user);
  }, [user, fetchCloudData]);

  const pkgMap = useMemo(() => Object.fromEntries(packaging.map(p => [p.id, p])), [packaging]);
  const accMap = useMemo(() => Object.fromEntries(accessories.map(a => [a.id, a])), [accessories]);

  const syncPackagingStockToCloud = async (updatedPkgList) => {
    setPkg(updatedPkgList);
    for (const p of updatedPkgList) {
      await supabase.from("packaging").update({ stock: p.stock, unit_cost: p.unit_cost }).eq("id", p.id);
    }
  };

  const adjustPackagingStockLocal = (usages, multiplier, currentPkgs) => {
    if (!usages || usages.length === 0) return currentPkgs;
    return currentPkgs.map(p => {
      const match = usages.find(u => u.pkg_id === p.id);
      if (!match) return p;
      return { ...p, stock: Math.max(0, p.stock + (match.qty || 0) * multiplier) };
    });
  };

  // ── Cards ──
  const addCard = useCallback(async (data) => {
    if (!user) return;
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    let nextPkgs = [...packaging];
    if (data.status === "sold" || data.status === "closed") {
      nextPkgs = adjustPackagingStockLocal(data.pkg_usages, -1, nextPkgs);
    }
    const newCardRow = { user_id: user.id, ...data, created_at: data.created_at || dateStr, updated_at: dateStr };
    const { data: inserted, error } = await supabase.from("cards").insert([newCardRow]).select();
    if (error) return alert("雲端新增失敗: " + error.message);
    if (inserted) setCards(cs => [inserted[0], ...cs]);
    await syncPackagingStockToCloud(nextPkgs);
  }, [user, packaging]);

  const editCard = useCallback(async (data) => {
    if (!user) return;
    const currentMonth = todayISO();
    const originalCard = cards.find(c => c.id === data.id);
    if (!originalCard) return;
    const wasDeducted = originalCard.status === "sold" || originalCard.status === "closed";
    const willDeduct  = data.status === "sold" || data.status === "closed";
    let nextPkgs = [...packaging];
    if (wasDeducted && !willDeduct) {
      nextPkgs = adjustPackagingStockLocal(originalCard.pkg_usages, 1, nextPkgs);
    } else if (!wasDeducted && willDeduct) {
      nextPkgs = adjustPackagingStockLocal(data.pkg_usages, -1, nextPkgs);
    } else if (wasDeducted && willDeduct) {
      nextPkgs = adjustPackagingStockLocal(originalCard.pkg_usages, 1, nextPkgs);
      nextPkgs = adjustPackagingStockLocal(data.pkg_usages, -1, nextPkgs);
    }
    const { error } = await supabase.from("cards").update({ ...data, updated_at: currentMonth }).eq("id", data.id);
    if (error) return alert("雲端更新失敗: " + error.message);
    setCards(cs => cs.map(c => c.id === data.id ? { ...data, updated_at: currentMonth } : c));
    await syncPackagingStockToCloud(nextPkgs);
  }, [user, cards, packaging]);

  const deleteCard = useCallback(async (id) => {
    if (!confirm("確定要刪除這張卡片紀錄嗎？")) return;
    const target = cards.find(c => c.id === id);
    if (!target) return;
    let nextPkgs = [...packaging];
    if (target.status === "sold" || target.status === "closed") {
      nextPkgs = adjustPackagingStockLocal(target.pkg_usages, 1, nextPkgs);
    }
    const { error } = await supabase.from("cards").delete().eq("id", id);
    if (error) return alert("雲端刪除失敗: " + error.message);
    setCards(cs => cs.filter(c => c.id !== id));
    await syncPackagingStockToCloud(nextPkgs);
  }, [cards, packaging]);

  // ── Packaging ──
  const handlePkgUpdate = useCallback(async (data) => {
    if (!user) return;
    if (data.type === "new") {
      const newRow = { user_id: user.id, name: data.name, stock: data.stock, unit_cost: data.unit_cost };
      const { data: inserted, error } = await supabase.from("packaging").insert([newRow]).select();
      if (error) return alert("包材建立失敗: " + error.message);
      if (inserted) setPkg(ps => [...ps, inserted[0]]);
    } else if (data.type === "restock") {
      const p = packaging.find(item => item.id === data.id);
      if (!p) return;
      const currentTotalCost = p.stock * p.unit_cost;
      const finalStock    = p.stock + data.qty_add;
      const finalUnitCost = finalStock > 0 ? (currentTotalCost + data.total_cost) / finalStock : 0;
      const { error } = await supabase.from("packaging").update({ stock: finalStock, unit_cost: parseFloat(finalUnitCost.toFixed(1)) }).eq("id", data.id);
      if (error) return alert("進貨失敗: " + error.message);
      setPkg(ps => ps.map(item => item.id === data.id ? { ...item, stock: finalStock, unit_cost: parseFloat(finalUnitCost.toFixed(1)) } : item));
    }
  }, [user, packaging]);

  const deletePkg = useCallback(async (id) => {
    if (!confirm("確定刪除此包材規格？歷史訂單如果串接此項目，成本將會即時歸零。")) return;
    const { error } = await supabase.from("packaging").delete().eq("id", id);
    if (error) return alert("刪除失敗: " + error.message);
    setPkg(ps => ps.filter(p => p.id !== id));
  }, []);

  // ── Accessories ──
  const handleAccUpdate = useCallback(async (data) => {
    if (!user) return;
    if (data.type === "new") {
      const newRow = { user_id: user.id, name: data.name, stock: data.stock, unit_cost: data.unit_cost };
      const { data: inserted, error } = await supabase.from("accessories").insert([newRow]).select();
      if (error) return alert("卡具建立失敗: " + error.message);
      if (inserted) setAcc(ps => [...ps, inserted[0]]);
    } else if (data.type === "restock") {
      const a = accessories.find(item => item.id === data.id);
      if (!a) return;
      const currentTotalCost = a.stock * a.unit_cost;
      const finalStock    = a.stock + data.qty_add;
      const finalUnitCost = finalStock > 0 ? (currentTotalCost + data.total_cost) / finalStock : 0;
      const { error } = await supabase.from("accessories").update({ stock: finalStock, unit_cost: parseFloat(finalUnitCost.toFixed(1)) }).eq("id", data.id);
      if (error) return alert("補貨失敗: " + error.message);
      setAcc(ps => ps.map(item => item.id === data.id ? { ...item, stock: finalStock, unit_cost: parseFloat(finalUnitCost.toFixed(1)) } : item));
    }
  }, [user, accessories]);

  const deleteAcc = useCallback(async (id) => {
    if (!confirm("確定刪除此卡具品項？")) return;
    const { error } = await supabase.from("accessories").delete().eq("id", id);
    if (error) return alert("刪除失敗: " + error.message);
    setAcc(ps => ps.filter(a => a.id !== id));
  }, []);

  const syncAccStockToCloud = async (updatedAccList) => {
    setAcc(updatedAccList);
    for (const a of updatedAccList) {
      await supabase.from("accessories").update({ stock: a.stock, unit_cost: a.unit_cost }).eq("id", a.id);
    }
  };

  const adjustAccStockLocal = (items, multiplier, currentAccList) => {
    if (!items || items.length === 0) return currentAccList;
    return currentAccList.map(a => {
      const match = items.find(it => it.acc_id === a.id);
      if (!match) return a;
      return { ...a, stock: Math.max(0, a.stock + (match.qty || 0) * multiplier) };
    });
  };

  const addAccSale = useCallback(async (data) => {
    if (!user) return;
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    let nextAcc  = adjustAccStockLocal(data.items, -1, [...accessories]);
    let nextPkgs = adjustPackagingStockLocal(data.pkg_usages, -1, [...packaging]);
    const newRow = { user_id: user.id, ...data, created_at: data.created_at || dateStr, updated_at: dateStr };
    const { data: inserted, error } = await supabase.from("acc_sales").insert([newRow]).select();
    if (error) return alert("卡具銷售新增失敗: " + error.message);
    if (inserted) setAccSales(ss => [inserted[0], ...ss]);
    await syncAccStockToCloud(nextAcc);
    await syncPackagingStockToCloud(nextPkgs);
  }, [user, accessories, packaging]);

  const editAccSale = useCallback(async (data) => {
    if (!user) return;
    const currentMonth = todayISO();
    const original = accSales.find(s => s.id === data.id);
    if (!original) return;
    let nextAcc  = adjustAccStockLocal(original.items, 1, [...accessories]);
    nextAcc      = adjustAccStockLocal(data.items, -1, nextAcc);
    let nextPkgs = adjustPackagingStockLocal(original.pkg_usages, 1, [...packaging]);
    nextPkgs     = adjustPackagingStockLocal(data.pkg_usages, -1, nextPkgs);
    const { error } = await supabase.from("acc_sales").update({ ...data, updated_at: currentMonth }).eq("id", data.id);
    if (error) return alert("卡具銷售更新失敗: " + error.message);
    setAccSales(ss => ss.map(s => s.id === data.id ? { ...data, updated_at: currentMonth } : s));
    await syncAccStockToCloud(nextAcc);
    await syncPackagingStockToCloud(nextPkgs);
  }, [user, accSales, accessories, packaging]);

  const deleteAccSale = useCallback(async (id) => {
    if (!confirm("確定刪除這筆卡具銷售紀錄嗎？")) return;
    const target = accSales.find(s => s.id === id);
    if (!target) return;
    let nextAcc  = adjustAccStockLocal(target.items, 1, [...accessories]);
    let nextPkgs = adjustPackagingStockLocal(target.pkg_usages, 1, [...packaging]);
    const { error } = await supabase.from("acc_sales").delete().eq("id", id);
    if (error) return alert("刪除失敗: " + error.message);
    setAccSales(ss => ss.filter(s => s.id !== id));
    await syncAccStockToCloud(nextAcc);
    await syncPackagingStockToCloud(nextPkgs);
  }, [accSales, accessories, packaging]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null); setCards([]); setPkg([]); setAcc([]); setAccSales([]);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 text-sm">
        <Loader2 size={20} className="animate-spin text-violet-500 mr-2" /> 雲端同步安全連線中…
      </div>
    );
  }
  if (!user) return <AuthView onAuthSuccess={(u) => setUser(u)} />;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased">
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-900/30">
              <Star size={14} className="text-white fill-white" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-zinc-100 text-sm block leading-none">球員卡雲端庫存系統</span>
              <span className="text-[10px] text-zinc-500 font-mono">{user.email}</span>
            </div>
          </div>
          <nav className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 shadow-inner">
            {[
              { key: "dashboard",   label: "數據看板", icon: LayoutDashboard },
              { key: "cards",       label: "卡片管理", icon: CreditCard },
              { key: "accessories", label: "卡具管理", icon: Wrench },
              { key: "packaging",   label: "包材管理", icon: Package },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === t.key ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/50" : "text-zinc-500 hover:text-zinc-300"}`}>
                <t.icon size={13} /><span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
            <button onClick={handleLogout} className="flex items-center p-1.5 text-zinc-500 hover:text-rose-400 transition" title="登出系統"><LogOut size={14} /></button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">
              {tab === "dashboard"   && "數據看板"}
              {tab === "cards"       && "卡片管理"}
              {tab === "accessories" && "卡具管理"}
              {tab === "packaging"   && "包材管理"}
            </h1>
            <p className="text-zinc-500 text-xs mt-0.5">
              {tab === "dashboard"   && "雲端利潤概覽與跨管道即時分析"}
              {tab === "cards"       && `目前雲端載入有 ${cards.length} 張實體球員卡紀錄`}
              {tab === "accessories" && "卡夾、磁吸殼等卡具庫存與獨立銷售管理"}
              {tab === "packaging"   && "追蹤店內耗材雲端餘額、加權單價與補貨紀錄"}
            </p>
          </div>
          {dataLoading && (
            <span className="text-xs text-violet-400 flex items-center font-mono gap-1">
              <RefreshCw size={11} className="animate-spin" /> Cloud Fetching…
            </span>
          )}
        </div>

        {tab === "dashboard"   && <Dashboard cards={cards} pkgMap={pkgMap} accSales={accSales} accMap={accMap} />}
        {tab === "cards"       && <CardsPage cards={cards} packaging={packaging} onAdd={addCard} onEdit={editCard} onDelete={deleteCard} />}
        {tab === "accessories" && <AccessoriesPage accessories={accessories} accSales={accSales} packaging={packaging} onAccUpdate={handleAccUpdate} onDeleteAcc={deleteAcc} onAddSale={addAccSale} onEditSale={editAccSale} onDeleteSale={deleteAccSale} />}
        {tab === "packaging"   && <PackagingPage packaging={packaging} onPkgUpdate={handlePkgUpdate} onDeletePkg={deletePkg} />}
      </main>
    </div>
  );
}
