// lib/DataContext.jsx — CofiBakuPromo
// Per-user isolated storage in Upstash Redis.
// On first login, sample data is auto-loaded.
// Structure: cofibaku:user:{userId}:reg:v1:{chunk} / :meta

"use client";
import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import pako from "pako";
import { buildSampleRegistry } from "@/lib/sampleData";

// ── Branch/bank lists ─────────────────────────────────────────────────────
export const BRANCHES = ["İçərişəhər", "Nizami", "Binəqədi"];
export const BANKS    = ["Kapital", "ABB", "Pasa"];
const CHUNK_LIMIT = 350_000;

// ── Compression helpers ───────────────────────────────────────────────────
function compress(obj) {
  const json = JSON.stringify(obj);
  return btoa(String.fromCharCode(...pako.deflate(new TextEncoder().encode(json))));
}
function decompress(b64) {
  if (!b64) return null;
  const bin = atob(b64);
  const buf = Uint8Array.from(bin, c => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(pako.inflate(buf)));
}

// ── Analytics computation (same engine as Cofiesto) ───────────────────────
function computeDashboardData(registry) {
  if (!registry || !Object.keys(registry).length) return { hasData:false };
  let hasAny = false;
  const result = { pnl:{}, pos:{}, monthlyTrend:[], growth:{compSales:0,transactions:0,avgTicket:0,period:""}, network:{}, hasData:false, aiSummaries:{}, anomalies:[] };

  for (const branch of BRANCHES) {
    const b = registry[branch];
    if (!b) continue;

    // P&L
    if (b.pnl?.monthly?.length) {
      hasAny = true;
      const m = b.pnl.monthly;
      result.pnl[branch] = {
        monthly: m,
        totalRevenue: m.reduce((s,x)=>s+(x.revenue||0),0),
        totalNetProfit: m.reduce((s,x)=>s+(x.netProfit||0),0),
        avgMargin: 0,
        months: m.length,
      };
      const r = result.pnl[branch];
      r.avgMargin = r.totalRevenue>0 ? Math.round(r.totalNetProfit/r.totalRevenue*100) : 0;
    }

    // POS
    for (const bank of BANKS) {
      const src = b.pos?.[bank];
      if (!src?.monthly?.length) continue;
      hasAny = true;
      if (!result.pos[branch]) result.pos[branch] = { monthly:[], byBank:{}, totalRevenue:0, totalTxns:0, uniqueCards:0, avgTicket:0 };

      // True unique cards from txnIndex
      const allCards = new Set();
      if (src.txnIndex) Object.values(src.txnIndex).forEach(tx => tx.card && allCards.add(tx.card));

      result.pos[branch].byBank[bank] = {
        monthly: src.monthly,
        totalRevenue: src.monthly.reduce((s,m)=>s+(m.revenue||0),0),
        totalTxns: src.monthly.reduce((s,m)=>s+(m.txns||0),0),
        uniqueCards: allCards.size || src.monthly.reduce((s,m)=>s+(m.uniqueCards||0),0),
        avgTicket: src.avgTicket || (src.monthly.reduce((s,m)=>s+(m.revenue||0),0) / Math.max(1,src.monthly.reduce((s,m)=>s+(m.txns||0),0))),
      };
      if (src.summary) { if (!result.aiSummaries[branch]) result.aiSummaries[branch] = {}; result.aiSummaries[branch][bank] = src.summary; }
      if (src.anomalies?.length) result.anomalies.push(...src.anomalies.map(a=>`[${branch}/${bank}] ${a}`));
    }

    // Aggregate POS across banks per branch
    if (result.pos[branch]) {
      const banks = Object.values(result.pos[branch].byBank);
      const allBranchCards = new Set();
      if (b.pos) {
        for (const bank of BANKS) {
          const src = b.pos[bank];
          if (src?.txnIndex) Object.values(src.txnIndex).forEach(tx => tx.card && allBranchCards.add(tx.card));
        }
      }
      result.pos[branch].totalRevenue  = banks.reduce((s,bk)=>s+bk.totalRevenue,0);
      result.pos[branch].totalTxns     = banks.reduce((s,bk)=>s+bk.totalTxns,0);
      result.pos[branch].uniqueCards   = allBranchCards.size || banks.reduce((s,bk)=>s+bk.uniqueCards,0);
      result.pos[branch].avgTicket     = result.pos[branch].totalTxns>0 ? Math.round(result.pos[branch].totalRevenue/result.pos[branch].totalTxns*100)/100 : 0;

      // Rebuild monthly combining all banks
      const byM = {};
      for (const bk of Object.values(result.pos[branch].byBank)) {
        for (const m of bk.monthly) {
          if (!byM[m.month]) byM[m.month] = { month:m.month, revenue:0, txns:0, uniqueCards:0, avgTicket:0 };
          byM[m.month].revenue += m.revenue||0;
          byM[m.month].txns    += m.txns||0;
        }
      }
      result.pos[branch].monthly = Object.values(byM).sort((a,b)=>a.month.localeCompare(b.month)).map(m=>({
        ...m, avgTicket: m.txns>0?Math.round(m.revenue/m.txns*100)/100:0,
      }));
    }
  }

  // Monthly trend (P&L revenue)
  const trendMap = {};
  for (const branch of BRANCHES) {
    const pnl = result.pnl[branch];
    if (!pnl) continue;
    for (const m of pnl.monthly) {
      if (!trendMap[m.month]) trendMap[m.month] = { m:m.month };
      const k = { "İçərişəhər":"icerisheher","Nizami":"nizami","Binəqədi":"bineqedi" }[branch] || branch.toLowerCase();
      trendMap[m.month][k] = m.revenue;
    }
  }
  const _MN=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const _toKey=(m)=>{const[mon,yr]=(m||"").split(" ");return `${yr||"0"}-${String(_MN.findIndex(n=>mon?.startsWith(n))+1).padStart(2,"0")}`;};
  result.monthlyTrend = Object.values(trendMap).sort((a,b)=>_toKey(a.m).localeCompare(_toKey(b.m)));

  // Network
  let netRev=0, netTxn=0; const netCards = new Set();
  for (const branch of BRANCHES) {
    const p = result.pos[branch];
    if (!p) continue;
    netRev += p.totalRevenue;
    netTxn += p.totalTxns;
    for (const bank of BANKS) {
      const src = registry[branch]?.pos?.[bank];
      if (src?.txnIndex) Object.values(src.txnIndex).forEach(tx => tx.card && netCards.add(tx.card));
    }
  }
  result.network = { totalRevenue:Math.round(netRev), totalTxns:netTxn, uniqueCards:netCards.size||0, avgTicket:netTxn>0?Math.round(netRev/netTxn*100)/100:0 };

  // Growth MoM
  const allMonthlyPos = {};
  for (const branch of BRANCHES) {
    const p = result.pos[branch];
    if (!p) continue;
    for (const m of p.monthly) {
      if (!allMonthlyPos[m.month]) allMonthlyPos[m.month] = {revenue:0,txns:0};
      allMonthlyPos[m.month].revenue += m.revenue;
      allMonthlyPos[m.month].txns    += m.txns;
    }
  }
  const sortedMonths = Object.keys(allMonthlyPos).sort();
  if (sortedMonths.length >= 2) {
    const cur = allMonthlyPos[sortedMonths[sortedMonths.length-1]];
    const prv = allMonthlyPos[sortedMonths[sortedMonths.length-2]];
    if (prv.revenue>0) result.growth.compSales    = Math.round((cur.revenue-prv.revenue)/prv.revenue*100);
    if (prv.txns>0)    result.growth.transactions = Math.round((cur.txns-prv.txns)/prv.txns*100);
    const curATk = cur.txns>0?cur.revenue/cur.txns:0;
    const prvATk = prv.txns>0?prv.revenue/prv.txns:0;
    if (prvATk>0)      result.growth.avgTicket    = Math.round((curATk-prvATk)/prvATk*100);
    result.growth.period = `${sortedMonths[sortedMonths.length-2]} → ${sortedMonths[sortedMonths.length-1]}`;
  }

  result.hasData = hasAny;
  return result;
}

function computeCustomerAnalytics(registry) {
  if (!registry) return { hasData:false };
  const networkTxns = []; const byBranch = {};

  for (const branch of BRANCHES) {
    const branchTxns = [];
    for (const bank of BANKS) {
      const src = registry[branch]?.pos?.[bank];
      if (!src?.txnIndex) continue;
      for (const tx of Object.values(src.txnIndex)) {
        branchTxns.push(tx);
        networkTxns.push({ ...tx, branch });
      }
    }
    if (branchTxns.length === 0) continue;

    const cards = {};
    for (const tx of branchTxns) {
      if (!tx.card) continue;
      if (!cards[tx.card]) cards[tx.card] = { revenue:0, visits:0, dates:[] };
      cards[tx.card].revenue += tx.amount;
      cards[tx.card].visits++;
      if (tx.date) cards[tx.card].dates.push(tx.date);
    }

    const refDay = Math.max(...branchTxns.map(tx => tx.date ? new Date(tx.date).getTime() : 0)) / 86400000;
    let oneTime=0, atRisk=0, vip=0, loyal=0, casual=0, totRev=0, totTxns=branchTxns.length, vipRev=0;
    for (const c of Object.values(cards)) {
      totRev += c.revenue;
      const lastVisit = c.dates.length ? (refDay - Math.max(...c.dates.map(d=>new Date(d).getTime()/86400000))) : 999;
      if (c.visits === 1)                          { oneTime++; }
      else if (c.visits >= 4 && lastVisit <= 30)   { vip++; vipRev += c.revenue; }
      else if (c.visits >= 3 && lastVisit <= 45)   { loyal++; }
      else if (c.visits >= 2 && lastVisit > 60)    { atRisk++; }
      else                                          { casual++; }
    }
    const totalCusts = Object.keys(cards).length;
    const avgTicket = totTxns>0 ? totRev/totTxns : 0;
    byBranch[branch] = {
      _base:{ totalCusts, totalTxns:totTxns, totalRev:Math.round(totRev), oneTimeCount:oneTime, atRiskCount:atRisk, vipCount:vip, loyalCount:loyal, casualCount:casual, vipRev:Math.round(vipRev), avgTicket:Math.round(avgTicket*100)/100 },
      hasData:true,
    };
  }

  // Network
  const netCards = {};
  for (const tx of networkTxns) {
    if (!tx.card) continue;
    if (!netCards[tx.card]) netCards[tx.card] = { revenue:0, visits:0, dates:[] };
    netCards[tx.card].revenue += tx.amount;
    netCards[tx.card].visits++;
    if (tx.date) netCards[tx.card].dates.push(tx.date);
  }
  const refDayNet = Math.max(...networkTxns.map(t=>t.date?new Date(t.date).getTime():0))/86400000;
  let netOneTime=0, netAtRisk=0, netVip=0, netTotRev=0, netVipRev=0;
  for (const c of Object.values(netCards)) {
    netTotRev += c.revenue;
    const lastVisit = c.dates.length ? (refDayNet - Math.max(...c.dates.map(d=>new Date(d).getTime()/86400000))) : 999;
    if (c.visits===1) netOneTime++;
    else if (c.visits>=4 && lastVisit<=30) { netVip++; netVipRev += c.revenue; }
    else if (c.visits>=2 && lastVisit>60) netAtRisk++;
  }
  const netTotalCusts = Object.keys(netCards).length;

  return {
    hasData: Object.keys(byBranch).length > 0,
    byBranch,
    network:{ totalCusts:netTotalCusts, totalTxns:networkTxns.length, totalRev:Math.round(netTotRev), oneTimeCount:netOneTime, atRiskCount:netAtRisk, vipCount:netVip, vipRev:Math.round(netVipRev), avgTicket:Math.round(netTotRev/Math.max(1,networkTxns.length)*100)/100 },
  };
}

// ── Context ────────────────────────────────────────────────────────────────
const DataCtx = createContext(null);
export function useData() { return useContext(DataCtx); }

export function DataProvider({ children, userId }) {
  const [registry, setRegistry]   = useState({});
  const [syncing,  setSyncing]    = useState(false);
  const [loaded,   setLoaded]     = useState(false);
  const debounceRef = useRef(null);
  const isSampleRef = useRef(false);

  const dashboardData     = useMemo(() => computeDashboardData(registry),      [registry]);
  const customerAnalytics = useMemo(() => computeCustomerAnalytics(registry),  [registry]);

  // ── Load from cloud ──────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const res  = await fetch(`/api/registry?userId=${encodeURIComponent(userId)}`);
        const data = await res.json();
        if (data.ok && data.gz) {
          const reg = decompress(data.gz);
          if (reg && Object.keys(reg).length) {
            setRegistry(reg);
            setLoaded(true);
            return;
          }
        }
      } catch (_) {}

      // First login — load sample data
      const sample = buildSampleRegistry();
      setRegistry(sample);
      isSampleRef.current = true;
      setLoaded(true);
      // Persist sample to cloud
      persistRegistry(sample, userId);
    })();
  }, [userId]);

  // ── Persist to cloud ─────────────────────────────────────────────────
  const persistRegistry = useCallback(async (reg, uid) => {
    if (!uid) return;
    setSyncing(true);
    try {
      const gz = compress(reg);
      await fetch(`/api/registry?userId=${encodeURIComponent(uid)}`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ gz }),
      });
    } catch (_) {}
    setSyncing(false);
  }, []);

  const scheduleSync = useCallback((reg) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => persistRegistry(reg, userId), 600);
  }, [userId, persistRegistry]);

  // ── addSource ─────────────────────────────────────────────────────────
  const addSource = useCallback((branch, type, bank, result, fileName, opts={}) => {
    setRegistry(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[branch]) next[branch] = { pnl:null, pos:{} };
      if (type === "pnl") {
        next[branch].pnl = { fileName, files:[...(next[branch].pnl?.files||[]), fileName].slice(-5), uploadedAt:new Date().toISOString(), summary:result.summary||"", anomalies:result.anomalies||[], monthly:result.monthly||[] };
      } else {
        if (!next[branch].pos[bank]) next[branch].pos[bank] = { fileName, files:[], uploadedAt:new Date().toISOString(), summary:"", anomalies:[], monthly:[], txnIndex:{}, txnCount:0 };
        const existing = next[branch].pos[bank];
        const newTxns  = opts.transactions || {};
        let added=0, skipped=0;
        for (const [rrn, tx] of Object.entries(newTxns)) {
          if (existing.txnIndex[rrn]) { skipped++; }
          else { existing.txnIndex[rrn]=tx; added++; }
        }
        existing.txnCount   = Object.keys(existing.txnIndex).length;
        existing.files      = [...(existing.files||[]), fileName].slice(-5);
        existing.lastMerge  = { added, skipped, file:fileName };
        existing.summary    = result.summary || existing.summary;
        existing.anomalies  = result.anomalies || existing.anomalies;
        // Rebuild monthly from txnIndex
        const byM = {};
        for (const tx of Object.values(existing.txnIndex)) {
          if (!byM[tx.ym]) byM[tx.ym] = { revenue:0, txns:0, cards:new Set() };
          byM[tx.ym].revenue += tx.amount;
          byM[tx.ym].txns++;
          if (tx.card) byM[tx.ym].cards.add(tx.card);
        }
        existing.monthly = Object.entries(byM).sort(([a],[b])=>a.localeCompare(b)).map(([ym,d]) => ({
          month:ym, revenue:Math.round(d.revenue), txns:d.txns, uniqueCards:d.cards.size, avgTicket:Math.round(d.revenue/d.txns*100)/100,
        }));
      }
      isSampleRef.current = false;
      scheduleSync(next);
      return next;
    });
  }, [scheduleSync]);

  const deleteSource = useCallback((branch, type, bank) => {
    setRegistry(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (type==="pnl") next[branch].pnl = null;
      else delete next[branch]?.pos[bank];
      scheduleSync(next);
      return next;
    });
  }, [scheduleSync]);

  const clearAll = useCallback(() => {
    setRegistry({});
    scheduleSync({});
  }, [scheduleSync]);

  const resetToSample = useCallback(() => {
    const sample = buildSampleRegistry();
    setRegistry(sample);
    isSampleRef.current = true;
    scheduleSync(sample);
  }, [scheduleSync]);

  return (
    <DataCtx.Provider value={{ registry, dashboardData, customerAnalytics, addSource, deleteSource, clearAll, resetToSample, syncing, loaded, isSample:isSampleRef.current }}>
      {children}
    </DataCtx.Provider>
  );
}
