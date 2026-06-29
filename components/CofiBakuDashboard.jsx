// @ts-nocheck
"use client";
import { signOut } from "next-auth/react";

import { useState, useRef, useEffect, useMemo } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Coffee, BarChart3, ListChecks, Users, MessageCircle, TrendingUp, Lightbulb, Send, Mic, MicOff, Volume2, VolumeX, CreditCard, Layers, Database } from "lucide-react";
import { C } from "@/lib/theme";
import { T, LANGS, DEFAULT_LANG, pick, tfmt, monthAbbr } from "@/lib/i18n";
import { useSpeechRecognition, useSpeechSynthesis } from "@/hooks/useVoice";
import CardAnalyticsTab from "./CardAnalyticsTab";
import DeepAnalyticsTab from "./DeepAnalyticsTab";
import RevenuePlaybookTab from "./RevenuePlaybookTab";
import BusinessSimulatorTab from "./BusinessSimulatorTab";
import DataImportTab from "./DataImportTab";
import BranchIntelligenceCard from "./BranchIntelligenceCard";
import { useData } from "@/lib/DataContext";
import staticDataDefault from "@/lib/data";

// ── imported-data adapter ─────────────────────────────────────────────────────
// Merges imported P&L + POS data into the static `data` shape the dashboard
// expects, so Branch Pulse, Benchmarks, Monthly Trend and Customers all update
// automatically. Anything the import can't provide (waste %, editorial score,
// break-even targets) falls back to the static value for that branch.

const CTX_TO_ID = { "İçərişəhər":"icerisheher", "Nizami":"nizami", "Binəqədi":"bineqedi" };
const ID_TO_CTX = { icerisheher:"İçərişəhər", nizami:"Nizami", bineqedi:"Binəqədi" };
const TREND_KEY = { icerisheher:"icerisheher", nizami:"nizami", bineqedi:"bineqedi" };
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function lastMonthLabel(monthly) {
  if (!monthly?.length) return null;
  return monthly[monthly.length - 1].month; // already chronologically sorted upstream
}

function mergeImportedData(staticData, dash) {
  // No imported data → use static unchanged.
  if (!dash?.hasData) return staticData;

  const pnl = dash.pnl || {};
  const pos = dash.pos || {};

  // ── rebuild BRANCHES from latest P&L month (ratios) + POS (clients) ──
  const BRANCHES = staticData.BRANCHES.map(b => {
    const ctx = ID_TO_CTX[b.id];
    const bp  = pnl[ctx];
    const bpos = pos[ctx];

    // need a P&L with at least one month to override; else keep static
    const months = bp?.monthly;
    if (!months?.length) {
      // still refresh clients from POS if available
      if (bpos?.uniqueCards) {
        return { ...b, may: { ...b.may, clients: bpos.uniqueCards, clientsSrc: "card" } };
      }
      return b;
    }

    const m = months[months.length - 1];           // latest month row
    const rev = m.revenue || 0;
    const pct = (x) => rev > 0 ? Math.round((x || 0) / rev * 1000) / 10 : 0;

    const labor = pct(m.staffCosts);
    const rent  = pct(m.rent);
    const cogs  = pct(m.cogs);
    const gp    = m.grossProfit != null ? pct(m.grossProfit) : Math.round((100 - cogs) * 10) / 10;
    const net   = pct(m.netProfit);

    // clients: prefer POS unique cards, else keep static estimate
    const clients = bpos?.uniqueCards || b.may.clients;
    const clientsSrc = bpos?.uniqueCards ? "card" : b.may.clientsSrc;

    return {
      ...b,
      may: { revenue: Math.round(rev), net: Math.round(m.netProfit || 0), clients, clientsSrc },
      ratiosMay: {
        ...b.ratiosMay,                 // keep waste (not in P&L)
        labor, rent, cogs, gp, net,
        prime: Math.round((labor + cogs) * 10) / 10,
      },
      avgTicket: bpos?.avgTicket || b.avgTicket,
    };
  });

  // ── BENCHMARKS: refresh the per-branch ratio columns from new BRANCHES ──
  const byId = Object.fromEntries(BRANCHES.map(b => [b.id, b]));
  const metricMap = {
    "Labor %":      b => b.ratiosMay.labor,
    "İşçi %":       b => b.ratiosMay.labor,
    "Персонал %":   b => b.ratiosMay.labor,
    "Rent %":       b => b.ratiosMay.rent,
    "İcarə %":      b => b.ratiosMay.rent,
    "Аренда %":     b => b.ratiosMay.rent,
    "Food cost %":  b => b.ratiosMay.cogs,
    "Məhsul dəyəri %": b => b.ratiosMay.cogs,
    "Себестоимость %": b => b.ratiosMay.cogs,
    "Gross margin": b => b.ratiosMay.gp,
    "Ümumi marja":  b => b.ratiosMay.gp,
    "Валовая маржа":b => b.ratiosMay.gp,
    "Net margin":   b => b.ratiosMay.net,
    "Xalis marja":  b => b.ratiosMay.net,
    "Чистая маржа": b => b.ratiosMay.net,
  };
  const BENCHMARKS = staticData.BENCHMARKS.map(row => {
    const fn = metricMap[row.metric.en];
    if (!fn) return row; // waste % etc. — keep static
    return {
      ...row,
      icerisheher: byId.icerisheher ? fn(byId.icerisheher) : row.icerisheher,
      nizami:      byId.nizami      ? fn(byId.nizami)      : row.nizami,
      bineqedi:    byId.bineqedi    ? fn(byId.bineqedi)    : row.bineqedi,
    };
  });

  // ── MONTHLY_TREND: rebuild from imported monthlyTrend (P&L revenue) ──
  let MONTHLY_TREND = staticData.MONTHLY_TREND;
  if (dash.monthlyTrend?.length) {
    MONTHLY_TREND = dash.monthlyTrend.map(row => {
      const e = { m: (row.m || row.month || "").split(" ")[0] }; // "Nov 2025" → "Nov"
      for (const b of BRANCHES) {
        const ctx = ID_TO_CTX[b.id];
        e[TREND_KEY[b.id]] = Math.round(row[ctx] || 0);
      }
      return e;
    });
  }

  // ── MONTHLY_CLIENTS: rebuild from POS unique cards per month ──
  let MONTHLY_CLIENTS = staticData.MONTHLY_CLIENTS;
  const bineqediPos = pos["Binəqədi"]?.monthly;
  const portPos     = pos["İçərişəhər"]?.monthly;
  const centralPos  = pos["Nizami"]?.monthly;
  if (bineqediPos?.length || portPos?.length || centralPos?.length) {
    const keys = [...new Set([
      ...(bineqediPos||[]).map(m=>m.month),
      ...(portPos||[]).map(m=>m.month),
      ...(centralPos||[]).map(m=>m.month),
    ])];
    const findCards = (arr, label) => arr?.find(m=>m.month===label)?.uniqueCards || 0;
    MONTHLY_CLIENTS = keys.map(label => ({
      m: label.split(" ")[0],
      icerisheher: findCards(portPos,     label),
      nizami:      findCards(centralPos,  label),
      bineqedi:    findCards(bineqediPos, label),
    }));
  }

  return { ...staticData, BRANCHES, BENCHMARKS, MONTHLY_TREND, MONTHLY_CLIENTS };
}

// Build the Growth tab's GROWTH_DATA shape from imported POS data.
// Returns null if no POS data (caller keeps the static fallback).
function buildGrowthData(dash) {
  if (!dash?.hasData || !dash.pos) return null;
  const pos = dash.pos;

  // POS branches that have data
  const branchPos = {
    ADY: pos["Binəqədi"], "Binəqədi": pos["Binəqədi"], "Nizami": pos["Nizami"], Port: pos["İçərişəhər"],
  };
  const active = Object.entries(branchPos).filter(([,v]) => v?.monthly?.length);
  if (!active.length) return null;

  // union of all month keys, chronological
  const MN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const toKey = (label) => {
    const i = MN.findIndex(n => label.startsWith(n));
    const y = (label.match(/\d{4}/)||[])[0] || "0000";
    return `${y}-${String(i+1).padStart(2,"0")}`;
  };
  let allKeys = [...new Set(active.flatMap(([,v]) => v.monthly.map(m => toKey(m.month))))].sort();

  // Exclude partial months so MoM isn't distorted:
  //  • the current calendar month (always partial), and
  //  • any month whose transaction volume is < 50% of the median (partial start / sparse export).
  const txnForKey = (k) => active.reduce((s,[,v]) => {
    const mm = (v.monthly||[]).find(x => toKey(x.month) === k);
    return s + (mm?.txns || 0);
  }, 0);
  const now = new Date();
  const curKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const vols = allKeys.map(txnForKey).filter(x => x > 0).sort((a,b)=>a-b);
  const median = vols.length ? vols[Math.floor(vols.length/2)] : 0;
  const fullKeys = allKeys.filter(k => k !== curKey && (median === 0 || txnForKey(k) >= median * 0.5));
  if (fullKeys.length >= 2) allKeys = fullKeys;            // keep only full months
  else allKeys = allKeys.filter(k => k !== curKey);        // fallback: at least drop current month

  const keyToShort = (k) => { const [,m]=k.split("-"); return MN[+m-1]; };
  const months = allKeys.map(keyToShort);

  // per-branch series aligned to allKeys
  const series = (monthly) => {
    const byKey = {};
    (monthly||[]).forEach(m => { byKey[toKey(m.month)] = m; });
    const rev = allKeys.map(k => Math.round(byKey[k]?.revenue || 0));
    const txn = allKeys.map(k => byKey[k]?.txns || 0);
    const avg = allKeys.map((k,i) => txn[i] > 0 ? Math.round(rev[i]/txn[i]*100)/100 : 0);
    const mom = rev.map((v,i) => i===0 ? null : (rev[i-1]>0 ? Math.round((v-rev[i-1])/rev[i-1]*1000)/10 : null));
    return { rev, txn, avg, mom };
  };

  const out = { months };
  // network = sum across active branches
  const sum = (arr) => allKeys.map((_,i) => arr.reduce((s,a)=>s+(a[i]||0),0));
  const perBranch = {};
  for (const [name, v] of active) perBranch[name] = series(v.monthly);

  const allRev = sum(Object.values(perBranch).map(s=>s.rev));
  const allTxn = sum(Object.values(perBranch).map(s=>s.txn));
  const allAvg = allKeys.map((_,i)=> allTxn[i]>0 ? Math.round(allRev[i]/allTxn[i]*100)/100 : 0);
  const allMom = allRev.map((v,i)=> i===0?null:(allRev[i-1]>0?Math.round((v-allRev[i-1])/allRev[i-1]*1000)/10:null));
  out.all = { rev:allRev, txn:allTxn, avg:allAvg, mom:allMom };

  // fill each branch that has data (ADY / City Point / Central Park / Port)
  for (const [name] of active) out[name] = perBranch[name];

  return out;
}

// ── helpers ──────────────────────────────────────────────────────────────────
const fmtAZN = (n, short = true) => {
  const abs = Math.abs(n), sign = n < 0 ? "-₼" : "₼";
  if (short && abs >= 1000) return sign + (abs / 1000).toFixed(1) + "k";
  return sign + abs.toLocaleString("en", { maximumFractionDigits: 0 });
};
const benchStatus = (val, low, high, inv = false) => {
  if (inv) { if (val <= high) return "green"; if (val <= high * 1.3) return "amber"; return "red"; }
  if (val >= low && val <= high * 1.3) return "green"; if (val > 0) return "amber"; return "red";
};
const statTone = { green: C.sage, amber: C.amber, red: C.clay };
const statBg = { green: C.sageSoft, amber: C.amberSoft, red: C.claySoft };
const statMark = { green: "✓", amber: "!", red: "✕" };
const toneColor = { ink: C.ink, amber: C.amber, clay: C.clay, sage: C.sage };
const prioStyle = {
  critical: { tone: C.clay,   bg: C.claySoft },
  high:     { tone: C.amber,  bg: C.amberSoft },
  medium:   { tone: C.rattan, bg: "#EFE2CF" },
  low:      { tone: C.sage,   bg: C.sageSoft },
  info:     { tone: C.inkSoft,bg: C.surfaceAlt },
};

function growthPattern(txn, ticket) {
  if (txn > 0 && ticket > 0)  return { tone: C.sage,  key: "ideal" };
  if (txn > 0 && ticket <= 0) return { tone: C.sage,  key: "healthy" };
  if (txn <= 0 && ticket > 0) return { tone: C.amber, key: "watch" };
  return { tone: C.clay, key: "caution" };
}
const pctStr = (v) => v == null || Number.isNaN(v) ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
const trendTone = (v) => (v > 0 ? C.sage : v < 0 ? C.clay : C.inkSoft);

// ── shared UI ────────────────────────────────────────────────────────────────
function Surface({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: C.surface, border: `1px solid ${C.line}`, borderRadius: 18,
      padding: "1rem 1.25rem", cursor: onClick ? "pointer" : undefined, ...style,
    }}>{children}</div>
  );
}
function Heading({ children, style = {} }) {
  return <div style={{ fontFamily: "var(--brand-serif)", fontSize: 15, fontWeight: 500, color: C.ink, ...style }}>{children}</div>;
}
function Eyebrow({ children }) {
  return <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: C.inkSoft, fontWeight: 500 }}>{children}</div>;
}

function ScoreCircle({ score, color, size = 58 }) {
  const r = (size - 7) / 2, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r, dash = (score / 100) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.track} strokeWidth={5} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size / 3.3, fontWeight: 600, color }}>{score}</div>
    </div>
  );
}

function RatioBar({ label, value, low, high, inv = false }) {
  const s = benchStatus(value, low, high, inv);
  const scale = inv ? high * 2.5 : high * 1.35;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7 }}>
      <div style={{ fontSize: 11.5, color: C.inkSoft, width: 78 }}>{label}</div>
      <div style={{ flex: 1, height: 6, background: C.track, borderRadius: 4, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: `${low / scale * 100}%`, width: `${(high - low) / scale * 100}%`, top: 0, height: 6, background: "rgba(110,122,69,0.16)" }} />
        <div style={{ width: `${Math.min(100, value / scale * 100)}%`, height: 6, background: statTone[s], borderRadius: 4 }} />
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: statTone[s], width: 42, textAlign: "right" }}>{value.toFixed(1)}%</div>
      <div style={{ fontSize: 11, color: statTone[s], width: 12 }}>{statMark[s]}</div>
    </div>
  );
}

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: "8px 12px", fontSize: 12, color: C.ink }}>
      <div style={{ fontWeight: 600, marginBottom: 3 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color || p.stroke || p.fill }}>{p.name}: ₼{Number(p.value).toLocaleString()}</div>)}
    </div>
  );
}

// ── AI coach ─────────────────────────────────────────────────────────────────
function AICoach({ lang, t, dataSummary }) {
  const [msgs, setMsgs] = useState([{ role: "assistant", text: t.coach_greeting }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const qs = [t.q1, t.q2, t.q3, t.q4, t.q5];

  const { isSpeaking, voiceEnabled, speak, toggleVoice } = useSpeechSynthesis({ language: lang });
  const { isListening, isSupported, startListening, stopListening } = useSpeechRecognition({
    language: lang,
    onResult: (transcript) => setInput(transcript),
  });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  useEffect(() => { setMsgs((m) => (m.length <= 1 ? [{ role: "assistant", text: t.coach_greeting }] : m)); }, [lang]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput(""); setMsgs((m) => [...m, { role: "user", text: msg }]); setLoading(true);
    const history = msgs.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text }));
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...history, { role: "user", content: msg }], lang, dataSummary }),
      });
      const j = await res.json();
      const reply = j.text || j.error || t.coach_err;
      setMsgs((m) => [...m, { role: "assistant", text: reply }]);
      speak(reply);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: t.coach_conn_err }]);
      speak(t.coach_conn_err);
    }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ minHeight: 160, maxHeight: 330, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: 12 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "82%", padding: "10px 14px", borderRadius: 14, fontSize: 13, lineHeight: 1.6,
              background: m.role === "user" ? C.ink : C.surfaceAlt, color: m.role === "user" ? C.surface : C.ink,
            }}>{m.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{ padding: "10px 14px", background: C.surfaceAlt, borderRadius: 14, width: 58, display: "flex", gap: 4 }}>
            {[0, 1, 2].map((i) => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.inkSoft, animation: `cfdot .8s ${i * 0.15}s infinite alternate` }} />)}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {msgs.length < 3 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {qs.map((q) => (
            <button key={q} onClick={() => send(q)} style={{
              fontSize: 11, padding: "5px 11px", cursor: "pointer",
              background: C.surface, border: `1px solid ${C.line}`, borderRadius: 9999, color: C.inkSoft,
            }}>{q}</button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={t.coach_placeholder}
          style={{ flex: 1, fontSize: 13, padding: "9px 13px", borderRadius: 12, border: `1px solid ${C.line}`, background: C.surface, color: C.ink, outline: "none" }} />

        {isSupported && (
          <button
            onClick={isListening ? stopListening : startListening}
            title={isListening ? "Stop" : "Speak"}
            style={{
              padding: "8px 12px", border: "none", borderRadius: 12, cursor: "pointer",
              display: "flex", alignItems: "center", transition: "all .15s",
              background: isListening ? C.clay : C.surfaceAlt,
              color: isListening ? "#fff" : C.inkSoft,
              animation: isListening ? "cfpulse 1s ease-in-out infinite" : "none",
            }}
          >
            {isListening ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
        )}

        <button
          onClick={toggleVoice}
          title={voiceEnabled ? "Mute voice" : "Unmute voice"}
          style={{
            padding: "8px 12px", border: "none", borderRadius: 12, cursor: "pointer",
            display: "flex", alignItems: "center", transition: "all .15s",
            background: C.surfaceAlt,
            color: voiceEnabled ? (isSpeaking ? C.gold : C.inkSoft) : C.track,
            animation: isSpeaking && voiceEnabled ? "cfpulse 1s ease-in-out infinite" : "none",
          }}
        >
          {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
        </button>

        <button onClick={() => send()} disabled={loading || !input.trim()} style={{
          padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: loading || !input.trim() ? "not-allowed" : "pointer",
          border: "none", borderRadius: 12, background: loading || !input.trim() ? C.surfaceAlt : C.gold, color: loading || !input.trim() ? C.inkSoft : "#fff",
          display: "flex", alignItems: "center",
        }}><Send size={14} /></button>
      </div>

      <style>{`
        @keyframes cfdot { from { opabineqedi: .3 } to { opabineqedi: 1 } }
        @keyframes cfpulse { 0%, 100% { opabineqedi: 1 } 50% { opabineqedi: .55 } }
      `}</style>
    </div>
  );
}

// ── main ─────────────────────────────────────────────────────────────────────
// Outer export provides the data context; inner component consumes it.
export default function CofiBakuDashboard({ user = null, staticData = staticDataDefault }) {
  // merge live imported data over the static defaults
  const { dashboardData, customerAnalytics } = useData();
  const data = mergeImportedData(staticData, dashboardData);

  const { BRANCHES, BENCHMARKS, MONTHLY_TREND, RETENTION, LOYALTY_SCENARIOS, CUSTOMER_KPIS, CURRENT_MONTH, GROWTH, MONTHLY_CLIENTS } = data;
  const [lang, setLang] = useState(DEFAULT_LANG);
  const t = T[lang];

  // Compact live-data summary handed to the AI coach so it answers from REAL imported numbers
  const coachDataSummary = useMemo(() => {
    const lines = [];
    const live = dashboardData?.hasData;
    lines.push(`Latest month: ${typeof CURRENT_MONTH==="object" ? CURRENT_MONTH.en : CURRENT_MONTH}. Data source: ${live ? "imported POS + iiko P&L" : "baseline estimates"}.`);
    lines.push("Per-branch (latest month P&L): " + BRANCHES.map(b =>
      `${b.name}: revenue ₼${Math.round(b.may.revenue).toLocaleString()}, net ₼${Math.round(b.may.net).toLocaleString()} (${b.ratiosMay.net}%), labor ${b.ratiosMay.labor}%, rent ${b.ratiosMay.rent}%, COGS ${b.ratiosMay.cogs}%, avg ticket ₼${b.avgTicket}, clients ${b.may.clients}`
    ).join(" | "));
    if (live && dashboardData.pos) {
      const posLines = Object.entries(dashboardData.pos).map(([name,p]) =>
        `${name}: ₼${Math.round(p.totalRevenue).toLocaleString()} card revenue, ${p.totalTxns?.toLocaleString()} txns, ${p.uniqueCards?.toLocaleString()} unique cards, avg ₼${p.avgTicket}`);
      lines.push("POS card data (all months): " + posLines.join(" | "));
    }
    if (customerAnalytics?.hasData) {
      const n = customerAnalytics.network || {};
      lines.push(`Customer base (network): ${n.totalCusts?.toLocaleString()||"?"} unique cards, ${n.oneTimeCount?.toLocaleString()||"?"} one-time, ${n.atRiskCount?.toLocaleString()||"?"} at-risk (2+ visits, gone 60+ days), ${n.vipCount?.toLocaleString()||"?"} VIP cards carrying ₼${Math.round(n.vipRev||0).toLocaleString()}.`);
      const perB = (customerAnalytics.branches||[]).map(bn => {
        const b = customerAnalytics.byBranch[bn]?._base; if(!b) return null;
        return `${bn}: ${b.totalCusts?.toLocaleString()} cards, ${b.oneTimeCount?.toLocaleString()} one-time, ${b.atRiskCount?.toLocaleString()} at-risk`;
      }).filter(Boolean);
      if (perB.length) lines.push("Customer base per branch: " + perB.join(" | "));
    }
    return lines.join("\n");
  }, [dashboardData, customerAnalytics, BRANCHES, CURRENT_MONTH]);

  useEffect(() => { try { const s = window.localStorage.getItem("cofibaku_lang"); if (s && T[s]) setLang(s); } catch {} }, []);
  useEffect(() => { try { window.localStorage.setItem("cofibaku_lang", lang); } catch {} }, [lang]);

  const [growthBranch, setGrowthBranch] = useState("all");
  const [growthMonth, setGrowthMonth] = useState("all");
  const GROWTH_DATA_STATIC = {
    months: ["Nov","Dec","Jan","Feb","Mar","Apr","May"],
    all:          { rev:[86233,75481,69163,63917,68092,89636,99033], txn:[7195,6614,6125,5609,5793,7951,8448], avg:[11.99,11.41,11.29,11.40,11.75,11.27,11.72], mom:[null,-12.5,-8.4,-7.6,6.5,31.6,10.5] },
    ADY:          { rev:[15769,18698,15036,14246,13850,17058,17119], txn:[1537,1804,1488,1393,1420,1759,1718], avg:[10.26,10.36,10.10,10.23,9.75,9.70,9.96], mom:[null,18.6,-19.6,-5.3,-2.8,23.2,0.4] },
    "Binəqədi": { rev:[22399,15220,14495,14441,14883,22442,29939], txn:[1787,1395,1277,1314,1250,2042,2440], avg:[12.53,10.91,11.35,10.99,11.91,10.99,12.27], mom:[null,-32.1,-4.8,-0.4,3.1,50.8,33.4] },
    Port:         { rev:[48876,42374,40272,35882,40108,51062,52954], txn:[3938,3492,3418,2960,3192,4223,4371], avg:[12.41,12.13,11.78,12.12,12.57,12.09,12.11], mom:[null,-13.3,-5.0,-10.9,11.8,27.3,3.7] },
  };
  const GROWTH_DATA = buildGrowthData(dashboardData) || GROWTH_DATA_STATIC;
  const gLast = GROWTH_DATA.months.length - 1;        // dynamic last-month index
  const gd = GROWTH_DATA[growthBranch] || GROWTH_DATA.all;
  let gmi = growthMonth === "all" ? gLast : GROWTH_DATA.months.indexOf(growthMonth);
  if (gmi < 0) gmi = gLast;                            // selected month not in (filtered) data → latest
  const hasPrev = gmi > 0;                             // first month has no prior to compare
  const gMoM    = hasPrev ? gd.mom[gmi] : null;
  const gTxnMoM = hasPrev && gd.txn[gmi-1] > 0 ? Math.round((gd.txn[gmi]-gd.txn[gmi-1])/gd.txn[gmi-1]*1000)/10 : null;
  const gAvgMoM = hasPrev && gd.avg[gmi-1] > 0 ? Math.round((gd.avg[gmi]-gd.avg[gmi-1])/gd.avg[gmi-1]*1000)/10 : null;
  const growthPat = growthPattern(gTxnMoM, gAvgMoM);
  const [selected, setSelected] = useState("icerisheher");
  const [tab, setTab] = useState("pulse");
  const branch = BRANCHES.find((b) => b.id === selected);
  const chainRev = BRANCHES.reduce((s, b) => s + b.may.revenue, 0);
  const chainNet = BRANCHES.reduce((s, b) => s + b.may.net, 0);
  const monthShort = pick(CURRENT_MONTH, lang).split(" ")[0];
  const centralB = BRANCHES.find((b) => b.id === "nizami");
  const cityB = BRANCHES.find((b) => b.id === "bineqedi");

  const tabs = [
    { id: "pulse",     icon: Coffee,          label: t.tab_pulse },
    { id: "growth",    icon: TrendingUp,       label: t.tab_growth },
    { id: "cards",     icon: CreditCard,       label: t.tab_card },
    { id: "deep",      icon: Layers,           label: t.tab_deep },
    { id: "playbook",  icon: TrendingUp,       label: t.tab_playbook },
    { id: "simulator", icon: BarChart3,        label: t.tab_simulator },
    { id: "import",    icon: Database,         label: t.tabImport },
    { id: "benchmarks",icon: BarChart3,        label: t.tab_benchmarks },
    { id: "customers", icon: Users,            label: t.tab_customers },
    { id: "coach",     icon: MessageCircle,    label: t.tab_coach },
  ];

  return (
    <div className="cf-dash" style={{ background: C.canvas, color: C.ink, borderRadius: 20 }}>
      <style>{`
        .cf-dash { padding: 1.5rem; }
        .cf-tabs { display:flex; flex-wrap:wrap; gap:4px; padding:5px; background:${C.surfaceAlt}; border-radius:15px; margin-bottom:1.25rem; }
        .cf-tab { flex:1 1 auto; min-width:0; white-space:nowrap; display:flex; align-items:center; justify-content:center; gap:6px; padding:9px 8px; border:none; cursor:pointer;
          font-size:12.5px; border-radius:12px; background:transparent; color:${C.inkSoft}; transition:all .15s; }
        .cf-tab.active { background:${C.surface}; color:${C.ink}; font-weight:600; box-shadow:0 1px 3px rgba(45,40,32,0.06); }
        .cf-tab:hover:not(.active){ color:${C.ink}; }
        .cf-tab svg { flex-shrink:0; }
        .cf-ratios { display:grid; grid-template-columns:1fr 1fr; gap:0 26px; }
        @media (max-width: 640px) {
          .cf-dash { padding: 0.75rem 0.65rem; }
          .cf-tabs { flex-wrap:nowrap; overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none; gap:3px; }
          .cf-tabs::-webkit-scrollbar { display:none; }
          .cf-tab { flex:0 0 auto; font-size:11px; padding:7px 8px; gap:3px; }
          .cf-tab span { display:none; }
          .cf-tab.active span { display:inline; }
          .cf-ratios { grid-template-columns:1fr; }
        }
      `}</style>

      {/* language selector */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
        <div style={{ display: "inline-flex", gap: 3, background: C.surfaceAlt, borderRadius: 9999, padding: 3 }}>
          {LANGS.map((l) => (
            <button key={l.code} onClick={() => setLang(l.code)} title={l.name} style={{
              fontSize: 11, fontWeight: 600, padding: "4px 11px", borderRadius: 9999, border: "none", cursor: "pointer",
              background: lang === l.code ? C.surface : "transparent",
              color: lang === l.code ? C.ink : C.inkSoft,
              boxShadow: lang === l.code ? "0 1px 3px rgba(45,40,32,0.08)" : "none",
            }}>{l.label}</button>
          ))}
        </div>
      </div>

      {/* HERO */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 14 }}>
        <div>
          <Eyebrow>{t.ops} · {pick(CURRENT_MONTH, lang)}</Eyebrow>
          <div style={{
            fontSize: 38, fontWeight: 600, letterSpacing: ".12em", color: "#1B3A6B", lineHeight: 1.05, marginTop: 6,
            textShadow: `0 2px 8px rgba(27,58,107,0.25)`,
          }}>☕ CoffeeLea</div>
          <div style={{
            height: 5, width: 230, marginTop: 10, borderRadius: 3,
            background: `linear-gradient(90deg, #1B3A6B, #CDA04B 60%, #1B3A6B)`, boxShadow: `0 0 14px rgba(27,58,107,0.3)`,
          }} />
        </div>
        <div style={{ textAlign: "right" }}>
          <Eyebrow>{t.chain_this_month}</Eyebrow>
          <div style={{ fontFamily: "var(--brand-serif)", fontSize: 30, fontWeight: 600, color: C.ink, lineHeight: 1.1 }}>{fmtAZN(chainRev)}</div>
          <div style={{ fontSize: 13, color: chainNet >= 0 ? C.sage : C.clay, fontWeight: 500 }}>{chainNet >= 0 ? "+" : ""}{fmtAZN(chainNet)} {t.net_profit}</div>
        </div>
      </div>

      {/* milestone */}
      <div style={{ background: C.sageSoft, border: "1px solid #C9D2A8", borderRadius: 14, padding: "10px 15px", fontSize: 12.5, color: "#4F5A30", display: "flex", gap: 9, alignItems: "center", marginBottom: "1.25rem", lineHeight: 1.5 }}>
        <TrendingUp size={16} style={{ flexShrink: 0, color: C.sage }} />
        <span><strong>{t.milestone_title}</strong> {tfmt(t.milestone_body, { net: "+" + fmtAZN(centralB.may.net, false), gap: fmtAZN(Math.abs(cityB?.may?.net ?? 0), false) })}</span>
      </div>

      {/* tabs */}
      <div className="cf-tabs">
        {tabs.map((tb) => {
          const Icon = tb.icon;
          return (
            <button key={tb.id} onClick={() => setTab(tb.id)} className={`cf-tab${tab === tb.id ? " active" : ""}`}>
              <Icon size={14} /><span>{tb.label}</span>
            </button>
          );
        })}
      </div>

      {/* BRANCH PULSE */}
      {tab === "pulse" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: "1.25rem" }}>
            {BRANCHES.map((b) => {
              const badgeStyle = {
                excellent: { bg: C.sageSoft, tone: "#4F5A30" },
                improving: { bg: C.amberSoft, tone: "#8A5E16" },
                critical: { bg: C.claySoft, tone: "#8C3D27" },
              }[b.status];
              return (
                <Surface key={b.id} onClick={() => setSelected(b.id)} style={{ border: selected === b.id ? `2px solid ${b.color}` : `1px solid ${C.line}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{b.short}</div>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 9999, background: badgeStyle.bg, color: badgeStyle.tone, fontWeight: 600 }}>{t["badge_" + b.status]}</span>
                    </div>
                    <ScoreCircle score={b.score} color={b.color} size={58} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 10, color: C.inkSoft }}>{tfmt(t.revenue_label, { month: monthShort })}</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: b.color }}>{fmtAZN(b.may.revenue)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: C.inkSoft }}>{t.net_profit_label}</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: b.may.net >= 0 ? C.sage : C.clay }}>{b.may.net >= 0 ? "+" : ""}{fmtAZN(b.may.net)}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0 8px", borderBottom: `1px solid ${C.line}`, marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: C.inkSoft }}>{t.lbl_clients}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>~{b.may.clients?.toLocaleString()}</span>
                      {b.may.clientsSrc === "est" && <span style={{ fontSize: 9, color: C.inkSoft, background: C.surfaceAlt, border: `1px solid ${C.line}`, borderRadius: 9999, padding: "1px 5px" }}>{t.lbl_est}</span>}
                      {b.may.clientsSrc === "card" && <span style={{ fontSize: 9, color: C.inkSoft, background: C.surfaceAlt, border: `1px solid ${C.line}`, borderRadius: 9999, padding: "1px 5px" }}>{t.lbl_card}</span>}
                    </div>
                  </div>
                  <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 9 }}>
                    <RatioBar label={t.lbl_labor} value={b.ratiosMay.labor} low={25} high={35} inv />
                    <RatioBar label={t.lbl_rent} value={b.ratiosMay.rent} low={6} high={12} inv />
                    <RatioBar label={t.lbl_netmargin} value={b.ratiosMay.net > 0 ? b.ratiosMay.net : 0} low={5} high={15} />
                  </div>
                </Surface>
              );
            })}
          </div>

          <Surface style={{ marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Heading>{tfmt(t.detailed_ratios, { branch: branch.name, month: pick(CURRENT_MONTH, lang) })}</Heading>
              <div style={{ fontSize: 11, color: C.inkSoft }}>{t.vs_benchmarks}</div>
            </div>
            <div className="cf-ratios">
              {[
                { l: t.lbl_labor_pct, v: branch.ratiosMay.labor, low: 25, high: 35, inv: true },
                { l: t.lbl_rent_pct, v: branch.ratiosMay.rent, low: 6, high: 12, inv: true },
                { l: t.lbl_food_pct, v: branch.ratiosMay.cogs, low: 25, high: 35, inv: true },
                { l: t.lbl_gross, v: branch.ratiosMay.gp, low: 65, high: 75, inv: false },
                { l: t.lbl_netmargin, v: Math.max(0, branch.ratiosMay.net), low: 5, high: 15, inv: false },
                { l: t.lbl_waste_pct, v: branch.ratiosMay.waste, low: 0, high: 2, inv: true },
              ].map((r) => <RatioBar key={r.l} label={r.l} value={r.v} low={r.low} high={r.high} inv={r.inv} />)}
            </div>
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, fontSize: 11, color: C.inkSoft }}>
              {[
                { mark: "✓", color: C.sage,  bg: C.sageSoft,  label: { en: "Within benchmark", ru: "В пределах нормы", az: "Normada" } },
                { mark: "!", color: C.amber, bg: C.amberSoft, label: { en: "Slightly outside", ru: "Чуть выше нормы",  az: "Normadan bir az yüksək" } },
                { mark: "✕", color: C.clay,  bg: C.claySoft,  label: { en: "Needs attention",  ru: "Требует внимания", az: "Diqqət tələb edir" } },
              ].map(({ mark, color, bg, label }) => (
                <span key={mark} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 9999, background: bg, color, fontWeight: 700, fontSize: 12 }}>{mark}</span>
                  <span>{pick(label, lang)}</span>
                </span>
              ))}
              <span style={{ marginLeft: "auto" }}>
                <span style={{ background: "rgba(110,122,69,0.16)", padding: "2px 7px", borderRadius: 4 }}>{t.shaded_note}</span>
              </span>
            </div>
          </Surface>

          <Surface>
            <Heading style={{ marginBottom: 10 }}>{t.revenue_trend}</Heading>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={MONTHLY_TREND} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  {[["za", C.gold], ["cp", C.rattan], ["ci", C.clay], ["ad", "#7C8AA0"]].map(([id, col]) => (
                    <linearGradient key={id} id={`bg${id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={col} stopOpacity={0.22} /><stop offset="95%" stopColor={col} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <XAxis dataKey="m" tickFormatter={(m) => monthAbbr(m, lang)} tick={{ fontSize: 11, fill: C.inkSoft }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C.inkSoft }} axisLine={false} tickLine={false} tickFormatter={(v) => "₼" + v / 1000 + "k"} />
                <Tooltip content={<ChartTip />} labelFormatter={(m) => monthAbbr(m, lang)} />
                <Area type="monotone" dataKey="icerisheher" name="İçərişəhər" stroke={C.gold} fill="url(#bgza)" strokeWidth={2.5} dot={false} />
                <Area type="monotone" dataKey="nizami" name="Nizami" stroke={C.rattan} fill="url(#bgcp)" strokeWidth={2.5} dot={false} />
                <Area type="monotone" dataKey="bineqedi" name="Binəqədi" stroke={C.clay} fill="url(#bgci)" strokeWidth={2.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 16, fontSize: 11.5, color: C.inkSoft, marginTop: 6 }}>
              {[["İçərişəhər", C.gold], ["Nizami", C.rattan], ["Binəqədi", C.clay]].map(([n, c]) => (
                <span key={n}><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: c, marginRight: 5 }} />{n}</span>
              ))}
            </div>
          </Surface>

          {/* ── CONTEXT INTELLIGENCE ── */}
          {(() => {
            // Build static monthly series for fallback (from MONTHLY_TREND)
            const trendKey = { icerisheher:"icerisheher", nizami:"nizami", citypoint:"bineqedi", bineqedi:"bineqedi" }[selected];
            const MN_FULL = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
            const staticMonthly = MONTHLY_TREND.map((m, i) => {
              const mnIdx = MN_FULL.findIndex(n => m.m.startsWith(n.slice(0,3)));
              const yr = (m.m === "Nov" || m.m === "Dec") ? "2025" : "2026";
              const key = `${yr}-${String(mnIdx+1).padStart(2,"0")}`;
              return { month: `${MN_FULL[mnIdx] || m.m} ${yr}`, revenue: m[trendKey] || 0 };
            }).filter(m => m.revenue > 0);
            return (
              <BranchIntelligenceCard
                branchId={selected}
                lang={lang}
                staticMonthly={staticMonthly}
              />
            );
          })()}
        </div>
      )}

      {/* GROWTH / COMPARABLE SALES */}
      {tab === "growth" && (
        <div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {["all", ...Object.keys(GROWTH_DATA).filter(k => k !== "months" && k !== "all")].map(b => (
                <button key={b} onClick={() => setGrowthBranch(b)} style={{
                  fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 999, cursor: "pointer",
                  border: `1px solid ${growthBranch === b ? C.ink : C.line}`,
                  background: growthBranch === b ? C.ink : C.surface,
                  color: growthBranch === b ? "#fff" : C.inkSoft,
                }}>
                  {b === "all" ? (lang === "az" ? "Şəbəkə" : lang === "ru" ? "Сеть" : "Network") : (b === "Port" ? "İçərişəhər" : b)}
                </button>
              ))}
            </div>
            <div style={{ width: 1, height: 20, background: C.line }} />
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {["all", ...GROWTH_DATA.months].map(m => (
                <button key={m} onClick={() => setGrowthMonth(m)} style={{
                  fontSize: 11, fontWeight: 600, padding: "4px 9px", borderRadius: 999, cursor: "pointer",
                  border: `1px solid ${growthMonth === m ? C.gold : C.line}`,
                  background: growthMonth === m ? C.gold : C.surface,
                  color: growthMonth === m ? "#fff" : C.inkSoft,
                }}>
                  {m === "all" ? (lang === "az" ? "Hamısı" : lang === "ru" ? "Все" : "All") : monthAbbr(m, lang)}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 11, marginBottom: "1.25rem" }}>
            {[
              { l: t.g_compsales, v: gMoM, sub: t.g_compsales_sub },
              { l: t.g_transactions, v: gTxnMoM, sub: t.g_transactions_sub },
              { l: t.g_avgticket, v: gAvgMoM, sub: t.g_avgticket_sub },
            ].map((k) => (
              <Surface key={k.l}>
                <div style={{ fontSize: 11, color: C.inkSoft, marginBottom: 4 }}>{k.l}</div>
                <div style={{ fontSize: 26, fontWeight: 600, color: trendTone(k.v) }}>{k.v != null ? pctStr(k.v) : "—"}</div>
                <div style={{ fontSize: 10, color: C.inkSoft, marginTop: 2 }}>{k.sub}</div>
              </Surface>
            ))}
          </div>

          <div style={{ background: hasPrev ? `${growthPat.tone}14` : C.surfaceAlt, border: `1px solid ${hasPrev ? growthPat.tone+"55" : C.line}`, borderRadius: 18, padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
            {hasPrev ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <TrendingUp size={16} style={{ color: growthPat.tone }} />
                  <span style={{ fontWeight: 600, color: growthPat.tone, fontSize: 13.5 }}>{t["gp_" + growthPat.key + "_l"]}</span>
                </div>
                <div style={{ fontSize: 13, color: C.ink, marginTop: 6, lineHeight: 1.6 }}>
                  {tfmt(t.pattern_lead, { tx: pctStr(gTxnMoM), tk: pctStr(gAvgMoM) })} {t["gp_" + growthPat.key + "_t"]}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.6 }}>
                {lang === "az"
                  ? "Bu, məlumatdakı ilk tam aydır — müqayisə üçün əvvəlki ay yoxdur. Ay-ay dəyişim növbəti aydan göstərilir."
                  : lang === "ru"
                  ? "Это первый полный месяц в данных — предыдущего месяца для сравнения нет. Динамика появится со следующего месяца."
                  : "This is the first full month in the data — there's no prior month to compare against. Month-over-month change appears from the next month on."}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
            <Surface>
              <Heading style={{ marginBottom: 10 }}>{t.comp_by_period}</Heading>
              {GROWTH_DATA.months.map((m, i) => {
                const v = gd.mom[i];
                return v != null ? (
                  <div key={m} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: i < gLast ? `1px solid ${C.line}` : "none", background: growthMonth === m ? `${C.gold}12` : "transparent", margin: "0 -4px", padding: "7px 4px" }}>
                    <span style={{ fontSize: 12.5, color: C.inkSoft }}>{monthAbbr(m, lang)}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: trendTone(v) }}>{pctStr(v)}</span>
                  </div>
                ) : null;
              })}
              <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 10, lineHeight: 1.5 }}>{t.comp_note}</div>
            </Surface>

            <Surface>
              <Heading style={{ marginBottom: 10 }}>
                {lang === "az" ? "Aylıq gəlir & əməliyyat" : lang === "ru" ? "Выручка и транзакции по месяцам" : "Monthly revenue & transactions"}
              </Heading>
              {GROWTH_DATA.months.map((m, i) => (
                <div key={m} style={{ marginBottom: 8, background: growthMonth === m ? `${C.gold}12` : "transparent", margin: "0 -4px 8px", padding: "4px 4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                    <span style={{ color: C.inkSoft, fontWeight: growthMonth === m ? 600 : 400 }}>{monthAbbr(m, lang)}</span>
                    <span style={{ color: C.ink }}>₼{(gd.rev[i]/1000).toFixed(1)}k · {(gd.txn?.[i] ?? 0).toLocaleString()} {lang === "az" ? "əml" : lang === "ru" ? "опер" : "txn"}</span>
                  </div>
                  <div style={{ height: 5, background: C.track, borderRadius: 3 }}>
                    <div style={{ height: 5, width: `${Math.round(gd.rev[i] / Math.max(...gd.rev) * 100)}%`, background: growthMonth === m ? C.gold : C.rattan, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </Surface>
          </div>
        </div>
      )}

      {/* CARD ANALYTICS (POS) */}
      {tab === "cards" && <CardAnalyticsTab lang={lang} />}

      {/* DEEP ANALYTICS & RECONCILIATION */}
      {tab === "deep" && <DeepAnalyticsTab lang={lang} />}

      {/* REVENUE PLAYBOOK */}
      {tab === "playbook" && <RevenuePlaybookTab lang={lang} />}

      {/* BUSINESS SIMULATOR */}
      {tab === "simulator" && <BusinessSimulatorTab lang={lang} />}

      {/* DATA IMPORT */}
      {tab === "import" && <DataImportTab lang={lang} />}

      {/* BENCHMARKS */}
      {tab === "benchmarks" && (
        <div>
          <Surface style={{ marginBottom: "1.25rem", overflowX: "auto" }}>
            <Heading style={{ marginBottom: 12 }}>{t.bench_title}</Heading>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.line}` }}>
                  {[{ l: t.th_metric, left: true }, { l: t.th_benchmark }, { l: "İçərişəhər" }, { l: "Nizami" }, { l: "Binəqədi" }, { l: t.th_insight, left: true }].map((h, i) => (
                    <th key={i} style={{ textAlign: h.left ? "left" : "center", padding: "7px 10px", fontWeight: 600, color: C.inkSoft, fontSize: 11 }}>{h.l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BENCHMARKS.map((r, ri) => {
                  const cell = (v, k) => {
                    const s = benchStatus(v, r.low, r.high, r.inv);
                    return (
                      <td key={k} style={{ textAlign: "center", padding: "8px 10px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 9999, background: statBg[s], color: statTone[s], fontWeight: 600, fontSize: 11 }}>{v.toFixed(1)}% {statMark[s]}</span>
                      </td>
                    );
                  };
                  return (
                    <tr key={ri} style={{ borderBottom: `1px solid ${C.line}` }}>
                      <td style={{ padding: "8px 10px", fontWeight: 600 }}>{pick(r.metric, lang)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "center", color: C.inkSoft }}>{r.bench}</td>
                      {cell(r.icerisheher, "i")}{cell(r.nizami, "n")}{cell(r.bineqedi, "b")}
                      <td style={{ padding: "8px 10px", fontSize: 11, color: C.inkSoft, maxWidth: 180 }}>{pick(r.note, lang)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Surface>

          <Surface>
            <Heading style={{ marginBottom: 12 }}>{t.breakeven_title}</Heading>
            {BRANCHES.map((b) => {
              const above = b.breakeven.pct >= 100;
              return (
                <div key={b.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5, flexWrap: "wrap", gap: 4 }}>
                    <span style={{ fontWeight: 600 }}>{b.name}</span>
                    <span style={{ color: above ? C.sage : C.amber }}>
                      {tfmt(t.breakeven_pct, { pct: b.breakeven.pct })}
                      {above
                        ? <span style={{ color: C.sage, marginLeft: 8 }}>{tfmt(t.breakeven_above, { x: fmtAZN(b.breakeven.gap) })}</span>
                        : <span style={{ color: C.clay, marginLeft: 8 }}>{tfmt(t.breakeven_needs, { up: b.breakeven.needsUp, amt: fmtAZN(Math.abs(b.breakeven.gap)) })}</span>}
                    </span>
                  </div>
                  <div style={{ height: 9, background: C.track, borderRadius: 5, overflow: "hidden" }}>
                    <div style={{ height: 9, width: `${Math.min(100, b.breakeven.pct)}%`, background: above ? b.color : C.amber, borderRadius: 5, transition: "width .6s" }} />
                  </div>
                </div>
              );
            })}
          </Surface>
        </div>
      )}

      {/* CUSTOMERS */}
      {tab === "customers" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(135px,1fr))", gap: 11, marginBottom: "1.25rem" }}>
            {CUSTOMER_KPIS.map((k, i) => (
              <div key={i} style={{ background: C.surfaceAlt, borderRadius: 14, padding: "12px 15px" }}>
                <div style={{ fontSize: 11, color: C.inkSoft, marginBottom: 4 }}>{pick(k.l, lang)}</div>
                <div style={{ fontSize: 21, fontWeight: 600, color: toneColor[k.tone] }}>{k.v}</div>
                <div style={{ fontSize: 10, color: C.inkSoft, marginTop: 2 }}>{pick(k.sub, lang)}</div>
              </div>
            ))}
          </div>

          {MONTHLY_CLIENTS && (
            <Surface style={{ marginBottom: "1.25rem" }}>
              <Heading style={{ marginBottom: 10 }}>{t.cust_monthly_cards}</Heading>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={MONTHLY_CLIENTS} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <XAxis dataKey="m" tickFormatter={(m) => monthAbbr(m, lang)} tick={{ fontSize: 10, fill: C.inkSoft }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: C.inkSoft }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} labelFormatter={(m) => monthAbbr(m, lang)} />
                  <Bar dataKey="icerisheher" name="İçərişəhər" stackId="a" fill={C.sage} maxBarSize={40} />
                  <Bar dataKey="nizami" name="Nizami" stackId="a" fill={C.rattan} maxBarSize={40} />
                  <Bar dataKey="bineqedi" name="Binəqədi" stackId="a" fill={C.clay} radius={[3,3,0,0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 14, fontSize: 11, color: C.inkSoft, marginTop: 6 }}>
                {[["İçərişəhər", C.sage], ["Nizami", C.rattan], ["Binəqədi", C.clay]].map(([n,c]) => (
                  <span key={n}><span style={{ display:"inline-block", width:8, height:8, borderRadius:2, background:c, marginRight:4 }}/>{n}</span>
                ))}
                <span style={{ marginLeft: "auto", fontSize: 10 }}>{t.lbl_card_only}</span>
              </div>
            </Surface>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12, marginBottom: "1.25rem" }}>
            <Surface>
              <Heading style={{ marginBottom: 10 }}>{t.cust_newret}</Heading>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={RETENTION} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="m" tickFormatter={(m) => monthAbbr(m, lang)} tick={{ fontSize: 10, fill: C.inkSoft }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: C.inkSoft }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} labelFormatter={(m) => monthAbbr(m, lang)} />
                  <Bar dataKey="neu" name={t.bar_new} stackId="s" fill="#C2B49B" />
                  <Bar dataKey="ret" name={t.bar_returning} stackId="s" fill={C.gold} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: C.inkSoft, marginTop: 6 }}>
                <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: "#C2B49B", marginRight: 5 }} />{t.legend_new}</span>
                <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: C.gold, marginRight: 5 }} />{t.legend_returning}</span>
              </div>
            </Surface>
            <Surface>
              <Heading style={{ marginBottom: 10 }}>{t.cust_avgticket}</Heading>
              {BRANCHES.map((b) => (
                <div key={b.id} style={{ marginBottom: 11 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: C.inkSoft }}>{b.short}</span>
                    <span style={{ fontWeight: 600, color: b.color }}>₼{b.avgTicket.toFixed(2)}</span>
                  </div>
                  <div style={{ height: 6, background: C.track, borderRadius: 4 }}>
                    <div style={{ height: 6, width: `${b.avgTicket / 14 * 100}%`, background: b.color, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 8, lineHeight: 1.5 }}>{t.avgticket_note}</div>
            </Surface>
          </div>

          <Surface>
            <Heading style={{ marginBottom: 10 }}>{t.loyalty_calc}</Heading>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 11 }}>
              {LOYALTY_SCENARIOS.map((x, i) => (
                <div key={i} style={{ background: C.surfaceAlt, borderRadius: 14, padding: "12px 15px" }}>
                  <div style={{ fontSize: 10, color: C.inkSoft, marginBottom: 2 }}>{pick(x.l, lang)}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{pick(x.s, lang)}</div>
                  <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 4 }}>{tfmt(t.loyalty_txns, { e: x.e.toLocaleString() })}</div>
                  <div style={{ fontSize: 17, fontWeight: 600, color: C.sage, marginTop: 2 }}>+{fmtAZN(x.r)}</div>
                  <div style={{ fontSize: 10, color: C.inkSoft }}>{t.over_6mo}</div>
                </div>
              ))}
            </div>
          </Surface>
        </div>
      )}

      {/* AI COACH */}
      {tab === "coach" && (
        <Surface>
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: "1rem", paddingBottom: "1rem", borderBottom: `1px solid ${C.line}` }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.amberSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageCircle size={18} style={{ color: C.gold }} />
            </div>
            <div>
              <Heading>{t.coach_title}</Heading>
              <div style={{ fontSize: 12, color: C.inkSoft }}>{t.coach_sub}</div>
            </div>
          </div>
          <AICoach lang={lang} t={t} dataSummary={coachDataSummary} />
        </Surface>
      )}

      {/* footer */}
      <div style={{ textAlign: "center", fontSize: 11, color: C.inkSoft, marginTop: 18, letterSpacing: ".04em" }}>
        ☕ CoffeeLea · Baku · {t.footer_data}
        <span style={{ margin: "0 8px", opacity: 0.5 }}>·</span>
        <button
          onClick={async () => { await fetch("/api/logout", { method: "POST" }); window.location.reload(); }}
          style={{ background: "none", border: "none", color: C.inkSoft, cursor: "pointer", fontSize: 11, textDecoration: "underline", padding: 0, letterSpacing: ".04em" }}
        >
          {t.sign_out}
        </button>
      </div>
    </div>
  );
}

