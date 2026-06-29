import React, { useState, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, ComposedChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";
import { useData } from "@/lib/DataContext";

/* ============================================================
   Kapi Coffee — POS / Card Analytics tab
   Real bank POS data (ABB · Kapital/Birbank · Paşa)
   Period: Nov 2025 – May 2026 (full months) · card sales only
   Drop into the existing dashboard as a new tab.
   ============================================================ */

// ---- Brand tokens (match existing dashboard) ----
const C = {
  bg: "#F6F2E9", panel: "#FBF8F1", ink: "#2A251E", sub: "#6E6457",
  line: "#E3DBCB", caramel: "#BE7A3C", green: "#6E8C6A", clay: "#B5524A",
  gold: "#CDA04B", slate: "#7C8AA0",
};
const SERIF = "var(--brand-serif, Georgia), Georgia, serif";
const SANS = "system-ui, -apple-system, 'Segoe UI', sans-serif";

// ---- Real data (computed from bank exports) ----
const MONTHS_KEY = ["11","12","01","02","03","04","05"];
const DATA = {
  ADY: {
    rev:[15769,18698,15036,14246,13850,17058,17119], txn:[1537,1804,1488,1393,1420,1759,1718],
    avg:[10.26,10.36,10.10,10.23,9.75,9.70,9.96], cust:[1244,1387,1180,1123,1161,1358,1355],
    mom:[null,18.6,-19.6,-5.3,-2.8,23.2,0.4], avgMom:2.4,
    totRev:111774, totTxn:11119, avgTicket:10.05, totCust:7259,
    foreign:24.1, foreignCov:99.9, repeat:21.8, visits:1.52,
    freq:[5674,984,441,160],
    daypart:{morning:23.3,midday:13.6,afternoon:37.3,evening:25.7,late:0.1},
    dow:[14.9,14.2,15.0,14.2,16.6,14.6,10.4],
    banks:{ABB:14423,Kapital:73989,"Paşa":36055},
    nr:[[1103,142],[1173,215],[923,258],[857,267],[870,292],[1021,338],[1019,337]],
    chan:{"AZE Digər Bank kart":35831,"Kapital Bank kart":34123,"Xarici Bank kart":2714,"Birbank":691,"M10":593,"Digər tətbiqlər":36},
  },
  "Nizami_static": {
    rev:[22399,15220,14495,14441,14883,22442,29939], txn:[1787,1395,1277,1314,1250,2042,2440],
    avg:[12.53,10.91,11.35,10.99,11.91,10.99,12.27], cust:[1207,833,810,825,871,1198,1650],
    mom:[null,-32.1,-4.8,-0.4,3.1,50.8,33.4], avgMom:8.3,
    totRev:133820, totTxn:11505, avgTicket:11.63, totCust:5749,
    foreign:33.3, foreignCov:99.8, repeat:28.3, visits:1.99,
    freq:[4124,840,491,294],
    daypart:{morning:16.1,midday:31.5,afternoon:29.1,evening:23.3,late:0.1},
    dow:[13.9,14.6,15.2,15.7,15.7,12.5,12.4],
    banks:{ABB:40038,Kapital:53052,"Paşa":62797},
    nr:[[1187,21],[652,182],[591,220],[561,265],[608,264],[882,317],[1242,409]],
    chan:{"Kapital Bank kart":26106,"AZE Digər Bank kart":24399,"Xarici Bank kart":1696,"Birbank":460,"M10":235,"Digər tətbiqlər":156},
  },
  "Icerisheher_static": {
    rev:[48876,42374,40272,35882,40108,51062,52954], txn:[3938,3492,3418,2960,3192,4223,4371],
    avg:[12.41,12.13,11.78,12.12,12.57,12.09,12.11], cust:[2356,1973,2021,1878,2038,2515,2648],
    mom:[null,-13.3,-5.0,-10.9,11.8,27.3,3.7], avgMom:2.3,
    totRev:311527, totTxn:25594, avgTicket:12.17, totCust:11160,
    foreign:19.7, foreignCov:99.2, repeat:34.2, visits:2.27,
    freq:[7345,1853,1252,710],
    daypart:{morning:7.9,midday:28.1,afternoon:41.0,evening:22.8,late:0.3},
    dow:[13.7,14.6,15.5,14.4,15.4,13.6,12.8],
    banks:{ABB:134824,Kapital:206635},
    nr:[[2356,1],[1461,513],[1385,637],[1263,616],[1362,677],[1667,849],[1666,983]],
    chan:{"AZE Digər Bank kart":113856,"Kapital Bank kart":62454,"Xarici Bank kart":26395,"Birbank":2267,"M10":1315,"Digər tətbiqlər":348},
  },
};
const NET = { cust:22860, rev:557121, txn:48218, avg:11.55, multi:1502, single:23500 };

// ---- i18n ----
const T = {
  en:{ title:"Card Analytics", sub:"Sample card data · Nov 2025 – May 2026 · card sales only",
    network:"Network", cardRev:"Card revenue", txns:"Transactions", avgTicket:"Avg ticket", customers:"Unique cards",
    comp:"Comparable sales (month-on-month)", avgMoM:"avg / month", revTxn:"Revenue & transactions",
    loyalty:"Customer loyalty", repeatRate:"Repeat customers", visitsPer:"visits per card", freqDist:"Visit frequency",
    once:"1 visit", twice:"2", three:"3–5", six:"6+", newRet:"New vs returning cards", newC:"New", ret:"Returning",
    mix:"Card origin", local:"Local", foreignL:"Foreign", ofRev:"of card revenue", coverage:"classified",
    when:"When customers pay", morning:"Morning", midday:"Midday", afternoon:"Afternoon", evening:"Evening",
    dow:"By weekday", acquirer:"By acquirer (bank)", channel:"Payment method (Kapital)",
    months:["Nov","Dec","Jan","Feb","Mar","Apr","May"], dows:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
    multi:"shop at 2+ branches", azn:"₼" },
  ru:{ title:"Анализ карт", sub:"Пример данных по картам · ноя 2025 – май 2026 · только карты",
    network:"Сеть", cardRev:"Выручка по картам", txns:"Транзакции", avgTicket:"Средний чек", customers:"Уник. карты",
    comp:"Сопоставимые продажи (месяц к месяцу)", avgMoM:"в среднем / мес", revTxn:"Выручка и транзакции",
    loyalty:"Лояльность клиентов", repeatRate:"Повторные клиенты", visitsPer:"визитов на карту", freqDist:"Частота визитов",
    once:"1 визит", twice:"2", three:"3–5", six:"6+", newRet:"Новые и вернувшиеся", newC:"Новые", ret:"Вернувшиеся",
    mix:"Происхождение карт", local:"Местные", foreignL:"Иностранные", ofRev:"выручки по картам", coverage:"определено",
    when:"Когда платят клиенты", morning:"Утро", midday:"День", afternoon:"После обеда", evening:"Вечер",
    dow:"По дням недели", acquirer:"По банку-эквайеру", channel:"Способ оплаты (Kapital)",
    months:["ноя","дек","янв","фев","мар","апр","май"], dows:["Пн","Вт","Ср","Чт","Пт","Сб","Вс"],
    multi:"в 2+ филиалах", azn:"₼" },
  az:{ title:"Kart Analitikası", sub:"Nümunə kart datası · Noy 2025 – May 2026 · yalnız kart satışı",
    network:"Şəbəkə", cardRev:"Kart gəliri", txns:"Əməliyyatlar", avgTicket:"Orta çek", customers:"Unikal kart",
    comp:"Müqayisəli satış (aydan-aya)", avgMoM:"orta / ay", revTxn:"Gəlir və əməliyyatlar",
    loyalty:"Müştəri loyallığı", repeatRate:"Təkrar müştəri", visitsPer:"kart başına ziyarət", freqDist:"Ziyarət tezliyi",
    once:"1 ziyarət", twice:"2", three:"3–5", six:"6+", newRet:"Yeni və qayıdan kartlar", newC:"Yeni", ret:"Qayıdan",
    mix:"Kartın mənşəyi", local:"Yerli", foreignL:"Xarici", ofRev:"kart gəlirinin", coverage:"təsnif edilib",
    when:"Müştərilər nə vaxt ödəyir", morning:"Səhər", midday:"Günorta", afternoon:"Nahardan sonra", evening:"Axşam",
    dow:"Həftə günü üzrə", acquirer:"Bank (ekvayer) üzrə", channel:"Ödəniş üsulu (Kapital)",
    months:["Noy","Dek","Yan","Fev","Mar","Apr","May"], dows:["B.e","Ç.a","Çər","C.a","Cüm","Şən","Baz"],
    multi:"2+ filialda alış-veriş edir", azn:"₼" },
};

const fmt = (n) => n>=1000 ? (n/1000).toFixed(n>=10000?0:1)+"k" : Math.round(n);
const fmtFull = (n) => Math.round(n).toLocaleString("en-US").replace(/,/g," ");

// ════════════════════════════════════════════════════════════════════
// HYBRID DATA ADAPTER
// If the user has imported POS data (DataContext), build the branch
// datasets dynamically from it. Otherwise fall back to the static DATA
// above. Months are detected automatically; a 12-month window keeps
// charts readable when many months are present.
// ════════════════════════════════════════════════════════════════════

const MONTH_ABBR = {
  en:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
  az:["Yan","Fev","Mar","Apr","May","İyn","İyl","Avq","Sen","Okt","Noy","Dek"],
  ru:["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"],
};

// map dashboard branch ids ↔ DataContext branch names
const ID_TO_CTX = { icerisheher:"İçərişəhər", nizami:"Nizami", bineqedi:"Binəqədi" };

// "Nov 2025" → "2025-11"
function labelToKey(label) {
  const idx = MONTH_ABBR.en.findIndex(n => label.startsWith(n));
  const yr  = (label.match(/\d{4}/) || [])[0];
  if (idx < 0 || !yr) return label;
  return `${yr}-${String(idx+1).padStart(2,"0")}`;
}

// Build one branch's dataset in the shape the charts expect,
// from the imported POS cell (pos[branch]) of computeDashboardData.
function buildBranchFromImport(posBranch) {
  if (!posBranch?.monthly?.length) return null;

  let monthly = [...posBranch.monthly].sort(
    (a,b) => labelToKey(a.month).localeCompare(labelToKey(b.month))
  );

  // Drop partial months so MoM / averages aren't distorted:
  //  • the current calendar month (always partial), and
  //  • any month with < 50% of THIS branch's median transaction volume
  //    (e.g. a terminal installed mid-month → tiny Oct → false +1800% spike).
  const now = new Date();
  const curKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const vols = monthly.map(m => m.txns || 0).filter(x => x > 0).sort((a,b)=>a-b);
  const median = vols.length ? vols[Math.floor(vols.length/2)] : 0;
  const full = monthly.filter(m =>
    labelToKey(m.month) !== curKey && (median === 0 || (m.txns||0) >= median * 0.5)
  );
  if (full.length >= 2) monthly = full;
  else monthly = monthly.filter(m => labelToKey(m.month) !== curKey);

  const keys = monthly.map(m => labelToKey(m.month));
  const rev  = monthly.map(m => Math.round(m.revenue));
  const txn  = monthly.map(m => m.txns);
  const avg  = monthly.map(m => m.avgTicket);
  const cust = monthly.map(m => m.uniqueCards || 0);

  // MoM % (first month null)
  const mom = rev.map((v,i) => i===0 ? null
    : (rev[i-1] > 0 ? Math.round((v - rev[i-1]) / rev[i-1] * 1000)/10 : null));
  const valid = mom.filter(x => x != null);
  const avgMom = valid.length ? Math.round(valid.reduce((a,b)=>a+b,0)/valid.length*10)/10 : 0;

  // bank split (from byBank)
  const banks = {};
  if (posBranch.byBank) {
    for (const [bk, info] of Object.entries(posBranch.byBank)) {
      const name = bk === "Pasa" ? "Paşa" : bk;
      banks[name] = Math.round(info.totalRevenue || 0);
    }
  }

  return {
    __keys: keys,                 // ["2025-11", ...] for dynamic labels
    __imported: true,
    rev, txn, avg, cust, mom, avgMom,
    totRev:  Math.round(posBranch.totalRevenue || rev.reduce((a,b)=>a+b,0)),
    totTxn:  posBranch.totalTxns || txn.reduce((a,b)=>a+b,0),
    avgTicket: posBranch.avgTicket || 0,
    totCust: posBranch.uniqueCards || Math.max(...cust, 0),
    banks,
    // fields the static data has but POS import can't compute → null/empty.
    // The component guards each of these before rendering.
    foreign:null, foreignCov:null, repeat:null, visits:null,
    freq:null, daypart:null, dow:null, nr:null, chan:null,
  };
}

// Format a month key "2025-11" → localized "Noy 25"
function keyToShort(key, lang) {
  const m = key.match(/^(\d{4})-(\d{2})$/);
  if (!m) return key;
  const arr = MONTH_ABBR[lang] || MONTH_ABBR.en;
  return `${arr[+m[2]-1]} ${m[1].slice(2)}`;
}

export default function CardAnalyticsTab({ lang = "az" }) {
  const [branch, setBranch] = useState("icerisheher");
  const [selMonth, setSelMonth] = useState("all");
  const [winStart, setWinStart] = useState(0);   // window scroll offset (for 13+ months)
  const t = T[lang];
  const isNet = branch === "__net";

  // ── HYBRID: read imported data if present ──
  const { dashboardData } = useData();
  const imported = dashboardData?.hasData ? dashboardData : null;

  // Build the active dataset for the selected branch.
  // Priority: imported POS data → static DATA fallback.
  const d = useMemo(() => {
    if (isNet) return null;
    if (imported) {
      const ctxName = ID_TO_CTX[branch];
      const built = buildBranchFromImport(imported.pos?.[ctxName]);
      if (built) {
        // merge static-only descriptive fields (daypart, dow, freq, chan,
        // foreign, repeat) as a fallback so those charts still show something
        // until they can be computed from raw transactions.
        const stat = DATA[branch] || {};
        return {
          ...built,
          foreign:    built.foreign    ?? stat.foreign,
          foreignCov: built.foreignCov ?? stat.foreignCov,
          repeat:     built.repeat     ?? stat.repeat,
          visits:     built.visits     ?? stat.visits,
          freq:       built.freq       ?? stat.freq,
          daypart:    built.daypart    ?? stat.daypart,
          dow:        built.dow        ?? stat.dow,
          nr:         built.nr         ?? stat.nr,
          chan:       built.chan       ?? stat.chan,
        };
      }
    }
    return DATA[branch];
  }, [isNet, imported, branch]);

  // ── dynamic month labels ──
  // If imported: use the real month keys. Else: static Nov–May labels.
  const monthKeys = d?.__keys || MONTHS_KEY.map(mm => {
    // static keys are "11","12","01".. → reconstruct year (2025 for 11/12, else 2026)
    const yr = (mm === "11" || mm === "12") ? "2025" : "2026";
    return `${yr}-${mm}`;
  });
  const monthLabelsFull = monthKeys.map(k => keyToShort(k, lang));
  const nMonths = monthKeys.length;

  // ── 12-month visible window (auto) ──
  const WINDOW = 12;
  const needsWindow = nMonths > WINDOW;
  const maxStart = Math.max(0, nMonths - WINDOW);
  const start = needsWindow ? Math.min(winStart, maxStart) : 0;
  const end   = needsWindow ? start + WINDOW : nMonths;
  const visibleIdx = [];
  for (let i=start; i<end; i++) visibleIdx.push(i);

  const monthIdx = selMonth === "all" ? null : parseInt(selMonth, 10);

  // ── build trend rows (only the visible window) ──
  const trend = useMemo(() => {
    if (!d) return [];
    return visibleIdx.map(i => ({
      m:    monthLabelsFull[i],
      rev:  d.rev?.[i] ?? 0,
      txn:  d.txn?.[i] ?? 0,
      avg:  d.avg?.[i] ?? 0,
      cust: d.cust?.[i] ?? 0,
      mom:  d.mom?.[i] ?? null,
      new:  d.nr?.[i]?.[0] ?? 0,
      ret:  d.nr?.[i]?.[1] ?? 0,
      _idx: i,
    }));
  }, [d, start, end, lang]);

  const periodLabel = nMonths
    ? `${monthLabelsFull[0]} – ${monthLabelsFull[nMonths-1]}`
    : "Nov–May";

  const freqData = !d?.freq ? [] : [
    {k:t.once, v:d.freq[0]}, {k:t.twice, v:d.freq[1]},
    {k:t.three, v:d.freq[2]}, {k:t.six, v:d.freq[3]},
  ];
  const dpData = !d?.daypart ? [] : [
    {k:t.morning, v:d.daypart.morning}, {k:t.midday, v:d.daypart.midday},
    {k:t.afternoon, v:d.daypart.afternoon}, {k:t.evening, v:d.daypart.evening},
  ];
  const dowData = !d?.dow ? [] : d.dow.map((v,i)=>({k:t.dows[i], v}));
  const bankData = !d?.banks ? [] : Object.entries(d.banks).map(([k,v])=>({name:k, value:v}));
  const chanData = !d?.chan ? [] : Object.entries(d.chan).map(([k,v])=>({k, v}));
  const mixData = (d?.foreign == null) ? [] : [
    {name:t.local, value:100-d.foreign}, {name:t.foreignL, value:d.foreign},
  ];
  const BANK_COLORS = {ABB:C.caramel, Kapital:C.green, "Paşa":C.slate};

  const branches = (() => {
    const order = ["icerisheher", "nizami", "bineqedi"];
    const labelOf = (id) => ({ icerisheher:"İçərişəhər", nizami:"Nizami", bineqedi:"Binəqədi" }[id] || id);
    let ids;
    if (imported) {
      // only branches that actually have POS data
      ids = order.filter(id => {
        const p = imported.pos?.[ID_TO_CTX[id]];
        return p && (p.totalRevenue || p.monthly?.length);
      });
      if (!ids.length) ids = ["icerisheher", "nizami", "bineqedi"];
    } else {
      ids = ["icerisheher", "nizami", "bineqedi"];   // static fallback
    }
    return [...ids.map(id => ({ id, label: labelOf(id) })), { id: "__net", label: t.network }];
  })();

  // ---- shared styles ----
  const card = {background:C.panel, border:`1px solid ${C.line}`, borderRadius:14, padding:"18px 18px 14px"};
  const h = {fontFamily:SERIF, color:C.ink, fontSize:15, fontWeight:600, margin:"0 0 14px", letterSpacing:.2};
  const tip = {contentStyle:{background:C.panel, border:`1px solid ${C.line}`, borderRadius:10, fontFamily:SANS, fontSize:12}, cursor:{fill:"rgba(190,122,60,.06)"}};

  return (
    <div style={{background:C.bg, minHeight:"100%", padding:"22px 18px 40px", fontFamily:SANS, color:C.ink, fontVariantNumeric:"tabular-nums"}}>
      {/* header */}
      <div style={{display:"flex", flexWrap:"wrap", justifyContent:"space-between", alignItems:"flex-end", gap:14, marginBottom:6}}>
        <div>
          <h1 style={{fontFamily:SERIF, fontSize:26, fontWeight:600, margin:0}}>{t.title}</h1>
          <p style={{color:C.sub, fontSize:12.5, margin:"6px 0 0", maxWidth:520, lineHeight:1.5}}>{t.sub}</p>
        </div>
      </div>

      {/* branch selector */}
      <div style={{display:"flex", gap:8, flexWrap:"wrap", margin:"18px 0 20px"}}>
        {branches.map(b=>(
          <button key={b.id} onClick={()=>setBranch(b.id)} style={{
            fontFamily:SANS, fontSize:13, fontWeight:600, padding:"8px 16px", borderRadius:999, cursor:"pointer",
            border:`1px solid ${branch===b.id?C.ink:C.line}`,
            background:branch===b.id?C.ink:C.panel, color:branch===b.id?"#fff":C.sub, transition:"all .15s"}}>
            {b.label}</button>
        ))}
      </div>

      {/* sub-line shows dynamic period when imported */}
      {imported && !isNet && (
        <div style={{fontSize:11, color:C.sub, margin:"-12px 0 14px"}}>
          {periodLabel} · {nMonths} {lang==="az"?"ay":lang==="ru"?"мес":"months"}
          {d?.__imported && <span style={{color:C.green, marginLeft:8}}>● {lang==="az"?"yüklənmiş data":lang==="ru"?"импорт. данные":"imported data"}</span>}
        </div>
      )}

      {/* month filter (dynamic; windowed when 13+ months) */}
      {!isNet && nMonths > 0 && (
        <div style={{display:"flex", gap:5, flexWrap:"wrap", marginBottom:18, alignItems:"center"}}>
          <button onClick={()=>setSelMonth("all")} style={{fontSize:11,fontWeight:600,padding:"4px 10px",borderRadius:999,cursor:"pointer",border:`1px solid ${selMonth==="all"?C.gold:C.line}`,background:selMonth==="all"?C.gold:C.panel,color:selMonth==="all"?"#fff":C.sub}}>
            {lang==="az"?"Bütün aylar":lang==="ru"?"Все месяцы":"All months"}
          </button>

          {needsWindow && (
            <button onClick={()=>setWinStart(s=>Math.max(0,s-1))} disabled={start<=0}
              style={{fontSize:13,fontWeight:700,padding:"3px 9px",borderRadius:999,cursor:start<=0?"default":"pointer",border:`1px solid ${C.line}`,background:C.panel,color:start<=0?C.line:C.sub,opacity:start<=0?0.5:1}}>‹</button>
          )}

          {visibleIdx.map(i=>(
            <button key={i} onClick={()=>setSelMonth(String(i))} style={{fontSize:11,fontWeight:600,padding:"4px 9px",borderRadius:999,cursor:"pointer",border:`1px solid ${selMonth===String(i)?C.caramel:C.line}`,background:selMonth===String(i)?C.caramel:C.panel,color:selMonth===String(i)?"#fff":C.sub}}>
              {monthLabelsFull[i]}
            </button>
          ))}

          {needsWindow && (
            <button onClick={()=>setWinStart(s=>Math.min(maxStart,s+1))} disabled={start>=maxStart}
              style={{fontSize:13,fontWeight:700,padding:"3px 9px",borderRadius:999,cursor:start>=maxStart?"default":"pointer",border:`1px solid ${C.line}`,background:C.panel,color:start>=maxStart?C.line:C.sub,opacity:start>=maxStart?0.5:1}}>›</button>
          )}
        </div>
      )}

      {isNet ? (
        /* ---------- NETWORK VIEW ---------- */
        (()=>{
          // Build network figures from imported data when present
          const netRev   = imported ? imported.network.totalRevenue : NET.rev;
          const netTxn   = imported ? imported.network.totalTxns    : NET.txn;
          const netAvg   = imported ? imported.network.avgTicket    : NET.avg;
          const netCust  = imported ? imported.network.uniqueCards  : NET.cust;
          const netBranchIds = imported
            ? ["icerisheher","nizami","bineqedi"].filter(b => {
                const p = imported.pos?.[ID_TO_CTX[b]];
                return p && (p.totalRevenue || p.monthly?.length);
              })
            : ["icerisheher","nizami","bineqedi"];
          const netBars  = netBranchIds.map(b=>{
            const ctx = ID_TO_CTX[b];
            const pos = imported?.pos?.[ctx];
            return {
              name: b,
              rev:  pos ? Math.round(pos.totalRevenue) : (DATA[b]?.totRev || 0),
              cust: pos ? pos.uniqueCards : (DATA[b]?.totCust || 0),
            };
          });
          return (
        <div style={{display:"grid", gap:14}}>
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12}}>
            <Kpi label={t.cardRev} value={`${fmtFull(netRev)} ${t.azn}`} sub={imported?periodLabel:"Nov–May"} c={C.caramel}/>
            <Kpi label={t.txns} value={fmtFull(netTxn)} c={C.green}/>
            <Kpi label={t.avgTicket} value={`${netAvg} ${t.azn}`} c={C.gold}/>
            <Kpi label={t.customers} value={fmtFull(netCust)} c={C.slate}/>
          </div>
          <div style={card}>
            <h3 style={h}>{t.cardRev} · {t.network}</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={netBars} margin={{top:6,right:8,left:-12,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false}/>
                <XAxis dataKey="name" tick={{fontSize:12, fill:C.sub}} axisLine={{stroke:C.line}} tickLine={false}/>
                <YAxis tickFormatter={fmt} tick={{fontSize:11, fill:C.sub}} axisLine={false} tickLine={false}/>
                <Tooltip {...tip} formatter={(v)=>[`${fmtFull(v)} ${t.azn}`, t.cardRev]}/>
                <Bar dataKey="rev" radius={[6,6,0,0]} fill={C.caramel} maxBarSize={88}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {!imported && (
          <div style={{...card, display:"flex", alignItems:"center", gap:18, flexWrap:"wrap"}}>
            <div style={{flex:"0 0 auto"}}>
              <div style={{fontFamily:SERIF, fontSize:38, color:C.clay, fontWeight:600}}>{NET.multi.toLocaleString()}</div>
              <div style={{fontSize:12.5, color:C.sub, maxWidth:180}}>{t.multi}</div>
            </div>
            <div style={{flex:1, minWidth:200}}>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={[{name:t.multi, value:NET.multi},{name:"single", value:NET.single}]} dataKey="value" innerRadius={32} outerRadius={52} startAngle={90} endAngle={-270}>
                    <Cell fill={C.clay}/><Cell fill={C.line}/>
                  </Pie>
                  <Tooltip {...tip} formatter={(v)=>fmtFull(v)}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          )}
        </div>
          );
        })()
      ) : (
        /* ---------- BRANCH VIEW ---------- */
        <div style={{display:"grid", gap:14}}>
          {/* KPIs */}
          {(()=>{
            const mi=monthIdx;
            return (<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12}}>
              <Kpi label={t.cardRev} value={`${fmtFull(mi!==null?(d.rev?.[mi]??0):d.totRev)} ${t.azn}`} sub={mi!==null?monthLabelsFull[mi]:periodLabel} c={C.caramel}/>
              <Kpi label={t.txns} value={fmtFull(mi!==null?(d.txn?.[mi]??0):d.totTxn)} c={C.green}/>
              <Kpi label={t.avgTicket} value={`${mi!==null?(d.avg?.[mi]??0):d.avgTicket} ${t.azn}`} c={C.gold}/>
              <Kpi label={t.customers} value={fmtFull(mi!==null?(d.cust?.[mi]??0):d.totCust)} c={C.slate}/>
            </div>);
          })()}

          {/* data-quality flag removed for demo */}
          {/* removed */}

          {/* Comparable sales */}
          <div style={card}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
              <h3 style={h}>{t.comp}</h3>
              {d.avgMom != null && (
                <span style={{fontSize:12, color:d.avgMom>=0?C.green:C.clay, fontWeight:600}}>
                  {d.avgMom>=0?"+":""}{d.avgMom}% {t.avgMoM}</span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trend} margin={{top:6,right:8,left:-14,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false}/>
                <XAxis dataKey="m" tick={{fontSize:11.5, fill:C.sub}} axisLine={{stroke:C.line}} tickLine={false}/>
                <YAxis tickFormatter={(v)=>`${v}%`} tick={{fontSize:11, fill:C.sub}} axisLine={false} tickLine={false}/>
                <Tooltip {...tip} formatter={(v)=> v==null?["—"]:[`${v>0?"+":""}${v}%`, t.comp]}/>
                <ReferenceLine y={0} stroke={C.sub} strokeWidth={1}/>
                <Bar dataKey="mom" radius={[5,5,0,0]} maxBarSize={46}>
                  {trend.map((e,i)=><Cell key={i} fill={monthIdx===e._idx?C.gold:(e.mom==null?C.line:(e.mom>=0?C.green:C.clay))} opacity={monthIdx!==null&&monthIdx!==e._idx?0.5:1}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue & transactions */}
          <div style={card}>
            <h3 style={h}>{t.revTxn}</h3>
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={trend} margin={{top:6,right:6,left:-14,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false}/>
                <XAxis dataKey="m" tick={{fontSize:11.5, fill:C.sub}} axisLine={{stroke:C.line}} tickLine={false}/>
                <YAxis yAxisId="l" tickFormatter={fmt} tick={{fontSize:11, fill:C.sub}} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="r" orientation="right" tickFormatter={fmt} tick={{fontSize:11, fill:C.sub}} axisLine={false} tickLine={false}/>
                <Tooltip {...tip} formatter={(v,n)=> n===t.cardRev?[`${fmtFull(v)} ${t.azn}`,n]:[fmtFull(v),n]}/>
                <Bar yAxisId="l" dataKey="rev" name={t.cardRev} radius={[5,5,0,0]} fill={C.caramel} maxBarSize={40} fillOpacity={.85}/>
                <Line yAxisId="r" dataKey="txn" name={t.txns} stroke={C.green} strokeWidth={2.5} dot={{r:3, fill:C.green}}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Loyalty row */}
          {(d.repeat != null || d.freq) && (
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:14}}>
            {d.repeat != null && (
            <div style={card}>
              <h3 style={h}>{t.loyalty}</h3>
              <div style={{display:"flex", alignItems:"center", gap:20}}>
                <div style={{position:"relative", width:120, height:120}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[{v:d.repeat},{v:100-d.repeat}]} dataKey="v" innerRadius={42} outerRadius={56} startAngle={90} endAngle={-270} stroke="none">
                        <Cell fill={C.green}/><Cell fill={C.line}/>
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{position:"absolute", inset:0, display:"grid", placeItems:"center"}}>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontFamily:SERIF, fontSize:24, fontWeight:600, color:C.green}}>{d.repeat}%</div>
                    </div>
                  </div>
                </div>
                <div>
                  <div style={{fontSize:13, color:C.ink, fontWeight:600}}>{t.repeatRate}</div>
                  <div style={{fontSize:12, color:C.sub, marginTop:4}}>{d.visits} {t.visitsPer}</div>
                </div>
              </div>
            </div>
            )}
            {d.freq && (
            <div style={card}>
              <h3 style={h}>{t.freqDist}</h3>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={freqData} layout="vertical" margin={{top:0,right:18,left:8,bottom:0}}>
                  <XAxis type="number" hide/>
                  <YAxis type="category" dataKey="k" tick={{fontSize:12, fill:C.sub}} axisLine={false} tickLine={false} width={56}/>
                  <Tooltip {...tip} formatter={(v)=>[fmtFull(v), t.customers]}/>
                  <Bar dataKey="v" radius={[0,5,5,0]} fill={C.caramel} maxBarSize={22}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            )}
          </div>
          )}

          {/* New vs returning */}
          {d.nr && (
          <div style={card}>
            <h3 style={h}>{t.newRet}</h3>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={trend} margin={{top:6,right:8,left:-14,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false}/>
                <XAxis dataKey="m" tick={{fontSize:11.5, fill:C.sub}} axisLine={{stroke:C.line}} tickLine={false}/>
                <YAxis tickFormatter={fmt} tick={{fontSize:11, fill:C.sub}} axisLine={false} tickLine={false}/>
                <Tooltip {...tip} formatter={(v,n)=>[fmtFull(v), n]}/>
                <Bar dataKey="new" name={t.newC} stackId="a" fill={C.caramel} radius={[0,0,0,0]} maxBarSize={40}/>
                <Bar dataKey="ret" name={t.ret} stackId="a" fill={C.green} radius={[5,5,0,0]} maxBarSize={40}/>
              </BarChart>
            </ResponsiveContainer>
            <Legend items={[[C.caramel,t.newC],[C.green,t.ret]]}/>
          </div>
          )}

          {/* Card mix + Daypart */}
          {(d.foreign != null || d.daypart) && (
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:14}}>
            {d.foreign != null && (
            <div style={card}>
              <h3 style={h}>{t.mix}</h3>
              <div style={{display:"flex", alignItems:"center", gap:18}}>
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie data={mixData} dataKey="value" innerRadius={36} outerRadius={56} startAngle={90} endAngle={-270} stroke="none">
                      <Cell fill={C.slate}/><Cell fill={C.gold}/>
                    </Pie>
                    <Tooltip {...tip} formatter={(v)=>`${v.toFixed(1)}%`}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{fontSize:13}}>
                  <Row dot={C.gold} label={t.foreignL} val={`${d.foreign}%`} sub={t.ofRev}/>
                  <Row dot={C.slate} label={t.local} val={`${(100-d.foreign).toFixed(1)}%`}/>
                  <div style={{fontSize:11, color:C.sub, marginTop:8}}>{d.foreignCov}% {t.coverage}</div>
                </div>
              </div>
            </div>
            )}
            {d.daypart && (
            <div style={card}>
              <h3 style={h}>{t.when}</h3>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={dpData} margin={{top:6,right:6,left:-18,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false}/>
                  <XAxis dataKey="k" tick={{fontSize:10.5, fill:C.sub}} axisLine={{stroke:C.line}} tickLine={false} interval={0}/>
                  <YAxis tickFormatter={(v)=>`${v}%`} tick={{fontSize:10, fill:C.sub}} axisLine={false} tickLine={false}/>
                  <Tooltip {...tip} formatter={(v)=>[`${v}%`, t.txns]}/>
                  <Bar dataKey="v" radius={[5,5,0,0]} fill={C.green} maxBarSize={48}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            )}
          </div>
          )}

          {/* Weekday + Acquirer */}
          {(d.dow || d.banks) && (
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:14}}>
            {d.dow && (
            <div style={card}>
              <h3 style={h}>{t.dow}</h3>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={dowData} margin={{top:6,right:6,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false}/>
                  <XAxis dataKey="k" tick={{fontSize:10.5, fill:C.sub}} axisLine={{stroke:C.line}} tickLine={false} interval={0}/>
                  <YAxis tickFormatter={(v)=>`${v}%`} tick={{fontSize:10, fill:C.sub}} axisLine={false} tickLine={false}/>
                  <Tooltip {...tip} formatter={(v)=>[`${v}%`, t.cardRev]}/>
                  <Bar dataKey="v" radius={[5,5,0,0]} fill={C.caramel} maxBarSize={34}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            )}
            {d.banks && Object.keys(d.banks).length>0 && (
            <div style={card}>
              <h3 style={h}>{t.acquirer}</h3>
              <div style={{display:"flex", alignItems:"center", gap:14}}>
                <ResponsiveContainer width={120} height={130}>
                  <PieChart>
                    <Pie data={bankData} dataKey="value" innerRadius={34} outerRadius={56} stroke="none">
                      {bankData.map((e,i)=><Cell key={i} fill={BANK_COLORS[e.name]||C.line}/>)}
                    </Pie>
                    <Tooltip {...tip} formatter={(v)=>`${fmtFull(v)} ${t.azn}`}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{fontSize:13}}>
                  {bankData.map((e,i)=>(
                    <Row key={i} dot={BANK_COLORS[e.name]||C.line} label={e.name}
                      val={`${Math.round(e.value/d.totRev*100)}%`}/>
                  ))}
                </div>
              </div>
            </div>
            )}
          </div>
          )}

          {/* Kapital channel detail */}
          {d.chan && (
          <div style={card}>
            <h3 style={h}>{t.channel}</h3>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={chanData} layout="vertical" margin={{top:0,right:24,left:8,bottom:0}}>
                <XAxis type="number" tickFormatter={fmt} hide/>
                <YAxis type="category" dataKey="k" tick={{fontSize:11.5, fill:C.sub}} axisLine={false} tickLine={false} width={130}/>
                <Tooltip {...tip} formatter={(v)=>[`${fmtFull(v)} ${t.azn}`, ""]}/>
                <Bar dataKey="v" radius={[0,5,5,0]} fill={C.green} maxBarSize={20}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          )}
        </div>
      )}
    </div>
  );
}

function Kpi({label, value, sub, c}) {
  return (
    <div style={{background:C.panel, border:`1px solid ${C.line}`, borderRadius:14, padding:"16px 16px 14px"}}>
      <div style={{width:26, height:3, borderRadius:9, background:c, marginBottom:12}}/>
      <div style={{fontFamily:SERIF, fontSize:23, fontWeight:600, color:C.ink, lineHeight:1.1}}>{value}</div>
      <div style={{fontSize:12, color:C.sub, marginTop:6}}>{label}{sub?<span style={{color:C.line==="#E3DBCB"?"#A99":C.sub}}> · {sub}</span>:null}</div>
    </div>
  );
}
function Row({dot, label, val, sub}) {
  return (
    <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:6}}>
      <span style={{width:9, height:9, borderRadius:99, background:dot, flex:"0 0 auto"}}/>
      <span style={{color:C.sub, fontSize:12.5}}>{label}</span>
      <strong style={{marginLeft:"auto", color:C.ink, fontSize:13}}>{val}</strong>
      {sub && <span style={{fontSize:10.5, color:C.sub, marginLeft:4}}>{sub}</span>}
    </div>
  );
}
function Legend({items}) {
  return (
    <div style={{display:"flex", gap:16, justifyContent:"center", marginTop:8}}>
      {items.map(([c,l],i)=>(
        <span key={i} style={{display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.sub}}>
          <span style={{width:10, height:10, borderRadius:3, background:c}}/>{l}</span>
      ))}
    </div>
  );
}
