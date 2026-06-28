// lib/sampleData.js — CofiBakuPromo
// Pre-loaded demo data for 3 branches of "Kapi Coffee" (fictional Baku chain).
// Populates the dashboard instantly on first Google login.

// ── Seeded pseudo-random ──────────────────────────────────────────────────
function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; };
}

const MONTHS     = ["Nov 2025","Dec 2025","Jan 2026","Feb 2026","Mar 2026","Apr 2026","May 2026"];
const MONTH_KEYS = ["2025-11","2025-12","2026-01","2026-02","2026-03","2026-04","2026-05"];
const WD_BY_KEY  = { "2025-11":19,"2025-12":20,"2026-01":19,"2026-02":20,"2026-03":14,"2026-04":22,"2026-05":17 };

const BP = {
  "İçərişəhər": {
    avgTicket:22.4, dailyTxns:110, cardPool:3800,
    peakHours:[10,11,12,13,14,15,16,17], wkndMult:1.35,
    banks:{ Kapital:1001, ABB:1002 },
    pnl:[
      { month:"Nov 2025", revenue:73420, cogs:18560, grossProfit:54860, staffCosts:14320, rent:8810, totalExpenses:37180, netProfit:17680 },
      { month:"Dec 2025", revenue:78940, cogs:19980, grossProfit:58960, staffCosts:15430, rent:8810, totalExpenses:39880, netProfit:19080 },
      { month:"Jan 2026", revenue:67230, cogs:17010, grossProfit:50220, staffCosts:13110, rent:8810, totalExpenses:35530, netProfit:14690 },
      { month:"Feb 2026", revenue:65480, cogs:16560, grossProfit:48920, staffCosts:12770, rent:8810, totalExpenses:34690, netProfit:14230 },
      { month:"Mar 2026", revenue:54120, cogs:13690, grossProfit:40430, staffCosts:10550, rent:8810, totalExpenses:31250, netProfit:9180  },
      { month:"Apr 2026", revenue:79350, cogs:20070, grossProfit:59280, staffCosts:15480, rent:8810, totalExpenses:40250, netProfit:19030 },
      { month:"May 2026", revenue:86740, cogs:21940, grossProfit:64800, staffCosts:16920, rent:8810, totalExpenses:44020, netProfit:20780 },
    ],
  },
  "Nizami": {
    avgTicket:18.6, dailyTxns:85, cardPool:2900,
    peakHours:[8,9,12,13,17,18,19], wkndMult:1.15,
    banks:{ Kapital:2001, ABB:2002 },
    pnl:[
      { month:"Nov 2025", revenue:52310, cogs:13230, grossProfit:39080, staffCosts:13440, rent:7546, totalExpenses:29210, netProfit:9870  },
      { month:"Dec 2025", revenue:55890, cogs:14140, grossProfit:41750, staffCosts:14360, rent:7546, totalExpenses:31820, netProfit:9930  },
      { month:"Jan 2026", revenue:48640, cogs:12300, grossProfit:36340, staffCosts:12500, rent:7546, totalExpenses:28050, netProfit:8290  },
      { month:"Feb 2026", revenue:47180, cogs:11930, grossProfit:35250, staffCosts:12130, rent:7546, totalExpenses:27360, netProfit:7890  },
      { month:"Mar 2026", revenue:38250, cogs:9680,  grossProfit:28570, staffCosts:9830,  rent:7546, totalExpenses:23480, netProfit:5090  },
      { month:"Apr 2026", revenue:57430, cogs:14530, grossProfit:42900, staffCosts:14760, rent:7546, totalExpenses:32170, netProfit:10730 },
      { month:"May 2026", revenue:63820, cogs:16140, grossProfit:47680, staffCosts:16410, rent:7546, totalExpenses:36040, netProfit:11640 },
    ],
  },
  "Binəqədi": {
    avgTicket:14.2, dailyTxns:62, cardPool:1900,
    peakHours:[7,8,9,12,13,17,18], wkndMult:0.72,
    banks:{ Kapital:3001 },
    pnl:[
      { month:"Nov 2025", revenue:38940, cogs:10430, grossProfit:28510, staffCosts:10970, rent:5960, totalExpenses:24850, netProfit:3660 },
      { month:"Dec 2025", revenue:41230, cogs:11040, grossProfit:30190, staffCosts:11610, rent:5960, totalExpenses:26580, netProfit:3610 },
      { month:"Jan 2026", revenue:35120, cogs:9400,  grossProfit:25720, staffCosts:9890,  rent:5960, totalExpenses:23600, netProfit:2120 },
      { month:"Feb 2026", revenue:34380, cogs:9200,  grossProfit:25180, staffCosts:9680,  rent:5960, totalExpenses:23110, netProfit:2070 },
      { month:"Mar 2026", revenue:27840, cogs:7460,  grossProfit:20380, staffCosts:7840,  rent:5960, totalExpenses:19520, netProfit:860  },
      { month:"Apr 2026", revenue:43510, cogs:11650, grossProfit:31860, staffCosts:12240, rent:5960, totalExpenses:27480, netProfit:4380 },
      { month:"May 2026", revenue:46920, cogs:12560, grossProfit:34360, staffCosts:13200, rent:5960, totalExpenses:29680, netProfit:4680 },
    ],
  },
};

function buildPosSrc(branchName, bankName, seed) {
  const bp  = BP[branchName];
  const rng = lcg(seed);
  const txnIndex = {};
  let idx = 0;
  const bankNames = Object.keys(bp.banks);
  const share = bankNames.length === 1 ? 1 : (bankName === bankNames[0] ? 0.60 : 0.40);

  for (let mi = 0; mi < MONTH_KEYS.length; mi++) {
    const key = MONTH_KEYS[mi];
    const wd  = WD_BY_KEY[key] || 20;
    const [y, m] = key.split("-");
    const dim = new Date(+y, +m, 0).getDate();
    const target = Math.round(wd * bp.dailyTxns * share);

    for (let t = 0; t < target; t++) {
      const day  = Math.floor(rng() * dim) + 1;
      const date = `${y}-${m}-${String(day).padStart(2,"0")}`;
      const dow  = new Date(date).getDay();
      const isWknd = dow === 0 || dow === 6;
      if (isWknd && rng() > bp.wkndMult && bp.wkndMult < 1) continue;
      const hour = rng() < 0.70
        ? bp.peakHours[Math.floor(rng() * bp.peakHours.length)]
        : Math.floor(rng() * 14) + 7;
      const cardIdx = Math.floor(Math.pow(rng(), 1.8) * bp.cardPool);
      const card    = `****${String(cardIdx % 9999).padStart(4,"0")}`;
      const amount  = Math.max(4, Math.round((bp.avgTicket + (rng()-0.5)*bp.avgTicket*0.7) * 100) / 100);
      const rrn = `KPC-${key}-${bankName.slice(0,3).toUpperCase()}-${String(++idx).padStart(6,"0")}`;
      txnIndex[rrn] = { rrn, ym:key, date, hour, wd:dow===0?6:dow-1, amount, card };
    }
  }

  const byMonth = {};
  for (const tx of Object.values(txnIndex)) {
    if (!byMonth[tx.ym]) byMonth[tx.ym] = { revenue:0, txns:0, cards:new Set() };
    byMonth[tx.ym].revenue += tx.amount;
    byMonth[tx.ym].txns++;
    byMonth[tx.ym].cards.add(tx.card);
  }

  const monthly = MONTH_KEYS.filter(k => byMonth[k]).map(k => ({
    month: MONTHS[MONTH_KEYS.indexOf(k)],
    revenue: Math.round(byMonth[k].revenue),
    txns: byMonth[k].txns,
    uniqueCards: byMonth[k].cards.size,
    avgTicket: +(byMonth[k].revenue / byMonth[k].txns).toFixed(2),
  }));

  const totRev = monthly.reduce((s,m)=>s+m.revenue,0);
  const totTxn = monthly.reduce((s,m)=>s+m.txns,0);

  return {
    fileName:`sample_${branchName}_${bankName}.xlsx`,
    files:[`sample_${branchName}_${bankName}.xlsx`],
    uploadedAt:"2026-01-01T00:00:00.000Z",
    summary:`Kapi Coffee ${branchName} — ${bankName}. ${monthly.length} ay. ₼${Math.round(totRev).toLocaleString()}, ${totTxn.toLocaleString()} əm.`,
    anomalies:[],
    monthly, txnIndex,
    txnCount:idx,
    lastMerge:{ added:idx, skipped:0, file:`sample_${branchName}_${bankName}.xlsx` },
  };
}

function buildPnlSrc(branchName) {
  const pnl = BP[branchName].pnl;
  const totRev = pnl.reduce((s,m)=>s+m.revenue,0);
  const totNet = pnl.reduce((s,m)=>s+m.netProfit,0);
  return {
    fileName:`sample_${branchName}_PnL.xlsx`,
    files:[`sample_${branchName}_PnL.xlsx`],
    uploadedAt:"2026-01-01T00:00:00.000Z",
    summary:`Kapi Coffee ${branchName} — 7 aylıq P&L. Cəmi ₼${Math.round(totRev).toLocaleString()}, net ₼${Math.round(totNet).toLocaleString()}.`,
    anomalies:[], monthly:pnl,
  };
}

export function buildSampleRegistry() {
  const registry = {};
  for (const [bn, bp] of Object.entries(BP)) {
    registry[bn] = { pnl: buildPnlSrc(bn), pos:{} };
    for (const [bank, seed] of Object.entries(bp.banks)) {
      registry[bn].pos[bank] = buildPosSrc(bn, bank, seed);
    }
  }
  return registry;
}

// Static branch config (CofiestoDashboard-compatible shape)
export const SAMPLE_BRANCHES = [
  {
    id:"icerisheher", name:"İçərişəhər", short:"İçərişəhər",
    color:"#B8860B", score:88, status:"excellent",
    may:{ revenue:86740, net:20780, clients:3640, clientsSrc:"card" },
    ratiosMay:{ labor:19.5, rent:10.2, cogs:25.3, gp:74.7, net:24.0, waste:1.4 },
    avgTicket:22.40, breakeven:{ pct:120, gap:14460 },
    actions:[
      { priority:"high",   text:{ az:"VIP kartları şəxsi salamla tanı (245 kart gəlirin 23%-ni daşıyır)",              en:"Recognise VIP cards personally — 245 cards carry 23% of revenue",           ru:"Признавай VIP-карты — 245 карт несут 23% выручки"                  }, impact:"₼3,200" },
      { priority:"medium", text:{ az:"F1 sentyabr həftəsonu üçün kadr, stok, uzadılmış saatları planla",              en:"Plan staffing, stock and hours for F1 September weekend",                    ru:"Планируй персонал, запасы и часы для уикенда F1"                   }, impact:"₼15,000+" },
    ],
  },
  {
    id:"nizami", name:"Nizami", short:"Nizami",
    color:"#4A7C59", score:72, status:"improving",
    may:{ revenue:63820, net:11640, clients:2780, clientsSrc:"card" },
    ratiosMay:{ labor:25.7, rent:11.8, cogs:25.3, gp:74.7, net:18.2, waste:2.1 },
    avgTicket:18.60, breakeven:{ pct:109, gap:5940 },
    actions:[
      { priority:"high",   text:{ az:"Kassir upsell skriptini tətbiq et — orta çeki ₼1.37 artırır",                   en:"Implement cashier upsell script — lifts avg ticket ₼1.37",                  ru:"Скрипт апсейла: средний чек +₼1,37"                                }, impact:"₼9,200" },
      { priority:"medium", text:{ az:"Axşam saatlarında (17-20) trafik aktivləşdirməsi — zəif istifadə olunur",       en:"Activate evening (17-20) traffic — underutilised daypart",                   ru:"Активируй вечерний трафик (17–20) — слабо используется"            }, impact:"₼4,800" },
    ],
  },
  {
    id:"bineqedi", name:"Binəqədi", short:"Binəqədi",
    color:"#C05530", score:41, status:"critical",
    may:{ revenue:46920, net:4680, clients:1890, clientsSrc:"card" },
    ratiosMay:{ labor:28.1, rent:12.7, cogs:26.8, gp:73.2, net:10.0, waste:3.2 },
    avgTicket:14.20, breakeven:{ pct:102, gap:940 },
    actions:[
      { priority:"high",   text:{ az:"İşçi xərclərini 28%-dən 23%-ə endirməyi hədəflə (orta 24.5%)",                 en:"Target labour cost reduction from 28% to 23% (industry avg 24.5%)",         ru:"Снизь трудозатраты с 28% до 23% (ср. по отрасли 24,5%)"            }, impact:"₼2,400" },
      { priority:"high",   text:{ az:"Upsell ilə orta çeki ₼14.2-dən ₼16+-a çatdır",                                en:"Upsell training to lift avg ticket from ₼14.2 to ₼16+",                     ru:"Апсейл: средний чек с ₼14,2 до ₼16+"                               }, impact:"₼3,600" },
      { priority:"medium", text:{ az:"Həftəsonu zəifdir — sakinlər üçün 09-12 promosyon yarat",                      en:"Weekends are weak — run a 09-12 promo for local residents",                  ru:"Слабые выходные — промо 09–12 для местных"                         }, impact:"₼2,100" },
    ],
  },
];

export const SAMPLE_BENCHMARKS = [
  { metric:{az:"İşçi xərci %",en:"Labour %",ru:"Труд %"},       bench:"24–28%", icerisheher:19.5, nizami:25.7, bineqedi:28.1, note:{az:"Binəqədi diqqət tələb edir",en:"Binəqədi needs attention",ru:"Binəqədi требует внимания"}, low:24, high:28, inv:true },
  { metric:{az:"Kirayə %",en:"Rent %",ru:"Аренда %"},           bench:"8–12%",  icerisheher:10.2, nizami:11.8, bineqedi:12.7, note:{az:"Hamısı normadadır",en:"All within range",ru:"Все в норме"},                                  low:8,  high:12, inv:true },
  { metric:{az:"Xammal %",en:"Food cost %",ru:"Себестоимость %"},bench:"25–32%", icerisheher:25.3, nizami:25.3, bineqedi:26.8, note:{az:"Yaxşı idarə olunur",en:"Well managed",ru:"Хорошо управляется"},                            low:25, high:32, inv:true },
  { metric:{az:"Brüt marja",en:"Gross margin",ru:"Валовая маржа"},bench:"68–75%", icerisheher:74.7, nizami:74.7, bineqedi:73.2, note:{az:"Standart üzərindədir",en:"Above standard",ru:"Выше стандарта"},                          low:68, high:75, inv:false },
  { metric:{az:"Xalis marja",en:"Net margin",ru:"Чистая маржа"}, bench:"8–15%",  icerisheher:24.0, nizami:18.2, bineqedi:10.0, note:{az:"İçərişəhər əla, Binəqədi diqqətlə izlənilsin",en:"İçərişəhər excellent, monitor Binəqədi",ru:"İçərişəhər отлично, следи за Binəqədi"}, low:8, high:15, inv:false },
];

export const SAMPLE_MONTHLY_TREND = [
  { m:"Nov", icerisheher:73420, nizami:52310, bineqedi:38940 },
  { m:"Dec", icerisheher:78940, nizami:55890, bineqedi:41230 },
  { m:"Jan", icerisheher:67230, nizami:48640, bineqedi:35120 },
  { m:"Feb", icerisheher:65480, nizami:47180, bineqedi:34380 },
  { m:"Mar", icerisheher:54120, nizami:38250, bineqedi:27840 },
  { m:"Apr", icerisheher:79350, nizami:57430, bineqedi:43510 },
  { m:"May", icerisheher:86740, nizami:63820, bineqedi:46920 },
];

export const SAMPLE_CURRENT_MONTH = { az:"May 2026", ru:"Май 2026", en:"May 2026" };
