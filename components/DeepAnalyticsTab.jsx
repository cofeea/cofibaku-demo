import React, { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from "recharts";
import { useData } from "@/lib/DataContext";

const C = {
  bg:"#F6F2E9", panel:"#FBF8F1", ink:"#2A251E", sub:"#6E6457",
  line:"#E3DBCB", caramel:"#BE7A3C", green:"#6E8C6A", clay:"#B5524A",
  gold:"#CDA04B", slate:"#7C8AA0",
};
const SERIF = "var(--brand-serif, Georgia), Georgia, serif";
const SANS  = "system-ui, -apple-system, 'Segoe UI', sans-serif";

// ---- Static fallback (used when no data imported) ----
const DEEP = {
  ADY:{pareto:{top10:34.4,top20:49.1,top50:77.3},repeatRev:45.9,onetimeRev:54.1,retMed:8,retMean:22,peak:17,
    cohort:[{m:"11",n:1244,r:[100,13,8,7,7,6,5]},{m:"12",n:1231,r:[100,10,7,6,6,5]},{m:"01",n:959,r:[100,8,6,4,4]},{m:"02",n:870,r:[100,7,7,4]},{m:"03",n:886,r:[100,8,6]},{m:"04",n:1040,r:[100,8]},{m:"05",n:1029,r:[100]}],
    cohortMonths:["11","12","01","02","03","04","05"],
    heatmap:[[0,0,0,0,0,0,1,75,68,38,21,26,20,36,15,42,34,74,63,53,30,26,32,7],[0,1,0,0,0,0,5,64,50,33,16,16,16,53,22,33,53,72,108,79,36,33,25,4],[0,0,0,0,0,0,0,48,77,29,19,20,22,35,34,33,52,83,78,97,38,42,27,6],[0,2,0,0,0,0,3,55,67,32,18,18,18,51,29,37,42,82,103,97,32,54,15,7],[0,0,0,0,0,0,4,66,72,29,18,16,21,30,37,55,53,109,141,102,30,49,47,6],[0,0,0,0,0,0,13,57,22,22,13,13,13,22,28,34,71,110,62,75,27,38,34,4],[0,0,0,0,0,0,2,38,10,23,16,8,11,17,23,29,59,69,33,31,18,24,24,4]],
    clv:{clv7mo:15.2,clvAnnual:26,avgVisits:1.52,avgTicket:10.04,totalCusts:7259},
    rfm:{VIP:{count:121,pctCust:1.7,rev:11138,pctRev:10.1,avgSpend:92},Loyal:{count:152,pctCust:2.1,rev:5950,pctRev:5.4,avgSpend:39},"At Risk":{count:828,pctCust:11.4,rev:21542,pctRev:19.5,avgSpend:26},"One-time":{count:5674,pctCust:78.2,rev:59740,pctRev:54.1,avgSpend:10},Casual:{count:484,pctCust:6.7,rev:12141,pctRev:11.0,avgSpend:25}}},
  "City Point":{pareto:{top10:40.6,top20:54.9,top50:80.6},repeatRev:57.8,onetimeRev:42.2,retMed:4,retMean:15,peak:13,
    cohort:[{m:"11",n:1207,r:[100,15,11,10,7,8,8]},{m:"12",n:655,r:[100,13,10,10,9,7]},{m:"01",n:592,r:[100,13,8,8,8]},{m:"02",n:561,r:[100,11,8,8]},{m:"03",n:609,r:[100,12,7]},{m:"04",n:883,r:[100,14]},{m:"05",n:1242,r:[100]}],
    cohortMonths:["11","12","01","02","03","04","05"],
    heatmap:[[0,0,0,0,0,0,0,0,30,92,92,88,75,160,100,103,109,91,60,47,49,56,27,13],[1,0,0,0,0,0,0,1,38,101,110,85,82,135,100,102,79,83,69,52,48,61,25,8],[0,0,0,0,0,0,0,0,25,111,90,80,95,152,107,79,89,86,50,51,63,61,29,8],[0,0,0,0,0,0,0,0,32,121,90,69,74,137,114,95,101,72,50,47,56,76,31,5],[0,0,0,0,0,0,0,0,37,118,117,87,88,161,132,94,97,60,56,58,73,56,41,3],[6,0,0,0,0,0,0,0,1,11,24,29,43,62,55,78,49,72,83,64,71,70,39,8],[1,0,0,0,0,0,0,0,0,0,3,7,44,32,50,79,89,100,75,70,57,73,36,1]],
    clv:{clv7mo:23.2,clvAnnual:40,avgVisits:1.99,avgTicket:11.63,totalCusts:5749},
    rfm:{VIP:{count:243,pctCust:4.2,rev:28375,pctRev:21.3,avgSpend:117},Loyal:{count:185,pctCust:3.2,rev:9784,pctRev:7.4,avgSpend:53},"At Risk":{count:754,pctCust:13.1,rev:25517,pctRev:19.2,avgSpend:34},"One-time":{count:4124,pctCust:71.7,rev:56217,pctRev:42.2,avgSpend:14},Casual:{count:443,pctCust:7.7,rev:13207,pctRev:9.9,avgSpend:30}}},
  Port:{pareto:{top10:42.0,top20:56.8,top50:82.2},repeatRev:65.5,onetimeRev:34.5,retMed:4,retMean:15,peak:15,
    cohort:[{m:"11",n:2356,r:[100,22,18,13,12,12,12]},{m:"12",n:1461,r:[100,15,10,8,9,8]},{m:"01",n:1385,r:[100,12,9,9,9]},{m:"02",n:1263,r:[100,12,10,10]},{m:"03",n:1362,r:[100,12,10]},{m:"04",n:1667,r:[100,12]},{m:"05",n:1666,r:[100]}],
    cohortMonths:["11","12","01","02","03","04","05"],
    heatmap:[[3,0,0,0,0,0,0,1,12,39,42,67,83,150,118,146,138,152,219,155,81,47,41,21],[2,0,0,0,0,0,0,16,38,48,59,86,89,248,157,200,131,82,161,107,89,38,38,25],[3,0,0,0,0,0,0,9,93,75,44,30,85,190,162,111,121,137,121,88,28,28,33,32],[3,0,0,0,0,0,0,11,33,33,30,43,44,106,93,126,124,175,152,137,101,93,46,34],[6,0,0,0,0,0,0,10,33,45,45,16,62,180,154,121,138,134,156,156,94,83,49,41],[7,0,0,0,0,0,0,1,10,26,18,45,121,93,188,227,150,121,86,59,56,49,38,35],[5,0,0,0,0,0,0,1,6,22,20,39,28,79,153,164,157,173,131,92,86,64,46,30]],
    clv:{clv7mo:27.6,clvAnnual:47,avgVisits:2.27,avgTicket:12.18,totalCusts:11160},
    rfm:{VIP:{count:596,pctCust:5.3,rev:71669,pctRev:23.3,avgSpend:120},Loyal:{count:410,pctCust:3.7,rev:20436,pctRev:6.6,avgSpend:50},"At Risk":{count:1805,pctCust:16.2,rev:73422,pctRev:23.8,avgSpend:41},"One-time":{count:7345,pctCust:65.8,rev:106211,pctRev:34.5,avgSpend:14},Casual:{count:1004,pctCust:9.0,rev:36210,pctRev:11.8,avgSpend:36}}},
};

const RECON = {
  CARD:{ADY:{rev:111774,comm:2761},"City Point":{rev:133820,comm:2684},Port:{rev:311527,comm:6860}},
  IIKO:{"Zarifa Aliyeva":{rev:509196,gm:66.3,net:80283,nm:15.8,rent:13.2,labor:18.7,mkt:2.8,poscomm:9282},"Central Park":{rev:113228,gm:68.4,net:-18506,nm:-16.3,rent:25.8,labor:42.4,mkt:0,poscomm:1450},"City Point":{rev:55321,gm:66.4,net:-6372,nm:-11.5,rent:29.9,labor:34.7,mkt:0,poscomm:1031}},
  NET:{cardComm:12305,iikoComm:11763,cardRev:557121,iikoRev:677745,cardShare:82},
  IDENTITY:[
    {br:"ADY",outlet:"COFIESTO",voen:"2009169082",dist:"Xətai",term:"ABB 13204292 · Paşa AP213261 · Kapital R1056989"},
    {br:"City Point",outlet:"COFIESTA 2",voen:"1309369542",dist:"Yasamal",term:"ABB 13203979 · Paşa AP210301 · Kapital R1072658"},
    {br:"City Point",outlet:"COFIESTA 3",voen:"1309379352",dist:"Yasamal",term:"ABB 13203980 · Paşa AP210302 · Kapital R1072659"},
    {br:"Port",outlet:"COFIESTO",voen:"1308413641",dist:"Səbail · Zərifə Əliyeva küç.",term:"ABB 13203392 · Kapital R1072365"},
  ],
};

const SEG_CFG = {
  VIP:      {color:"#CDA04B", label:{az:"VIP",ru:"VIP",en:"VIP"}, desc:{az:"Son 30 gündə aktiv, 4+ ziyarət, yüksək xərc",ru:"Активны 30 дней, 4+ визита, высокие траты",en:"Active last 30d, 4+ visits, high spend"}},
  Loyal:    {color:"#6E8C6A", label:{az:"Sadiq",ru:"Лояльные",en:"Loyal"}, desc:{az:"Müntəzəm, 3+ ziyarət, son 45 gündə aktiv",ru:"Регулярные, 3+ визита, активны 45 дней",en:"Regular, 3+ visits, active 45d"}},
  "At Risk":{color:"#B5524A", label:{az:"Risk altında",ru:"Под угрозой",en:"At Risk"}, desc:{az:"2+ ziyarət amma 60+ gündür gəlmir",ru:"2+ визита, но не приходят 60+ дней",en:"2+ visits but gone 60+ days"}},
  "One-time":{color:"#C2B49B", label:{az:"Bir dəfəlik",ru:"Разовые",en:"One-time"}, desc:{az:"Yalnız 1 ziyarət",ru:"Только 1 визит",en:"Single visit only"}},
  Casual:   {color:"#A0907C", label:{az:"Tənbəl",ru:"Случайные",en:"Casual"}, desc:{az:"2-3 ziyarət, aktivlik düşük",ru:"2-3 визита, низкая активность",en:"2-3 visits, low activity"}},
};

const T = {
  az:{
    title:"Dərin Analitika & Uyğunlaşdırma", v1:"Müştəri dərinliyi", v2:"Maliyyə uyğunlaşdırması",
    sub:"Real bank kart datası · etibar mənbəyi = bank çıxarışları",
    clvT:"Müştəri ömür dəyəri (CLV)", clv7mo:"Dövr üzrə CLV", clvAnn:"İllik proqnoz", avgVis:"Ziyarət/kart", avgTk:"Orta çek",
    rfmT:"RFM Müştəri Seqmentasiyası", rfmSub:"Recency · Frequency · Monetary — kart məlumatlarından",
    seg:"Seqment", custPct:"Müştəri", revPct:"Gəlir", avgSpend:"Orta xərc",
    rfmInsightT:"Əsas fürsət",
    cohortT:"Kohort saxlanması", cohortHint:"Hər sətir: ilk gəldiyi aydan sonrakı aylarda qayıtma %-i",
    heatT:"Saat × həftə günü", peak:"Pik saat",
    days:["B.e","Ç.a","Çər","C.a","Cüm","Şən","Baz"],
    paretoT:"Dəyər cəmlənməsi", top:"üst", ofRev:"gəlirin",
    revSplitT:"Gəlir mənbəyi", repeat:"Təkrar", onetime:"Bir dəfəlik", retInt:"Qayıtma intervalı (med.)",
    reconNote:"Şəbəkə səviyyəsində pul uyğun gəlir",
    reconBody:"Bankların tutduğu kart komissiyası (₼12,305) iiko-da qeydə alınan POS komissiyasına (₼11,763) demək olar bərabərdir. Pul ümumilikdə itmir — uyğunsuzluq filiallar arası ad/bölgüdədir.",
    cpFlagT:"City Point — mənfəətlilik nəticəsi şübhəlidir",
    cpFlagBody:"iiko City Point-i ₼55,321 gəlir / −₼6,372 zərər göstərir. Amma bankla təsdiqlənmiş kart gəliri ₼133,820-dir — uçotdakının 2.4 misli. Xərclər sabit saxlanılsa, real gəlirlə filial ~+₼72,000 mənfəətə keçir.",
    booked:"Uçotda (iiko)", cardImplied:"Kart əsaslı (təxmini)",
    cardRevL:"Kart gəliri (bank)", iikoRevL:"iiko gəliri", cardComm:"Kart komissiyası", iikoComm:"POS komissiyası",
    cardVsIiko:"Kart (bank) vs iiko (kitab)", cardBranches:"Kart ixracı", iikoBranches:"iiko kitabları",
    mapNote:"Yalnız \"City Point\" hər iki sistemdə var. Kimlik cədvəli ilə mapping-i təsdiqləyin.",
    idT:"Filial kimliyi (bank qeydiyyatı)", idHint:"\"City Point\" kart ixracı əslində 2 ayrı obyektdir (fərqli VÖEN).",
    cOutlet:"Obyekt", cVoen:"VÖEN", cDist:"Rayon", cTerm:"Terminallar", cLabel:"Kart adı",
    plT:"iiko P&L xülasəsi", cRev:"Gəlir", cGm:"Brüt", cNm:"Xalis", cRent:"İcarə", cLabor:"Əmək", cMkt:"Mkt",
    azn:"₼", liveTag:"● idxal datası",
  },
  ru:{
    title:"Глубокая аналитика и сверка", v1:"Поведение клиентов", v2:"Финансовая сверка",
    sub:"Реальные карточные данные · источник истины = выписки банка",
    clvT:"Пожизненная ценность клиента (CLV)", clv7mo:"CLV за период", clvAnn:"Годовой прогноз", avgVis:"Визитов/карта", avgTk:"Средний чек",
    rfmT:"RFM-сегментация клиентов", rfmSub:"Recency · Frequency · Monetary — из карточных данных",
    seg:"Сегмент", custPct:"Клиенты", revPct:"Выручка", avgSpend:"Ср. трата",
    rfmInsightT:"Ключевая возможность",
    cohortT:"Удержание когорт", cohortHint:"Каждая строка: % возврата клиентов из этого месяца в последующие",
    heatT:"Час × день недели", peak:"Пик",
    days:["Пн","Вт","Ср","Чт","Пт","Сб","Вс"],
    paretoT:"Концентрация ценности", top:"топ", ofRev:"выручки",
    revSplitT:"Источник выручки", repeat:"Повторные", onetime:"Разовые", retInt:"Интервал возврата (мед.)",
    reconNote:"На уровне сети деньги сходятся",
    reconBody:"Карточная комиссия банков (₼12,305) почти равна POS-комиссии в iiko (₼11,763). Деньги в целом не теряются — расхождение в распределении по филиалам.",
    cpFlagT:"City Point — вывод о прибыльности ненадёжен",
    cpFlagBody:"iiko показывает City Point: выручка ₼55,321, убыток −₼6,372. Но подтверждённая банком карточная выручка — ₼133,820, в 2.4× больше всей учтённой. При неизменных затратах филиал выходит в ~+₼72 000 прибыли.",
    booked:"В учёте (iiko)", cardImplied:"По картам (оценка)",
    cardRevL:"Карточная выручка", iikoRevL:"Выручка iiko", cardComm:"Карточная комиссия", iikoComm:"POS-комиссия",
    cardVsIiko:"Карты (банк) vs iiko (книги)", cardBranches:"Карточные выгрузки", iikoBranches:"Книги iiko",
    mapNote:"Только «City Point» есть в обеих системах. Используйте таблицу идентичности для подтверждения.",
    idT:"Идентичность филиалов (банк. регистрация)", idHint:"Выгрузка «City Point» — это 2 разные точки (разные ВОЕН).",
    cOutlet:"Точка", cVoen:"ВОЕН", cDist:"Район", cTerm:"Терминалы", cLabel:"Назв. карты",
    plT:"Сводка P&L iiko", cRev:"Выручка", cGm:"Вал.", cNm:"Чист.", cRent:"Аренда", cLabor:"Труд", cMkt:"Мkt",
    azn:"₼", liveTag:"● импорт",
  },
  en:{
    title:"Deep Analytics & Reconciliation", v1:"Customer depth", v2:"Financial reconciliation",
    sub:"Real card data · source of truth = bank statements",
    clvT:"Customer Lifetime Value (CLV)", clv7mo:"Period CLV", clvAnn:"Annual forecast", avgVis:"Visits/card", avgTk:"Avg ticket",
    rfmT:"RFM Customer Segmentation", rfmSub:"Recency · Frequency · Monetary — from card data",
    seg:"Segment", custPct:"Customers", revPct:"Revenue", avgSpend:"Avg spend",
    rfmInsightT:"Key opportunity",
    cohortT:"Cohort retention", cohortHint:"Each row: % of that month's new customers who return later",
    heatT:"Hour × weekday", peak:"Peak",
    days:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
    paretoT:"Value concentration", top:"top", ofRev:"of revenue",
    revSplitT:"Revenue source", repeat:"Repeat", onetime:"One-time", retInt:"Return interval (med.)",
    reconNote:"At network level, the money reconciles",
    reconBody:"Bank card commission (₼12,305) nearly equals iiko POS commission (₼11,763). Money isn't lost overall — the mismatch is in per-branch allocation.",
    cpFlagT:"City Point — profitability verdict is unreliable",
    cpFlagBody:"iiko shows City Point at ₼55,321 revenue / −₼6,372 loss. But bank-confirmed card revenue alone is ₼133,820 — 2.4× the booked total. Holding costs constant, real revenue swings the branch to ~+₼72,000 profit.",
    booked:"Booked (iiko)", cardImplied:"Card-implied (est.)",
    cardRevL:"Card revenue (bank)", iikoRevL:"iiko revenue", cardComm:"Card commission", iikoComm:"POS commission",
    cardVsIiko:"Card (bank) vs iiko (books)", cardBranches:"Card exports", iikoBranches:"iiko books",
    mapNote:"Only \"City Point\" appears in both systems. Use the identity table to confirm mapping.",
    idT:"Branch identity (bank registration)", idHint:"The \"City Point\" export covers 2 separate outlets (different VÖEN).",
    cOutlet:"Outlet", cVoen:"VÖEN", cDist:"District", cTerm:"Terminals", cLabel:"Card label",
    plT:"iiko P&L summary", cRev:"Revenue", cGm:"GM", cNm:"Net", cRent:"Rent", cLabor:"Labor", cMkt:"Mkt",
    azn:"₼", liveTag:"● imported",
  },
};

const fmt=(n)=>n>=1000?(n/1000).toFixed(n>=10000?0:1)+"k":Math.round(n);
const fmtFull=(n)=>Math.round(n).toLocaleString("en-US").replace(/,/g," ");

// branch display helpers
const brLabel=(b)=> b==="Port" ? "Zarifa (Port)" : b;
const brLabelShort=(b)=> b==="Port" ? "Zarifa" : b;
const CLV_COLOR={ADY:C.slate,"City Point":C.caramel,Port:C.green,"Central Park":C.gold};

// generic insight when no editorial text exists for a branch (e.g. Central Park)
function genericInsight(d, lang){
  const ar = d?.rfm?.["At Risk"];
  const vip = d?.rfm?.VIP;
  if (ar && ar.count>0){
    return {
      az:`"Risk altında" seqmenti ${ar.count} kart, ₼${fmtFull(ar.rev)} gəlir (${ar.pctRev}%) — bu müştərilər əvvəl gəlib, yenidən cəlb etmək yeni müştəri tapmaqdan ucuzdur.`,
      ru:`Сегмент «Под угрозой»: ${ar.count} карт, ₼${fmtFull(ar.rev)} выручки (${ar.pctRev}%) — они уже были, вернуть дешевле, чем привлечь новых.`,
      en:`The At Risk segment holds ${ar.count} cards, ₼${fmtFull(ar.rev)} revenue (${ar.pctRev}%) — they've visited before; reactivating costs less than acquiring new customers.`,
    }[lang];
  }
  if (vip && vip.count>0){
    return {
      az:`VIP müştərilər (${vip.count} kart) gəlirin ${vip.pctRev}%-ni gətirir. Bu seqmenti qorumaq prioritetdir.`,
      ru:`VIP-клиенты (${vip.count} карт) дают ${vip.pctRev}% выручки. Их удержание — приоритет.`,
      en:`VIP customers (${vip.count} cards) generate ${vip.pctRev}% of revenue. Protecting this segment is the priority.`,
    }[lang];
  }
  return "";
}

// build a live RECON.IIKO-style map from imported P&L (keyed by iiko label)
// Uses ALL months (totals) so it reconciles on the same basis as POS card totals.
function buildLiveIiko(dashboardData){
  const pnl = dashboardData?.pnl;
  if (!pnl) return null;
  const map = { "Zarifa (Port)":"Zarifa Aliyeva", "Central Park":"Central Park", "City Point":"City Point", "ADY":"ADY" };
  const out = {};
  let any = false;
  for (const [ctx, label] of Object.entries(map)){
    const p = pnl[ctx];
    if (!p?.monthly?.length) continue;
    any = true;
    const sum = (f)=> p.monthly.reduce((s,m)=>s+(m[f]||0),0);
    const rev = sum("revenue");
    const pct = (x)=> rev>0 ? Math.round((x||0)/rev*1000)/10 : 0;
    out[label] = {
      rev:   Math.round(rev),
      gm:    pct(sum("grossProfit")),
      net:   Math.round(sum("netProfit")),
      nm:    pct(sum("netProfit")),
      rent:  pct(sum("rent")),
      labor: pct(sum("staffCosts")),
      mkt:   0,
      poscomm: 0,
    };
  }
  return any ? out : null;
}

export default function DeepAnalyticsTab({ lang="az" }){
  const { customerAnalytics, dashboardData } = useData();
  const live = customerAnalytics?.hasData ? customerAnalytics : null;

  const [view,setView]=useState("v1");
  const [branch,setBranch]=useState("Port");
  const t=T[lang];

  // branch list: live → branches that have data (may include Central Park); else static 3
  const branchList = live ? live.branches : ["ADY","City Point","Port"];
  const curBranch = branchList.includes(branch) ? branch : (branchList[0] || "Port");
  const d = (live && live.byBranch[curBranch]) ? live.byBranch[curBranch] : (DEEP[curBranch] || DEEP.Port);

  const card={background:C.panel,border:`1px solid ${C.line}`,borderRadius:14,padding:"18px 18px 14px"};
  const h={fontFamily:SERIF,color:C.ink,fontSize:15,fontWeight:600,margin:"0 0 4px"};
  const hint={fontSize:11.5,color:C.sub,margin:"0 0 14px",lineHeight:1.4};
  const hmMax=d?Math.max(...d.heatmap.flat()):1;
  const heatColor=(v)=>{if(!v)return C.panel;const a=Math.pow(v/(hmMax||1),.6);return `rgba(190,122,60,${(.12+a*.78).toFixed(2)})`;};
  const cohColor=(v)=>{if(v>=100)return C.green;if(!v)return C.panel;const a=Math.min(1,v/30);return `rgba(110,140,106,${(.12+a*.8).toFixed(2)})`;};

  // CLV comparison bars (dynamic across available branches)
  const clvBars = branchList.map(b=>{
    const bd = (live && live.byBranch[b]) ? live.byBranch[b] : DEEP[b];
    return { b, v: bd?.clv?.clv7mo || 0, col: CLV_COLOR[b] || C.sub };
  });
  const clvMax = Math.max(...clvBars.map(x=>x.v), 1);

  // editorial RFM insight (static), with generic fallback for branches w/o text
  const rfmInsight = {
    ADY:{az:"78%-i bir dəfəlikdir — amma \"Risk altında\" seqmenti böyük imkandır: bu kartlar əvvəl gəlib, yenidən cəlb etmək yeni müştəri tapmaqdan ucuzdur.",
         ru:"78% разовые — но сегмент «Под угрозой» — большая возможность: они уже были, вернуть их дешевле, чем привлечь новых.",
         en:"78% are one-timers — but the At Risk segment is the big opportunity: they've visited before, reactivating them costs less than acquiring new customers."},
    "City Point":{az:"VIP müştərilər gəlirin böyük hissəsini gətirir. Bu seqmenti qorumaq prioritetdir — onlar üçün xüsusi üstünlüklər düşünün.",
                  ru:"VIP-клиенты дают значительную долю выручки. Их удержание — приоритет: рассмотрите эксклюзивные привилегии.",
                  en:"VIP customers generate a large share of revenue. Protecting this segment is the priority — consider exclusive perks."},
    Port:{az:"\"Risk altında\" seqmenti ən böyük gizli ehtiyatdır. Bu kartları yenidən aktivləşdirmək şəbəkənin ən güclü böyümə rıçağıdır.",
          ru:"Сегмент «Под угрозой» — крупнейший скрытый резерв. Их реактивация — самый мощный рычаг роста сети.",
          en:"The At Risk segment is the largest hidden reserve. Reactivating them is the network's strongest growth lever."},
  };
  const insightText = (live ? genericInsight(d, lang) : rfmInsight[curBranch]?.[lang]) || genericInsight(d, lang) || rfmInsight[curBranch]?.[lang] || "";

  // live reconciliation (P&L summary) from imported data, fallback to static
  const liveIiko = live ? buildLiveIiko(dashboardData) : null;
  const IIKO = liveIiko || RECON.IIKO;
  // live card revenue per branch from imported POS (ALL months, incl Central Park)
  const liveCardRev = (() => {
    if (!live || !dashboardData?.pos) return null;
    const m = { ADY:"ADY", "City Point":"City Point", "Central Park":"Central Park", Port:"Zarifa (Port)" };
    const out = {};
    let any=false;
    for (const [k,ctx] of Object.entries(m)){
      const p = dashboardData.pos[ctx];
      if (p?.totalRevenue) { out[k]=Math.round(p.totalRevenue); any=true; }
    }
    return any ? out : null;
  })();
  const netCardRev = liveCardRev ? Object.values(liveCardRev).reduce((s,v)=>s+v,0) : RECON.NET.cardRev;

  // live totals + per-branch reconciliation (card vs iiko, both ALL-months)
  const iikoLabelOf = { ADY:"ADY", "City Point":"City Point", "Central Park":"Central Park", Port:"Zarifa Aliyeva" };
  const netIikoRev = liveIiko ? Object.values(liveIiko).reduce((s,v)=>s+(v.rev||0),0) : RECON.NET.iikoRev;
  const reconRows = (liveCardRev && liveIiko) ? Object.keys(liveCardRev).map(k=>{
    const iikoE = liveIiko[iikoLabelOf[k]];
    const card = liveCardRev[k]||0, iiko = iikoE?.rev||0;
    return { key:k, label: k==="Port"?"Zarifa (Port)":k, card, iiko, net: iikoE?.net||0, ratio: iiko>0 ? card/iiko : null };
  }) : null;
  // a branch is "unreliable" if bank card revenue alone exceeds booked iiko revenue by >15%
  const discrepancy = reconRows ? reconRows.filter(r=>r.ratio!=null && r.ratio>=1.15).sort((a,b)=>b.ratio-a.ratio) : [];
  const matchPct = netIikoRev>0 ? Math.round(netCardRev/netIikoRev*100) : 0;   // card as % of booked revenue
  const cashOther = Math.round(netIikoRev - netCardRev);                        // cash + timing (usually ≥0)

  return (
    <div style={{background:C.bg,minHeight:"100%",padding:"22px 18px 40px",fontFamily:SANS,color:C.ink,fontVariantNumeric:"tabular-nums"}}>
      {/* header */}
      <div style={{marginBottom:6}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <h1 style={{fontFamily:SERIF,fontSize:25,fontWeight:600,margin:0}}>{t.title}</h1>
          {live && <span style={{fontSize:10.5,fontWeight:600,color:C.green,background:"#EEF2EC",border:`1px solid #CBD8C6`,borderRadius:999,padding:"3px 9px"}}>{t.liveTag}</span>}
        </div>
        <p style={{color:C.sub,fontSize:12.5,margin:"6px 0 0",maxWidth:540,lineHeight:1.5}}>{t.sub}</p>
      </div>

      {/* view toggle */}
      <div style={{display:"flex",gap:8,margin:"18px 0 16px",borderBottom:`1px solid ${C.line}`}}>
        {[["v1",t.v1],["v2",t.v2]].map(([id,lab])=>(
          <button key={id} onClick={()=>setView(id)} style={{fontFamily:SANS,fontSize:13.5,fontWeight:600,padding:"9px 4px",marginRight:14,cursor:"pointer",border:"none",borderBottom:`2px solid ${view===id?C.caramel:"transparent"}`,background:"none",color:view===id?C.ink:C.sub}}>{lab}</button>
        ))}
      </div>

      {view==="v1" ? (
        <>
          {/* branch selector */}
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>
            {branchList.map(b=>(
              <button key={b} onClick={()=>setBranch(b)} style={{fontFamily:SANS,fontSize:13,fontWeight:600,padding:"8px 16px",borderRadius:999,cursor:"pointer",border:`1px solid ${curBranch===b?C.ink:C.line}`,background:curBranch===b?C.ink:C.panel,color:curBranch===b?"#fff":C.sub}}>{brLabel(b)}</button>
            ))}
          </div>

          <div style={{display:"grid",gap:14}}>

            {/* ── CLV ── */}
            <div style={card}>
              <h3 style={h}>{t.clvT}</h3>
              <p style={hint}>{live ? t.rfmSub : "Nov 2025 – May 2026 · card sales only"}</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:12}}>
                {[[t.clv7mo, `₼${d.clv.clv7mo}`],[t.clvAnn,`₼${d.clv.clvAnnual}`],[t.avgVis,`${d.clv.avgVisits}x`],[t.avgTk,`₼${d.clv.avgTicket}`]].map(([label,val])=>(
                  <div key={label} style={{background:C.bg,borderRadius:10,padding:"12px 14px"}}>
                    <div style={{fontSize:11,color:C.sub,marginBottom:4}}>{label}</div>
                    <div style={{fontFamily:SERIF,fontSize:22,fontWeight:600,color:C.ink}}>{val}</div>
                  </div>
                ))}
              </div>
              {/* CLV comparison bar */}
              <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${C.line}`}}>
                <div style={{fontSize:11.5,color:C.sub,marginBottom:8}}>CLV {t.clv7mo} — {lang==="az"?"filiallar arası müqayisə":lang==="ru"?"сравнение по филиалам":"branch comparison"}</div>
                {clvBars.map(({b,v,col})=>(
                  <div key={b} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <div style={{width:78,fontSize:12,color:C.sub}}>{brLabelShort(b)}</div>
                    <div style={{flex:1,height:8,background:C.line,borderRadius:4}}>
                      <div style={{height:8,width:`${v/clvMax*100}%`,background:col,borderRadius:4,transition:"width .5s"}}/>
                    </div>
                    <div style={{fontSize:13,fontWeight:600,color:col,width:40,textAlign:"right"}}>₼{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── RFM ── */}
            <div style={card}>
              <h3 style={h}>{t.rfmT}</h3>
              <p style={hint}>{t.rfmSub}</p>

              {/* segment legend */}
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
                {Object.entries(SEG_CFG).map(([k,cfg])=>(
                  <div key={k} style={{display:"flex",alignItems:"center",gap:6,background:C.bg,borderRadius:8,padding:"5px 10px"}}>
                    <span style={{width:9,height:9,borderRadius:99,background:cfg.color,flexShrink:0}}/>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:C.ink}}>{cfg.label[lang]}</div>
                      <div style={{fontSize:10,color:C.sub,maxWidth:160}}>{cfg.desc[lang]}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* segment table */}
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:400}}>
                  <thead>
                    <tr style={{borderBottom:`1.5px solid ${C.line}`,color:C.sub,textAlign:"right"}}>
                      <th style={{textAlign:"left",padding:"6px 8px"}}>{t.seg}</th>
                      <th style={{padding:"6px 8px"}}>{lang==="az"?"Kart sayı":lang==="ru"?"Карт":"Cards"}</th>
                      <th style={{padding:"6px 8px"}}>{t.custPct}%</th>
                      <th style={{padding:"6px 8px"}}>{t.revPct}%</th>
                      <th style={{padding:"6px 8px"}}>{t.avgSpend}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(d.rfm).map(([seg,vals])=>(
                      <tr key={seg} style={{borderBottom:`1px solid ${C.line}`}}>
                        <td style={{padding:"8px",display:"flex",alignItems:"center",gap:7}}>
                          <span style={{width:8,height:8,borderRadius:99,background:SEG_CFG[seg]?.color||C.sub,flexShrink:0}}/>
                          <span style={{fontWeight:600,color:C.ink}}>{SEG_CFG[seg]?.label[lang]||seg}</span>
                        </td>
                        <td style={{padding:"8px",textAlign:"right"}}>{vals.count.toLocaleString()}</td>
                        <td style={{padding:"8px",textAlign:"right",color:C.sub}}>{vals.pctCust}%</td>
                        <td style={{padding:"8px",textAlign:"right"}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end"}}>
                            <div style={{height:6,width:`${vals.pctRev*2.5}px`,maxWidth:60,background:SEG_CFG[seg]?.color||C.sub,borderRadius:3}}/>
                            <span style={{fontWeight:600,color:C.ink}}>{vals.pctRev}%</span>
                          </div>
                        </td>
                        <td style={{padding:"8px",textAlign:"right",color:C.caramel,fontWeight:600}}>₼{vals.avgSpend}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* insight */}
              {insightText && (
                <div style={{marginTop:14,background:"#EEF2EC",border:`1px solid #CBD8C6`,borderRadius:10,padding:"12px 14px"}}>
                  <div style={{fontSize:12,fontWeight:600,color:"#46603F",marginBottom:4}}>💡 {t.rfmInsightT}</div>
                  <div style={{fontSize:12.5,color:"#46603F",lineHeight:1.5}}>{insightText}</div>
                </div>
              )}
            </div>

            {/* ── Pareto + Revenue source ── */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:14}}>
              <div style={card}>
                <h3 style={h}>{t.paretoT}</h3>
                <p style={hint}>&nbsp;</p>
                {[["10",d.pareto.top10],["20",d.pareto.top20],["50",d.pareto.top50]].map(([k,v])=>(
                  <div key={k} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12.5,marginBottom:4}}>
                      <span style={{color:C.sub}}>{t.top} {k}% → {t.ofRev}</span>
                      <strong style={{color:C.ink}}>{v}%</strong>
                    </div>
                    <div style={{height:7,background:C.line,borderRadius:9}}>
                      <div style={{height:"100%",width:`${v}%`,background:C.caramel,borderRadius:9}}/>
                    </div>
                  </div>
                ))}
              </div>
              <div style={card}>
                <h3 style={h}>{t.revSplitT}</h3>
                <p style={hint}>&nbsp;</p>
                <div style={{display:"flex",height:30,borderRadius:8,overflow:"hidden",marginBottom:10}}>
                  <div style={{width:`${d.repeatRev}%`,background:C.green}}/>
                  <div style={{width:`${d.onetimeRev}%`,background:C.gold}}/>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{width:9,height:9,borderRadius:99,background:C.green}}/><span style={{color:C.sub,fontSize:12.5}}>{t.repeat}</span><strong style={{marginLeft:"auto",color:C.ink}}>{d.repeatRev}%</strong>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                  <span style={{width:9,height:9,borderRadius:99,background:C.gold}}/><span style={{color:C.sub,fontSize:12.5}}>{t.onetime}</span><strong style={{marginLeft:"auto",color:C.ink}}>{d.onetimeRev}%</strong>
                </div>
                <div style={{paddingTop:10,borderTop:`1px solid ${C.line}`,fontSize:12.5}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:C.sub}}>{t.retInt}</span><strong style={{color:C.ink}}>{d.retMed} {lang==="ru"?"дн":lang==="en"?"d":"gün"}</strong></div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}><span style={{color:C.sub}}>{t.peak}</span><strong style={{color:C.ink}}>{d.peak}:00</strong></div>
                </div>
              </div>
            </div>

            {/* ── Cohort ── */}
            <div style={card}>
              <h3 style={h}>{t.cohortT}</h3>
              <p style={hint}>{t.cohortHint}</p>
              <div style={{overflowX:"auto"}}>
                <table style={{borderCollapse:"separate",borderSpacing:3,fontSize:11.5}}>
                  <thead><tr>
                    <th style={{textAlign:"left",color:C.sub,fontWeight:600,padding:"2px 6px"}}></th>
                    {d.cohortMonths.map((_,i)=><th key={i} style={{color:C.sub,fontWeight:600,padding:"2px 4px",minWidth:34}}>+{i}</th>)}
                  </tr></thead>
                  <tbody>
                    {d.cohort.map((c,ri)=>(
                      <tr key={ri}>
                        <td style={{color:C.ink,fontWeight:600,padding:"2px 6px",whiteSpace:"nowrap"}}>{c.m} <span style={{color:C.sub,fontWeight:400}}>({c.n})</span></td>
                        {d.cohortMonths.map((_,ci)=>{
                          const v=c.r[ci];
                          return <td key={ci} style={{textAlign:"center",padding:"5px 4px",borderRadius:5,background:v==null?"transparent":cohColor(v),color:v>=100?"#fff":(v>15?C.ink:C.sub),fontWeight:v>=100?600:400}}>{v==null?"":v}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Heatmap ── */}
            <div style={card}>
              <h3 style={h}>{t.heatT}</h3>
              <p style={hint}>{t.peak}: {d.peak}:00</p>
              <div style={{overflowX:"auto"}}>
                <div style={{minWidth:520}}>
                  <div style={{display:"grid",gridTemplateColumns:`34px repeat(24,1fr)`,gap:2,marginBottom:2}}>
                    <span/>
                    {Array.from({length:24},(_,hh)=><span key={hh} style={{fontSize:8.5,color:C.sub,textAlign:"center"}}>{hh%3===0?hh:""}</span>)}
                  </div>
                  {d.heatmap.map((row,ri)=>(
                    <div key={ri} style={{display:"grid",gridTemplateColumns:`34px repeat(24,1fr)`,gap:2,marginBottom:2}}>
                      <span style={{fontSize:10,color:C.sub,display:"flex",alignItems:"center"}}>{t.days[ri]}</span>
                      {row.map((v,ci)=><div key={ci} title={`${t.days[ri]} ${ci}:00 — ${v}`} style={{aspectRatio:"1",borderRadius:2,background:heatColor(v),minHeight:14}}/>)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </>
      ) : (
        /* ── RECONCILIATION ── */
        <div style={{display:"grid",gap:14}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
            {(live
              ? [[t.cardRevL,`${fmtFull(netCardRev)} ₼`,C.caramel],
                 [t.iikoRevL,`${fmtFull(netIikoRev)} ₼`,C.slate],
                 [lang==="az"?"Nağd + digər":lang==="ru"?"Наличные + пр.":"Cash + other",`${cashOther>=0?"":"−"}${fmtFull(Math.abs(cashOther))} ₼`,C.gold],
                 [lang==="az"?"Kart payı":lang==="ru"?"Доля карт":"Card share",`${matchPct}%`,C.green]]
              : [[t.cardRevL,`${fmtFull(RECON.NET.cardRev)} ₼`,C.caramel],[t.iikoRevL,`${fmtFull(RECON.NET.iikoRev)} ₼`,C.slate],[t.cardComm,`${fmtFull(RECON.NET.cardComm)} ₼`,C.green],[t.iikoComm,`${fmtFull(RECON.NET.iikoComm)} ₼`,C.gold]]
            ).map(([l,v,c])=>(
              <div key={l} style={{background:C.panel,border:`1px solid ${C.line}`,borderRadius:14,padding:"14px 14px 12px"}}>
                <div style={{width:24,height:3,borderRadius:9,background:c,marginBottom:10}}/>
                <div style={{fontFamily:SERIF,fontSize:20,fontWeight:600,color:C.ink}}>{v}</div>
                <div style={{fontSize:11,color:C.sub,marginTop:5}}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{background:"#EEF2EC",border:`1px solid #CBD8C6`,borderRadius:14,padding:"14px 16px"}}>
            <strong style={{fontFamily:SERIF,fontSize:14,color:"#46603F"}}>{t.reconNote}</strong>
            <p style={{margin:"6px 0 0",fontSize:12.5,color:"#46603F",lineHeight:1.5}}>
              {live
                ? (lang==="az"
                    ? `Bank kart gəliri (${fmtFull(netCardRev)} ₼) iiko uçot gəlirinin (${fmtFull(netIikoRev)} ₼) ${matchPct}%-ni təşkil edir. Qalan hissə nağd ödəniş və vaxt fərqidir — pul itmir.`
                    : lang==="ru"
                    ? `Карточная выручка банка (${fmtFull(netCardRev)} ₼) составляет ${matchPct}% от учётной выручки iiko (${fmtFull(netIikoRev)} ₼). Остальное — наличные и расхождение по времени.`
                    : `Bank card revenue (${fmtFull(netCardRev)} ₼) is ${matchPct}% of iiko booked revenue (${fmtFull(netIikoRev)} ₼). The rest is cash payments and timing — money isn't lost.`)
                : t.reconBody}
            </p>
          </div>

          {/* per-branch verdict — data-driven */}
          {(!live) ? (
            <div style={{background:"#FBEDEA",border:`1px solid #E7C4BE`,borderRadius:14,padding:"16px"}}>
              <strong style={{fontFamily:SERIF,fontSize:14,color:C.clay}}>{t.cpFlagT}</strong>
              <p style={{margin:"8px 0 12px",fontSize:12.5,color:"#7A463F",lineHeight:1.55}}>{t.cpFlagBody}</p>
            </div>
          ) : discrepancy.length ? (
            <div style={{background:"#FBEDEA",border:`1px solid #E7C4BE`,borderRadius:14,padding:"16px"}}>
              <strong style={{fontFamily:SERIF,fontSize:14,color:C.clay}}>
                {discrepancy[0].label} — {lang==="az"?"mənfəət hökmü etibarsızdır":lang==="ru"?"вердикт о прибыли ненадёжен":"profitability verdict is unreliable"}
              </strong>
              <p style={{margin:"8px 0 12px",fontSize:12.5,color:"#7A463F",lineHeight:1.55}}>
                {lang==="az"
                  ? `iiko ${discrepancy[0].label} üçün ${fmtFull(discrepancy[0].iiko)} ₼ gəlir göstərir. Amma yalnız bankla təsdiqlənmiş kart gəliri ${fmtFull(discrepancy[0].card)} ₼-dir — uçotun ${discrepancy[0].ratio.toFixed(1)} misli. Bu, iiko ixracının natamam olduğunu göstərir.`
                  : lang==="ru"
                  ? `iiko показывает выручку ${fmtFull(discrepancy[0].iiko)} ₼ для ${discrepancy[0].label}. Но одна только карточная выручка — ${fmtFull(discrepancy[0].card)} ₼, в ${discrepancy[0].ratio.toFixed(1)}× больше учтённой. Это указывает на неполный экспорт iiko.`
                  : `iiko books ${fmtFull(discrepancy[0].iiko)} ₼ for ${discrepancy[0].label}, but bank-confirmed card revenue alone is ${fmtFull(discrepancy[0].card)} ₼ — ${discrepancy[0].ratio.toFixed(1)}× the booked total. This points to an incomplete iiko export.`}
              </p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div style={{background:C.panel,borderRadius:10,padding:"12px 14px",border:`1px solid ${C.line}`}}>
                  <div style={{fontSize:11,color:C.sub,marginBottom:4}}>{t.booked}</div>
                  <div style={{fontFamily:SERIF,fontSize:18,color:C.ink}}>{fmtFull(discrepancy[0].iiko)} ₼</div>
                  <div style={{fontSize:12,color:C.sub,fontWeight:600,marginTop:2}}>{lang==="az"?"uçot gəliri":lang==="ru"?"учтённая выручка":"booked revenue"}</div>
                </div>
                <div style={{background:C.panel,borderRadius:10,padding:"12px 14px",border:`1px solid ${C.line}`}}>
                  <div style={{fontSize:11,color:C.sub,marginBottom:4}}>{t.cardImplied}</div>
                  <div style={{fontFamily:SERIF,fontSize:18,color:C.ink}}>{fmtFull(discrepancy[0].card)} ₼</div>
                  <div style={{fontSize:12,color:C.green,fontWeight:600,marginTop:2}}>{discrepancy[0].ratio.toFixed(1)}× {lang==="az"?"uçotdan":lang==="ru"?"учёта":"booked"}</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{background:"#EEF2EC",border:`1px solid #CBD8C6`,borderRadius:14,padding:"16px"}}>
              <strong style={{fontFamily:SERIF,fontSize:14,color:"#46603F"}}>
                {lang==="az"?"Bütün filiallar uyğunlaşır":lang==="ru"?"Все филиалы сходятся":"All branches reconcile"}
              </strong>
              <p style={{margin:"8px 0 0",fontSize:12.5,color:"#46603F",lineHeight:1.55}}>
                {lang==="az"
                  ? "Hər filialda kart gəliri uçot gəlirinə yaxındır (fərq normal komissiya həddindədir). P&L hökmləri etibarlıdır."
                  : lang==="ru"
                  ? "По каждому филиалу карточная выручка близка к учтённой (разница в пределах нормальной комиссии). Вердикты P&L надёжны."
                  : "Each branch's card revenue is close to its booked revenue (the gap is within the normal commission band). The P&L verdicts are reliable."}
              </p>
              <div style={{display:"grid",gap:6,marginTop:12}}>
                {reconRows.map(r=>(
                  <div key={r.key} style={{display:"flex",alignItems:"center",gap:10,fontSize:12}}>
                    <span style={{width:96,color:C.sub}}>{r.label}</span>
                    <span style={{color:C.ink}}>{fmtFull(r.card)} ₼ <span style={{color:C.sub}}>/ {fmtFull(r.iiko)} ₼</span></span>
                    <span style={{marginLeft:"auto",fontWeight:600,color:r.ratio!=null&&r.ratio>=1.15?C.clay:C.green}}>
                      {r.ratio!=null?`${r.ratio.toFixed(2)}×`:"—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* identity table (static reference) */}
          <div style={{background:C.panel,border:`1px solid ${C.line}`,borderRadius:14,padding:"18px 18px 14px"}}>
            <h3 style={h}>{t.idT}</h3>
            <p style={hint}>{t.idHint}</p>
            <div style={{overflowX:"auto"}}>
              <table style={{borderCollapse:"collapse",width:"100%",fontSize:11.5,minWidth:500}}>
                <thead>
                  <tr style={{borderBottom:`1.5px solid ${C.line}`,color:C.sub}}>
                    {[t.cLabel,t.cOutlet,t.cVoen,t.cDist,t.cTerm].map(hh=><th key={hh} style={{padding:"6px 8px",textAlign:"left"}}>{hh}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {RECON.IDENTITY.map((r,i)=>(
                    <tr key={i} style={{borderBottom:`1px solid ${C.line}`,background:r.br==="City Point"?"rgba(181,82,74,.05)":"transparent"}}>
                      <td style={{padding:"7px 8px",fontWeight:600,color:C.ink}}>{r.br}</td>
                      <td style={{padding:"7px 8px",color:C.caramel,fontWeight:600}}>{r.outlet}</td>
                      <td style={{padding:"7px 8px",color:C.sub,fontFamily:"monospace"}}>{r.voen}</td>
                      <td style={{padding:"7px 8px",color:C.ink}}>{r.dist}</td>
                      <td style={{padding:"7px 8px",color:C.sub,fontSize:10.5}}>{r.term}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* iiko P&L summary — LIVE from imported P&L when available */}
          <div style={{background:C.panel,border:`1px solid ${C.line}`,borderRadius:14,padding:"18px 18px 14px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <h3 style={h}>{t.plT}</h3>
              {liveIiko && <span style={{fontSize:10,fontWeight:600,color:C.green,background:"#EEF2EC",border:`1px solid #CBD8C6`,borderRadius:999,padding:"2px 8px"}}>{t.liveTag}</span>}
            </div>
            <div style={{overflowX:"auto",marginTop:10}}>
              <table style={{borderCollapse:"collapse",width:"100%",fontSize:12,minWidth:480}}>
                <thead>
                  <tr style={{borderBottom:`1.5px solid ${C.line}`,textAlign:"right",color:C.sub}}>
                    <th style={{padding:"6px 8px",textAlign:"left"}}></th>
                    {[t.cRev,t.cGm,t.cNm,t.cRent,t.cLabor,t.cMkt].map(x=><th key={x} style={{padding:"6px 8px"}}>{x}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(IIKO).map(([k,v],i)=>(
                    <tr key={i} style={{borderBottom:`1px solid ${C.line}`}}>
                      <td style={{padding:"8px",fontWeight:600,color:C.ink,whiteSpace:"nowrap"}}>{k}</td>
                      <td style={{padding:"8px",textAlign:"right"}}>{fmtFull(v.rev)}</td>
                      <td style={{padding:"8px",textAlign:"right"}}>{v.gm}%</td>
                      <td style={{padding:"8px",textAlign:"right",color:v.nm>=0?C.green:C.clay,fontWeight:600}}>{v.nm>0?"+":""}{v.nm}%</td>
                      <td style={{padding:"8px",textAlign:"right"}}>{v.rent}%</td>
                      <td style={{padding:"8px",textAlign:"right",color:v.labor>35?C.clay:C.ink}}>{v.labor}%</td>
                      <td style={{padding:"8px",textAlign:"right"}}>{v.mkt}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
