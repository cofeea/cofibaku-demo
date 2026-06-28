// components/BranchIntelligenceCard.jsx
// Context-aware performance analysis for Branch Pulse tab.
// Shows: working-day-adjusted history, calendar/event explanations, 3-month forecast.

import React, { useMemo } from "react";
import { useData } from "@/lib/DataContext";
import {
  BRANCH_CONTEXT,
  AZ_CALENDAR_2026,
  eventsForMonth,
} from "@/lib/businessContext";

// ── Palette (matches existing Cofiesto tabs) ──────────────────────────────
const C = {
  bg:"#F6F2E9", panel:"#FBF8F1", ink:"#2A251E", sub:"#6E6457",
  line:"#E3DBCB", caramel:"#BE7A3C", green:"#6E8C6A", clay:"#B5524A",
  gold:"#CDA04B", slate:"#7C8AA0", cream:"#EDE8DC",
};
const SERIF = "var(--brand-serif, Georgia), Georgia, serif";
const SANS  = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const fmt = n => Math.round(Math.abs(n)).toLocaleString("en-US").replace(/,/g, " ");

// ── Constants ─────────────────────────────────────────────────────────────
const MN_S   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const AVG_WD = 20.08; // AZ national average working days per month
const CALENDAR_DAYS = 30.44; // avg calendar days per month

const ID_TO_CTX = {
  icerisheher: "İçərişəhər",
  nizami:      "Nizami",
  bineqedi:    "Binəqədi",
};

// ── i18n ─────────────────────────────────────────────────────────────────
const T = {
  az:{
    title:"Kontekst Kəşfiyyatı",
    histTitle:"Tarixçə",
    histSub_wd:"İş günü başına gəlir (₼/iş günü) — aylıq ümumi gəliri iş günü sayına bölür",
    histSub_cd:"Gündəlik gəlir (₼/gün) — 7 günlük iş rejimi",
    avg:"Orta", trend:"Trend (son 3 ay)", base:"Baza",
    perWd:"iş günü başına", perDay:"gün başına",
    calendarFlag:"Bayram/istirahət",
    eventFlag:"Tədbir",
    fcTitle:"Gələcək 3 ay — proqnoz",
    fcSub:"Baza × iş günü × tədbirlər",
    fcTotal:"3 ay cəmi",
    insightLabel:"Əsas Tapıntı",
    wdUnit:"iş günü",
    workingDayNote:"iş günü baxımından normal",
    noData:"Bu filial üçün hələ P&L və ya POS datası yüklənməyib.",
    liveTag:"● idxal datası",
    staticTag:"statik data",
    calExplain:"Aylıq ümumi düşüş bayram günlərindən — iş günü başına performans normaldır",
    evtBoost:"Gözlənilən artım",
  },
  ru:{
    title:"Контекстная аналитика",
    histTitle:"История",
    histSub_wd:"Выручка за рабочий день (₼/день) — норм. по рабочим дням",
    histSub_cd:"Ежедневная выручка (₼/день) — работает 7 дней",
    avg:"Среднее", trend:"Тренд (посл. 3 мес.)", base:"База",
    perWd:"за раб. день", perDay:"за день",
    calendarFlag:"Праздник",
    eventFlag:"Событие",
    fcTitle:"Следующие 3 месяца — прогноз",
    fcSub:"База × раб. дни × события",
    fcTotal:"Итого 3 мес.",
    insightLabel:"Ключевой вывод",
    wdUnit:"раб. дней",
    workingDayNote:"норм. по раб. дням",
    noData:"Данные P&L или POS для этого филиала ещё не загружены.",
    liveTag:"● импорт",
    staticTag:"статичные данные",
    calExplain:"Месячный спад из-за праздников — выручка за раб. день в норме",
    evtBoost:"Ожидаемый рост",
  },
  en:{
    title:"Context Intelligence",
    histTitle:"History",
    histSub_wd:"Revenue per working day (₼/day) — normalises for calendar effects",
    histSub_cd:"Daily revenue (₼/day) — 7-day operation",
    avg:"Average", trend:"Trend (last 3 mo.)", base:"Baseline",
    perWd:"per working day", perDay:"per day",
    calendarFlag:"Holiday",
    eventFlag:"Event",
    fcTitle:"Next 3 months — forecast",
    fcSub:"Baseline × working days × events",
    fcTotal:"3-month total",
    insightLabel:"Key Finding",
    wdUnit:"working days",
    workingDayNote:"normal on per-day basis",
    noData:"No P&L or POS data loaded yet for this branch.",
    liveTag:"● imported",
    staticTag:"static data",
    calExplain:"Monthly dip from holidays — per-working-day performance is normal",
    evtBoost:"Expected uplift",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────
function toKey(label) {
  if (!label) return null;
  if (/^\d{4}-\d{2}$/.test(label)) return label;
  const idx = MN_S.findIndex(n => label.startsWith(n));
  const yr  = (label.match(/\d{4}/) || [])[0];
  return (idx >= 0 && yr) ? `${yr}-${String(idx+1).padStart(2,"0")}` : null;
}
function keyLabel(key, short=false) {
  if (!key) return "?";
  const [y, m] = key.split("-");
  const mn = MN_S[parseInt(m)-1];
  return short ? `${mn}'${y.slice(2)}` : `${mn} ${y}`;
}

// ── Model: working-day-adjusted analysis ──────────────────────────────────
function buildAnalysis(series, calSens) {
  if (!series?.length) return null;

  const data = series.map(m => {
    const cal   = AZ_CALENDAR_2026[m.key] || {};
    const wd    = cal.workDays || 20;
    const denom = calSens === "working_days" ? wd : CALENDAR_DAYS;
    const rpd   = m.revenue > 0 ? m.revenue / denom : null;
    return { ...m, wd, rpd, holidays: cal.holidays || [] };
  });

  const vals = data.map(m => m.rpd).filter(v => v != null && v > 0);
  if (vals.length < 2) return null;

  const avg = vals.reduce((s,v) => s+v, 0) / vals.length;
  // Weighted trend: recent months count more
  const recent = vals.slice(-3);
  const trend = recent.reduce((s,v,i) => s+v*(i+1), 0) / recent.reduce((s,_,i) => s+(i+1), 0);
  const maxRpd = Math.max(...vals);

  // Calendar-affected months: raw revenue well below trend but per-day is fine
  const expectedRaw = trend * (calSens === "working_days" ? AVG_WD : CALENDAR_DAYS);
  const contextMonths = data.filter(m => {
    if (!m.rpd) return false;
    const rawRatio = m.revenue / expectedRaw;
    const adjRatio = m.rpd / trend;
    // Raw looks low (< 88%) but per-day is reasonable (> 85%) → calendar explains it
    return rawRatio < 0.88 && adjRatio > 0.85 && m.holidays.length > 0;
  });

  // Event-boosted months (above trend AND events happened that month)
  const boostedMonths = data.filter(m => {
    if (!m.rpd) return false;
    const adjRatio = m.rpd / trend;
    const evts = eventsForMonth(m.key);
    return adjRatio > 1.12 && evts.length > 0;
  });

  return { data, avg, trend, maxRpd, contextMonths, boostedMonths, calSens };
}

// ── Model: 3-month forward forecast ──────────────────────────────────────
function buildForecast(trendRpd, branchCtx) {
  const today   = new Date();
  const calSens = branchCtx?.calendarSensitivity;
  const evtSens = branchCtx?.eventSensitivity;

  return [1, 2, 3].map(off => {
    const d   = new Date(today.getFullYear(), today.getMonth() + off, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    const cal = AZ_CALENDAR_2026[key] || {};
    const wd  = cal.workDays || 20;
    const holidays = cal.holidays || [];

    // Base revenue: per-day baseline × relevant day count
    const denom = calSens === "working_days" ? wd : CALENDAR_DAYS;
    const base  = Math.round(trendRpd * denom);

    // Event multiplier
    const monthEvts = eventsForMonth(key);
    let evtMult = 1.0;
    const evtTags = [];
    for (const evt of monthEvts) {
      const boost = evtSens==="high"?0.18 : evtSens==="medium"?0.10 : evtSens==="low_to_medium"?0.05 : 0.02;
      evtMult += boost;
      if (evt.name.includes("Formula 1")) evtTags.push({icon:"🏎️", boost, id:"f1"});
      else if (evt.name.includes("Volleyball")) evtTags.push({icon:"🏐", boost, id:"vb"});
      else evtTags.push({icon:"📅", boost, id:"ev"});
    }
    // F1 September special (if not already from eventsForMonth)
    if (key==="2026-09" && evtSens==="high" && !evtTags.find(t=>t.id==="f1")) {
      evtMult += 0.22;
      evtTags.push({icon:"🏎️", boost:0.22, id:"f1"});
    }

    // Holiday drag (for working-day branches, already in wd count)
    // For all-day branches, public holidays slightly reduce footfall
    if (calSens !== "working_days" && holidays.length > 0) {
      evtMult = Math.max(0.92, evtMult - holidays.length * 0.02);
    }

    const expected  = Math.round(base * evtMult);
    const wdDelta   = Math.round((wd / AVG_WD - 1) * 100);
    const evtDelta  = Math.round((evtMult - 1) * 100);

    return { key, label: keyLabel(key, true), fullLabel: keyLabel(key), wd, wdDelta, evtTags, expected, base, holidays, evtDelta };
  });
}

// ── Key insight text ──────────────────────────────────────────────────────
function buildInsight(branchId, analysis, forecast, t) {
  if (!analysis || !forecast) return null;
  const ctx = BRANCH_CONTEXT[ID_TO_CTX[branchId]];
  const calSens = ctx?.calendarSensitivity;
  const evtSens = ctx?.eventSensitivity;

  const topMonth  = [...forecast].sort((a,b) => b.expected - a.expected)[0];
  const f1Month   = forecast.find(m => m.evtTags.find(t => t.id==="f1"));
  const ctxMonths = analysis.contextMonths;

  const trend = analysis.trend;
  const perDayLabel = calSens === "working_days" ? t.perWd : t.perDay;

  // Build insight based on branch type
  if (branchId === "icerisheher") {
    if (f1Month) {
      return {
        az: `F1 GP (${f1Month.fullLabel}): Zarifa üçün gözlənilən əlavə gəlir ₼${fmt(f1Month.expected - f1Month.base)}. Trend ₼${fmt(trend)}/gün — F1 həftəsonu (4 gün, ~3× surge) bu rəqəmi dəfələrlə artırır. Kadr, stok, uzadılmış iş saatını elə indi planla.`,
        ru: `F1 GP (${f1Month.fullLabel}): ожидаемая надбавка Zarifa ₼${fmt(f1Month.expected - f1Month.base)}. Тренд ₼${fmt(trend)}/день; уикенд F1 (4 дня, ~3×) многократно усиливает результат. Персонал, запасы и часы работы планируй уже сейчас.`,
        en: `F1 GP (${f1Month.fullLabel}): Zarifa is modelled to earn +₼${fmt(f1Month.expected - f1Month.base)} extra. Trend ₼${fmt(trend)}/day; the race weekend (4 days, ~3× surge) amplifies this significantly. Plan staffing, stock and extended hours now.`,
      };
    }
    return {
      az: `Zarifa gündəlik ₼${fmt(trend)} bazasında işləyir. Ən güclü gələcək ay ${topMonth?.fullLabel} — ₼${fmt(topMonth?.expected || 0)} gözlənilir.`,
      ru: `Zarifa работает на базе ₼${fmt(trend)}/день. Лучший месяц вперёд — ${topMonth?.fullLabel}, ожидается ₼${fmt(topMonth?.expected || 0)}.`,
      en: `Zarifa runs on a ₼${fmt(trend)}/day baseline. Strongest upcoming month is ${topMonth?.fullLabel} — ₼${fmt(topMonth?.expected || 0)} expected.`,
    };
  }

  if (branchId === "bineqedi") {
    const calNote = ctxMonths.length
      ? { az:`${keyLabel(ctxMonths[0].key, true)} aydakı düşüş ${ctxMonths[0].wd} iş günündən (Novruz/bayram) qaynaqlanır — ₼${fmt(ctxMonths[0].rpd || 0)}/iş günü normaldır.`, ru:`Спад в ${keyLabel(ctxMonths[0].key, true)} вызван ${ctxMonths[0].wd} рабочими днями (праздники), ₼${fmt(ctxMonths[0].rpd || 0)}/раб. день — норма.`, en:`The dip in ${keyLabel(ctxMonths[0].key, true)} was ${ctxMonths[0].wd} working days (holidays), not lost demand — ₼${fmt(ctxMonths[0].rpd || 0)}/day is normal.` }
      : null;
    return {
      az: `City Point iş günü başına ₼${fmt(trend)} sabit baza göstərir. ${calNote?.az||""} ${topMonth?.wd >= 22 ? `${topMonth.fullLabel} (${topMonth.wd} iş günü) — bu ilin ən məhsuldar ayı: ₼${fmt(topMonth.expected)} gözlənilir.` : ""}`,
      ru: `City Point: стабильная база ₼${fmt(trend)}/раб. день. ${calNote?.ru||""} ${topMonth?.wd >= 22 ? `${topMonth.fullLabel} (${topMonth.wd} дней) — лучший месяц года: ₼${fmt(topMonth.expected)}.` : ""}`,
      en: `City Point shows a stable ₼${fmt(trend)}/working day baseline. ${calNote?.en||""} ${topMonth?.wd >= 22 ? `${topMonth.fullLabel} (${topMonth.wd} days) — strongest month this year: ₼${fmt(topMonth.expected)} expected.` : ""}`,
    };
  }

  if (branchId === "nizami") {
    return {
      az: `Central Park parkın yanındadır, havadan asılıdır. İyar–İyun mülayim mövsümü — pik dövr. ${topMonth ? `${topMonth.fullLabel}: ₼${fmt(topMonth.expected)} gözlənilir.` : ""}`,
      ru: `Central Park у парка, зависит от погоды. Пик — май–июнь. ${topMonth ? `${topMonth.fullLabel}: ожидается ₼${fmt(topMonth.expected)}.` : ""}`,
      en: `Central Park is weather-driven; peak is May–June mild season. ${topMonth ? `${topMonth.fullLabel}: ₼${fmt(topMonth.expected)} expected.` : ""}`,
    };
  }

  if (false) { // removed
    return {
      az: `ADY qatar stansiyasındadır — 7 gün stabil. İş günləri trafiki az dəyişdirir. F1 (Sen) turist axını artıracaq. ${topMonth ? `${topMonth.fullLabel}: ₼${fmt(topMonth.expected)} gözlənilir.` : ""}`,
      ru: `ADY — вокзал, стабильно 7 дней. В сентябре (F1) ожидается рост туристов. ${topMonth ? `${topMonth.fullLabel}: ₼${fmt(topMonth.expected)}.` : ""}`,
      en: `ADY is a railway station — steady 7 days a week. September F1 will boost tourist traffic. ${topMonth ? `${topMonth.fullLabel}: ₼${fmt(topMonth.expected)} expected.` : ""}`,
    };
  }
  return null;
}

// ── Main component ────────────────────────────────────────────────────────
export default function BranchIntelligenceCard({ branchId, lang = "az", staticMonthly = null }) {
  const { dashboardData } = useData();
  const t = T[lang] || T.az;
  const ctxName = ID_TO_CTX[branchId];
  const ctx = BRANCH_CONTEXT[ctxName];
  if (!ctx) return null;

  const calSens = ctx.calendarSensitivity;
  const isLive  = dashboardData?.hasData;

  // Build monthly series (live P&L preferred, then live POS, then static)
  const series = useMemo(() => {
    const pnl = dashboardData?.pnl?.[ctxName]?.monthly;
    const pos = dashboardData?.pos?.[ctxName]?.monthly;
    const src = pnl?.length ? pnl : (pos?.length ? pos : staticMonthly);
    if (!src) return null;
    return src.map(m => ({ key: toKey(m.month), label: m.month, revenue: m.revenue || 0 }))
              .filter(m => m.key && m.revenue > 0)
              .sort((a,b) => a.key.localeCompare(b.key));
  }, [dashboardData, ctxName, staticMonthly]);

  const analysis = useMemo(() => buildAnalysis(series, calSens), [series, calSens]);
  const forecast = useMemo(() => analysis ? buildForecast(analysis.trend, ctx) : null, [analysis, ctx]);
  const insight  = useMemo(() => buildInsight(branchId, analysis, forecast, t), [branchId, analysis, forecast, t]);

  const card = { background:C.panel, border:`1px solid ${C.line}`, borderRadius:14, padding:"16px 18px 14px" };
  const lbl  = { fontSize:11, fontWeight:700, letterSpacing:.5, textTransform:"uppercase", color:C.sub, marginBottom:8 };

  // ── No data ──
  if (!analysis) {
    return (
      <div style={{...card, opacity:.7}}>
        <div style={{fontSize:13, fontWeight:600, color:C.ink, marginBottom:4}}>🧠 {t.title}</div>
        <div style={{fontSize:12, color:C.sub}}>{t.noData}</div>
      </div>
    );
  }

  const maxRpd = analysis.maxRpd;
  const perDayLabel = calSens === "working_days" ? t.perWd : t.perDay;
  const forecastMax = forecast ? Math.max(...forecast.map(m => m.expected), 1) : 1;
  const forecastTotal = forecast ? forecast.reduce((s,m) => s+m.expected, 0) : 0;
  const trendVsAvg = Math.round((analysis.trend / analysis.avg - 1) * 100);

  return (
    <div style={{ fontFamily:SANS, color:C.ink }}>

      {/* ── Header ── */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
        <h3 style={{ fontFamily:SERIF, fontSize:15, fontWeight:600, margin:0 }}>🧠 {t.title}</h3>
        <span style={{ fontSize:10, fontWeight:600, color:isLive?C.green:C.sub, background:isLive?"#EEF2EC":C.cream, border:`1px solid ${isLive?"#CBD8C6":C.line}`, borderRadius:999, padding:"2px 8px" }}>
          {isLive ? t.liveTag : t.staticTag}
        </span>
      </div>

      {/* ── Historical working-day bars ── */}
      <div style={card}>
        <div style={lbl}>{t.histTitle} — {calSens==="working_days"?t.histSub_wd:t.histSub_cd}</div>

        {analysis.data.map((m, i) => {
          const isCtx     = analysis.contextMonths.some(c => c.key === m.key);
          const isBoosted = analysis.boostedMonths?.some(b => b.key === m.key);
          const isLatest  = i === analysis.data.length - 1;
          const pct       = m.rpd ? Math.round((m.rpd / maxRpd) * 100) : 0;
          const barColor  = isCtx ? C.clay : isBoosted ? C.gold : isLatest ? C.green : C.caramel;
          const evts      = eventsForMonth(m.key);

          return (
            <div key={m.key} style={{ marginBottom:7 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:46, fontSize:11, color:C.sub, flexShrink:0 }}>{keyLabel(m.key, true)}</div>
                <div style={{ flex:1, height:8, background:C.line, borderRadius:4 }}>
                  <div style={{ height:8, width:`${Math.max(3,pct)}%`, background:barColor, borderRadius:4, transition:"width .4s" }}/>
                </div>
                <div style={{ fontSize:11, fontWeight:600, color:barColor, width:80, textAlign:"right", flexShrink:0 }}>
                  ₼{fmt(m.rpd||0)}/{perDayLabel.split(" ")[0]}
                </div>
                <div style={{ fontSize:10, color:C.sub, width:42, textAlign:"right", flexShrink:0 }}>
                  {calSens==="working_days" ? `${m.wd}g` : "30g"}
                </div>
              </div>

              {/* Annotations */}
              {isCtx && (
                <div style={{ marginLeft:54, marginTop:2, fontSize:10, color:C.clay, display:"flex", alignItems:"center", gap:4 }}>
                  <span style={{ background:"#FBEDEA", padding:"1px 6px", borderRadius:4 }}>
                    ⚠ {m.wd} {t.wdUnit} · {t.calExplain}
                  </span>
                </div>
              )}
              {isBoosted && evts.length > 0 && (
                <div style={{ marginLeft:54, marginTop:2, fontSize:10, color:"#8B6200", display:"flex", gap:4 }}>
                  {evts.slice(0,2).map((e,j) => (
                    <span key={j} style={{ background:"rgba(205,160,75,.15)", padding:"1px 6px", borderRadius:4 }}>
                      📅 {e.name.slice(0,15)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Stats row */}
        <div style={{ borderTop:`1px solid ${C.line}`, marginTop:10, paddingTop:10, display:"flex", gap:20, flexWrap:"wrap" }}>
          <div>
            <div style={{ fontSize:11, color:C.sub }}>{t.avg}</div>
            <div style={{ fontFamily:SERIF, fontSize:16, fontWeight:600, color:C.ink }}>₼{fmt(analysis.avg)}/{perDayLabel.split(" ")[0]}</div>
          </div>
          <div>
            <div style={{ fontSize:11, color:C.sub }}>{t.trend}</div>
            <div style={{ fontFamily:SERIF, fontSize:16, fontWeight:600, color:trendVsAvg>=0?C.green:C.clay }}>
              ₼{fmt(analysis.trend)}/{perDayLabel.split(" ")[0]} {trendVsAvg>0?`↑`:trendVsAvg<0?`↓`:""}
            </div>
          </div>
          <div>
            <div style={{ fontSize:11, color:C.sub }}>{t.base}</div>
            <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>
              {calSens==="working_days"
                ? `Gəlecək ay = ₼${fmt(analysis.trend)} × iş günü`
                : `Gəlecək ay = ₼${fmt(analysis.trend)} × 30`}
            </div>
          </div>
        </div>
      </div>

      {/* ── 3-month forecast ── */}
      {forecast && (
        <div style={card}>
          <div style={lbl}>{t.fcTitle}</div>
          <div style={{ fontSize:11, color:C.sub, marginBottom:12 }}>{t.fcSub}</div>

          {forecast.map((m, i) => {
            const pct     = Math.round(m.expected / forecastMax * 100);
            const isF1    = m.evtTags.some(t => t.id==="f1");
            const barClr  = isF1 ? C.gold : m.evtDelta > 5 ? C.caramel : C.green;

            return (
              <div key={m.key} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                  <div style={{ width:46, fontSize:12, fontWeight:600, color:C.ink, flexShrink:0 }}>
                    {m.label}
                  </div>
                  <div style={{ flex:1, height:10, background:C.line, borderRadius:5 }}>
                    <div style={{ height:10, width:`${Math.max(3,pct)}%`, background:barClr, borderRadius:5, transition:"width .4s" }}/>
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:barClr, width:78, textAlign:"right", flexShrink:0 }}>
                    ₼{fmt(m.expected)}
                  </div>
                </div>
                <div style={{ marginLeft:54, display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                  {/* Working day annotation */}
                  {calSens === "working_days" && (
                    <span style={{ fontSize:10, color:m.wdDelta>5?C.green:m.wdDelta<-5?C.clay:C.sub }}>
                      {m.wd} {t.wdUnit}{m.wdDelta!==0?` (${m.wdDelta>0?"+":""}${m.wdDelta}%)`:""} 
                    </span>
                  )}
                  {/* Event tags */}
                  {m.evtTags.map((tag, j) => (
                    <span key={j} style={{ fontSize:10, fontWeight:600, padding:"1px 7px", borderRadius:999,
                      background: tag.id==="f1"?"rgba(205,160,75,.2)":"rgba(190,122,60,.12)",
                      color: tag.id==="f1"?"#7A5500":C.caramel }}>
                      {tag.icon} {t.evtBoost} +{Math.round(tag.boost*100)}%
                    </span>
                  ))}
                  {/* Holiday warning */}
                  {m.holidays.length > 0 && (
                    <span style={{ fontSize:10, color:C.sub }}>
                      📅 {m.holidays.slice(0,1).join("")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          <div style={{ borderTop:`1px solid ${C.line}`, marginTop:10, paddingTop:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:11, color:C.sub }}>{t.fcTotal}</span>
            <span style={{ fontFamily:SERIF, fontSize:18, fontWeight:600, color:C.green }}>₼{fmt(forecastTotal)}</span>
          </div>
        </div>
      )}

      {/* ── Key insight ── */}
      {insight && (
        <div style={{ background:"#EEF2EC", border:"1px solid #CBD8C6", borderRadius:12, padding:"12px 14px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#46603F", marginBottom:4, textTransform:"uppercase", letterSpacing:.5 }}>
            💡 {t.insightLabel}
          </div>
          <div style={{ fontSize:12.5, color:"#3A5235", lineHeight:1.6 }}>
            {insight[lang] || insight.en || insight.az}
          </div>
        </div>
      )}
    </div>
  );
}
