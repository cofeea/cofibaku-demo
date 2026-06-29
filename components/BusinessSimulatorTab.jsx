import React, { useState, useCallback, useMemo } from "react";
import { useData } from "@/lib/DataContext";
import {
  BRANCH_CONTEXT,
  AZ_CALENDAR_2026,
  eventsForMonth,
} from "@/lib/businessContext";

const C = {
  bg:"#F6F2E9", panel:"#FBF8F1", ink:"#2A251E", sub:"#6E6457",
  line:"#E3DBCB", caramel:"#BE7A3C", green:"#6E8C6A", clay:"#B5524A",
  gold:"#CDA04B", slate:"#7C8AA0", cream:"#EDE8DC",
};
const SERIF = "var(--brand-serif, Georgia), Georgia, serif";
const SANS  = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const fmt = n => Math.round(Math.abs(n)).toLocaleString("en-US").replace(/,/g, " ");

const MN3 = {
  az:["Yan","Fev","Mar","Apr","May","İyn","İyl","Avq","Sen","Okt","Noy","Dek"],
  ru:["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"],
  en:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
};

const TO_CA  = { İçərişəhər:"İçərişəhər", "Binəqədi":"Binəqədi", Binəqədi:"Binəqədi", "Nizami":"Nizami" };
const TO_POS = { İçərişəhər:"İçərişəhər", "Binəqədi":"Binəqədi", Binəqədi:"Binəqədi", "Nizami":"Nizami" };
const TO_CTX = { İçərişəhər:"İçərişəhər", Binəqədi:"Binəqədi", "Binəqədi":"Binəqədi", "Nizami":"Nizami", all:"İçərişəhər" };

const AVG_WD = 20.08; // AZ national average working days/month

// ── Helpers ──────────────────────────────────────────────────────────────────
function getBase(ca, br) {
  if (!ca?.hasData) return null;
  if (br === "all") return ca.network;
  return ca.byBranch?.[TO_CA[br]]?._base || null;
}
function getAvgTk(ca, dash, br) {
  if (br === "all") {
    if (dash?.hasData) {
      let rev=0, txn=0;
      for (const ctx of Object.values(TO_POS)) { const p=dash.pos?.[ctx]; if(p){rev+=p.totalRevenue||0;txn+=p.totalTxns||0;} }
      return txn>0 ? Math.round(rev/txn*100)/100 : 11;
    }
    return 11;
  }
  if (dash?.hasData) return dash.pos?.[TO_POS[br]]?.avgTicket || 11;
  return ca?.byBranch?.[TO_CA[br]]?._base?.avgTicket || 11;
}

// ── Monthly predictive forecast ───────────────────────────────────────────────
// Takes the 6-month net result and distributes it across upcoming months,
// adjusting for working days, events, and tourist influx per branch.
function buildForecast(net6mo, branchId, lang) {
  const monthlyBase = net6mo / 6;
  const ctxName = TO_CTX[branchId] || "İçərişəhər";
  const ctx = BRANCH_CONTEXT[ctxName] || {};
  const calSens  = ctx.calendarSensitivity || "all_days";
  const evtSens  = ctx.eventSensitivity    || "low";
  const now      = new Date();

  return [0, 1, 2, 3].map(off => {
    const d   = new Date(now.getFullYear(), now.getMonth() + off, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    const mn  = (MN3[lang]||MN3.en)[d.getMonth()];
    const label = `${mn} ${d.getFullYear()}`;
    const cal = AZ_CALENDAR_2026[key] || {};
    const wd  = cal.workDays || 20;
    const holidays = cal.holidays || [];

    // Working-day multiplier
    let wdMult = 1.0;
    if (calSens === "working_days") {
      wdMult = wd / AVG_WD;            // Binəqədi: full proportional
    } else {
      wdMult = 1 + (wd - AVG_WD) / AVG_WD * 0.28; // others: partial
    }

    // Event multiplier (from businessContext BAKU_EVENTS)
    const monthEvts = eventsForMonth(key);
    let evtMult = 1.0;
    const evtTags = [];

    for (const evt of monthEvts) {
      const boost = evtSens==="high"?0.18 : evtSens==="medium"?0.10 : evtSens==="low_to_medium"?0.05 : 0.02;
      evtMult += boost;
      if (evt.name.includes("Formula 1")) evtTags.push({ icon:"🏎️", label:lang==="az"?"F1 GP":lang==="ru"?"Ф1 ГП":"F1 GP", boost });
      else if (evt.name.includes("Volleyball")) evtTags.push({ icon:"🏐", label:lang==="az"?"Voleybol":lang==="ru"?"Волейбол":"Volleyball", boost });
      else evtTags.push({ icon:"📅", label:evt.name.slice(0,10), boost });
    }

    // F1 September special: if event not yet in this month's eventsForMonth
    // (e.g. because businessContext only shows upcoming), still apply for Zarifa
    if (key==="2026-09" && (evtSens==="high") && !evtTags.find(t=>t.icon==="🏎️")) {
      evtMult += 0.22;
      evtTags.push({ icon:"🏎️", label:lang==="az"?"F1 GP (Sen)":lang==="ru"?"Ф1 (Сен)":"F1 GP (Sep)", boost:0.22 });
    }

    // Holiday drag for working-day-sensitive branches
    const holidayDrag = (calSens==="working_days" && holidays.length>0)
      ? -(holidays.length * 0.03)
      : 0;
    evtMult = Math.max(0.5, evtMult + holidayDrag);

    const adjusted = Math.round(monthlyBase * wdMult * evtMult);
    const wdDelta  = Math.round((wd / AVG_WD - 1) * 100);

    return { key, label, wd, holidays, adjusted, wdMult, evtMult, evtTags, wdDelta, isNow:off===0 };
  });
}

// ── Scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = {
  cashback: {
    label:{ az:"Loyallıq kartı — cashback", ru:"Карта лояльности — кэшбэк", en:"Loyalty card — cashback" },
    sliders:[
      { id:"cashback",   label:{ az:"Cashback faizi (%)",               ru:"Процент кэшбэка (%)",          en:"Cashback rate (%)"              }, min:0.5, max:5,   val:2,   step:0.5, unit:"%" },
      { id:"adoption",   label:{ az:"Kart qəbul nisbəti (% müştəri)",   ru:"Принятие карты (% клиентов)", en:"Card adoption (% of customers)" }, min:5,   max:70,  val:25,  unit:"%" },
      { id:"visitLift",  label:{ az:"Kart sahibinin əlavə aylıq ziyarəti", ru:"Доп. визиты держателя/мес",en:"Extra monthly visits per cardholder" }, min:0.2, max:3, val:0.5, step:0.1, unit:"x" },
      { id:"opCost",     label:{ az:"Aylıq proqram xərci (₼)",          ru:"Ежемесячные расходы (₼)",      en:"Monthly program cost (₼)"       }, min:0,   max:600, val:150, unit:"₼" },
    ],
    calc(p, br, base, avgTk) {
      const totalCusts = base?.totalCusts || 8000;
      const totalTxns  = base?.totalTxns  || 10000;
      const tk         = avgTk || 11;
      const adopted    = Math.round(totalCusts * (p.adoption/100));
      const addVisits  = adopted * p.visitLift;
      const addRev     = addVisits * tk;
      // Effective cashback cost: only ~60% return to redeem (rest expires)
      const cashbackCost = (totalTxns * tk * (p.adoption/100)) * (p.cashback/100) * 0.60;
      const fixedCost    = p.opCost * 6;
      const net = addRev * 0.70 - cashbackCost - fixedCost;
      return {
        rev:     Math.round(addRev),
        cost:    Math.round(cashbackCost + fixedCost),
        net:     Math.round(net),
        roi:     (cashbackCost+fixedCost)>0 ? Math.round(net/(cashbackCost+fixedCost)*100) : 999,
        extra:   Math.round(addVisits),
        adopted,
      };
    },
    aiContext(p, br, r, lang) {
      return `Scenario: loyalty card cashback, branch: ${br}. Cashback: ${p.cashback}%, adoption: ${p.adoption}%, extra visits/cardholder/mo: ${p.visitLift}, monthly cost: ₼${p.opCost}. ${r.adopted} cardholders, ${r.extra} extra visits. +₼${fmt(r.rev)} revenue, ₼${fmt(r.cost)} cost, ${r.net>=0?"+":""}₼${fmt(r.net)} net, ${r.roi}% ROI. Effective cashback rate accounts for 60% redemption. Global benchmark: cashback loyalty programs increase visit frequency 20–40%.`;
    },
  },
  loyalty:{
    label:{ az:"Loyallıq stamp kartı", ru:"Карта лояльности (штамп)", en:"Loyalty stamp card" },
    sliders:[
      { id:"conv",     label:{ az:"Konversiya nisbəti (bir-dəfəliklərin %)",ru:"Конверсия (% разовых)",       en:"Conversion rate (% of one-timers)" }, min:2,max:30,val:10,unit:"%" },
      { id:"extra",    label:{ az:"Əlavə ziyarət sayı",                     ru:"Доп. визиты",                 en:"Extra visits per converted customer" }, min:1,max:5,val:2,unit:"x" },
      { id:"freecost", label:{ az:"Hədiyyə içkinin maya dəyəri (₼)",        ru:"Себестоимость напитка (₼)",   en:"Free drink cost price (₼)" }, min:1,max:5,val:2,unit:"₼" },
    ],
    calc(p, br, base, avgTk) {
      const n   = base?.oneTimeCount || (br==="all"?17143:br==="İçərişəhər"?7345:br==="Binəqədi"?4124:br==="Nizami"?2000:5674);
      const tk  = avgTk             || (br==="İçərişəhər"?12.18:br==="Binəqədi"?11.63:br==="Nizami"?13.37:10.04);
      const rev = n*(p.conv/100)*p.extra*tk;
      const cost= n*(p.conv/100)*(tk/5)*p.freecost+80*6;
      const net = rev*0.70-cost;
      return { rev:Math.round(rev), cost:Math.round(cost), net:Math.round(net), roi:cost>0?Math.round(net/cost*100):999, extra:Math.round(n*(p.conv/100)) };
    },
    aiContext(p,br,r,lang){ return `Scenario: loyalty stamp card, branch: ${br}, conversion: ${p.conv}%, extra visits: ${p.extra}, free item cost: ₼${p.freecost}. Result: +₼${fmt(r.rev)} revenue, ₼${fmt(r.cost)} cost, ₼${fmt(r.net)} net, ${r.roi}% ROI. Global benchmark: well-run loyalty programs average 5.2× program cost in returns.`; },
  },
  upsell:{
    label:{ az:"Upsell — ölçü + əlavə", ru:"Апсейл — размер и дополнения", en:"Upsell — size & add-ons" },
    sliders:[
      { id:"rate",     label:{ az:"Kassir upsell nisbəti (%)",ru:"Успешный апсейл (%)",  en:"Cashier upsell success rate (%)" }, min:5,max:50,val:20,unit:"%" },
      { id:"amount",   label:{ az:"Orta upsell məbləği (₼)", ru:"Средняя сумма (₼)",    en:"Average upsell amount (₼)" }, min:0.5,max:3,val:1.37,step:0.1,unit:"₼" },
      { id:"training", label:{ az:"Training xərci (₼)",      ru:"Стоимость обучения (₼)",en:"Training cost (₼)" }, min:0,max:500,val:200,unit:"₼" },
    ],
    calc(p, br, base) {
      const txns = base?.totalTxns||(br==="all"?22554:br==="İçərişəhər"?25594:br==="Binəqədi"?11505:br==="Nizami"?9000:11119);
      const rev  = txns*(p.rate/100)*p.amount;
      const net  = rev*0.70-p.training;
      return { rev:Math.round(rev), cost:p.training, net:Math.round(net), roi:p.training>0?Math.round(net/p.training*100):999, extra:Math.round(txns*(p.rate/100)) };
    },
    aiContext(p,br,r,lang){ return `Scenario: upsell, branch: ${br}, rate: ${p.rate}%, amount: ₼${p.amount}, training: ₼${p.training}. Result: ₼${fmt(r.rev)} revenue, ₼${fmt(r.net)} net. McDonald's kiosk upsell lifted avg ticket 30%.`; },
  },
  atrisk:{
    label:{ az:"At-Risk reaktivasiyası", ru:"Реактивация At-Risk клиентов", en:"At-Risk reactivation" },
    sliders:[
      { id:"reactivation",label:{ az:"Reaktivasiya nisbəti (%)",ru:"Реактивация (%)",en:"Reactivation rate (%)" }, min:3,max:30,val:15,unit:"%" },
      { id:"extraVisits", label:{ az:"Qayıdan müştərinin əlavə ziyarəti",ru:"Доп. визиты",en:"Extra visits per reactivated" }, min:1,max:4,val:2,unit:"x" },
      { id:"msgCost",     label:{ az:"Kampaniya xərci (₼)",ru:"Стоимость кампании (₼)",en:"Campaign cost (₼)" }, min:0,max:500,val:50,unit:"₼" },
    ],
    calc(p, br, base, avgTk) {
      const at = base?.atRiskCount||(br==="all"?3387:br==="İçərişəhər"?1805:br==="Binəqədi"?754:br==="Nizami"?400:828);
      const tk = avgTk||(br==="İçərişəhər"?12.18:br==="Binəqədi"?11.63:br==="Nizami"?13.37:10.04);
      const rev = at*(p.reactivation/100)*p.extraVisits*tk;
      const net = rev*0.70-p.msgCost;
      return { rev:Math.round(rev), cost:p.msgCost, net:Math.round(net), roi:p.msgCost>0?Math.round(net/p.msgCost*100):999, extra:Math.round(at*(p.reactivation/100)), atrisk:at };
    },
    aiContext(p,br,r,lang){ return `Scenario: at-risk reactivation, branch: ${br}. At-risk: ${r.atrisk}. Reactivation: ${p.reactivation}%, extra visits: ${p.extraVisits}, campaign: ₼${p.msgCost}. ${r.extra} return, ₼${fmt(r.rev)} revenue, ₼${fmt(r.net)} net. 15–20% reactivation; 5–7× cheaper than new acquisition.`; },
  },
  vip:{
    label:{ az:"VIP müştəri qorunması", ru:"Защита VIP-клиентов", en:"VIP customer protection" },
    sliders:[
      { id:"churnRedux",label:{ az:"VIP churn azalması (%)",ru:"Снижение оттока VIP (%)",en:"VIP churn reduction (%)" }, min:2,max:20,val:10,unit:"%" },
      { id:"spendLift", label:{ az:"Aylıq tanınma xərci (₼)",ru:"Ежемесячные расходы (₼)",en:"Monthly recognition cost (₼)" }, min:0,max:300,val:20,unit:"₼" },
    ],
    calc(p, br, base) {
      const vipRev = base?.vipRev||71669;
      const saved  = vipRev*(p.churnRedux/100);
      const cost   = p.spendLift*6;
      const net    = saved-cost;
      return { rev:Math.round(saved), cost:Math.round(cost), net:Math.round(net), roi:cost>0?Math.round(net/cost*100):999, extra:base?.vipCount||596 };
    },
    aiContext(p,br,r,lang){ return `Scenario: VIP protection, branch: ${br}. ${r.extra} VIP cards. Churn reduction: ${p.churnRedux}%, monthly cost: ₼${p.spendLift}. Protected: ₼${fmt(r.rev)}, net: ₼${fmt(r.net)}. VIP recognition lifts retention 25–40%.`; },
  },
  daypart:{
    label:{ az:"Zəif saat aktivləşdirməsi", ru:"Активизация тихих часов", en:"Slow daypart activation" },
    sliders:[
      { id:"trafficLift",label:{ az:"Zəif saatda trafik artımı (%)",ru:"Прирост трафика (%)",en:"Traffic lift in slow hours (%)" }, min:5,max:50,val:20,unit:"%" },
      { id:"promoCost",  label:{ az:"Promosyon xərci (₼/ay)",ru:"Промо (₼/мес)",en:"Promotion cost (₼/month)" }, min:0,max:400,val:100,unit:"₼" },
    ],
    calc(p, br, base, avgTk) {
      const txns = base ? Math.round((base.totalTxns||0)*0.15) : (br==="all"?1914:br==="Binəqədi"?1244:br==="Nizami"?800:670);
      const tk   = avgTk||(br==="Binəqədi"?11.63:br==="Nizami"?13.37:10.04);
      const rev  = txns*(p.trafficLift/100)*tk;
      const cost = p.promoCost*6;
      const net  = rev*0.70-cost;
      return { rev:Math.round(rev), cost:Math.round(cost), net:Math.round(net), roi:cost>0?Math.round(net/cost*100):999, extra:Math.round(txns*(p.trafficLift/100)) };
    },
    aiContext(p,br,r,lang){ return `Scenario: slow daypart activation, branch: ${br}. Traffic lift: ${p.trafficLift}%, promo: ₼${p.promoCost}/mo. ${r.extra} extra txns, ₼${fmt(r.rev)} revenue, ₼${fmt(r.net)} net.`; },
  },
};

// ── Translations ──────────────────────────────────────────────────────────────
const T = {
  az:{
    title:"Biznes Simulatoru",
    sub:"Real POS datası · Cashback modelləşdirilməsi · Mövsüm & Tədbirlər Proqnozu",
    selectScenario:"Ssenari", selectBranch:"Filial", allBranches:"Hamısı",
    rev:"Əlavə gəlir", cost:"Xərc", net:"Xalis qazanc", roi:"ROI",
    scenarios:"3-ssenari analizi", pess:"Pessimist", base:"Baza", opt:"Optimist",
    aiTitle:"AI biznes keysi", aiHint:"Slaydırları tənizlə, sonra AI analizini al",
    aiBtn:"AI analizi al", aiLoading:"Hazırlanır...",
    grossNote:"Brüt marja 70% nəzərə alınıb · Net = Gəlir × 0.70 − Xərc",
    liveTag:"● idxal datası",
    forecastTitle:"Mövsüm & Tədbirlər Proqnozu — növbəti 4 ay",
    forecastNote:"Iş günü, turist axını və Bakı tədbirləri əsasında tənzimlənmiş",
    forecastTotal:"4 ay cəmi",
    wdLabel:"iş günü",
    flatLabel:"Düz",
    adopted:"Kart sahibi",
    extraVisits:"Əlavə ziyarət",
    cashbackNew:"YENİ",
  },
  ru:{
    title:"Бизнес-симулятор",
    sub:"Реальные POS-данные · Моделирование кэшбэка · Прогноз по сезону и событиям",
    selectScenario:"Сценарий", selectBranch:"Филиал", allBranches:"Все",
    rev:"Доп. выручка", cost:"Затраты", net:"Чистая прибыль", roi:"ROI",
    scenarios:"Анализ 3 сценариев", pess:"Пессимист", base:"Базовый", opt:"Оптимист",
    aiTitle:"AI бизнес-кейс", aiHint:"Настрой параметры, затем AI-анализ",
    aiBtn:"Получить AI-анализ", aiLoading:"Формируется...",
    grossNote:"Валовая маржа 70% · Чистая = Выручка × 0,70 − Затраты",
    liveTag:"● импорт",
    forecastTitle:"Прогноз по сезону и событиям — следующие 4 месяца",
    forecastNote:"Скорректировано по рабочим дням, туристическому потоку и событиям Баку",
    forecastTotal:"Итого 4 мес.",
    wdLabel:"раб. дней",
    flatLabel:"Ровно",
    adopted:"Держателей карт",
    extraVisits:"Доп. визиты",
    cashbackNew:"НОВЫЙ",
  },
  en:{
    title:"Business Simulator",
    sub:"Real POS data · Cashback modelling · Season & Events Forecast",
    selectScenario:"Scenario", selectBranch:"Branch", allBranches:"All",
    rev:"Extra revenue", cost:"Cost", net:"Net profit", roi:"ROI",
    scenarios:"3-scenario analysis", pess:"Pessimist", base:"Base", opt:"Optimist",
    aiTitle:"AI business case", aiHint:"Adjust sliders, then get AI analysis",
    aiBtn:"Get AI analysis", aiLoading:"Generating...",
    grossNote:"70% gross margin · Net = Revenue × 0.70 − Cost",
    liveTag:"● imported",
    forecastTitle:"Season & Events Forecast — next 4 months",
    forecastNote:"Adjusted for working days, tourist influx and Baku events",
    forecastTotal:"4-month total",
    wdLabel:"working days",
    flatLabel:"Flat",
    adopted:"Cardholders",
    extraVisits:"Extra visits",
    cashbackNew:"NEW",
  },
};

const brLabel = (b) => b==="İçərişəhər"?"İçərişəhər":b;

// ── Component ─────────────────────────────────────────────────────────────────
export default function BusinessSimulatorTab({ lang = "az" }) {
  const { customerAnalytics, dashboardData } = useData();
  const ca   = customerAnalytics?.hasData ? customerAnalytics : null;
  const dash = dashboardData?.hasData ? dashboardData : null;

  const t = T[lang];
  const [scenario, setScenario] = useState("cashback");
  const [branch,   setBranch]   = useState("all");
  const [params,   setParams]   = useState(() => {
    const p = {}; SCENARIOS.cashback.sliders.forEach(s => { p[s.id]=s.val; }); return p;
  });
  const [aiText,    setAiText]    = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const sc = SCENARIOS[scenario];
  const updateParam = useCallback((id, val) => setParams(prev => ({ ...prev, [id]:val })), []);

  const handleScenarioChange = (s) => {
    setScenario(s);
    const p={}; SCENARIOS[s].sliders.forEach(sl=>{ p[sl.id]=sl.val; }); setParams(p); setAiText("");
  };

  const branchIds = ca
    ? ["İçərişəhər","Binəqədi","Nizami","Binəqədi"].filter(br => ca.byBranch?.[TO_CA[br]])
    : ["İçərişəhər","Binəqədi","Binəqədi"];

  const liveBase = getBase(ca, branch);
  const liveAvgTk = getAvgTk(ca, dash, branch);

  // Base result + 3-scenario
  const result     = sc.calc(params, branch, liveBase, liveAvgTk);
  const pessParams = {}; const optParams = {};
  sc.sliders.forEach(s => {
    if (["training","msgCost","promoCost","spendLift","opCost"].includes(s.id)){
      pessParams[s.id]=params[s.id]*1.3; optParams[s.id]=params[s.id]*0.7;
    } else {
      pessParams[s.id]=Math.max(s.min, params[s.id]*0.5);
      optParams[s.id]=Math.min(s.max, params[s.id]*1.5);
    }
  });
  const pessResult = sc.calc(pessParams, branch, liveBase, liveAvgTk);
  const optResult  = sc.calc(optParams,  branch, liveBase, liveAvgTk);
  const maxRev = Math.max(optResult.rev, 1);

  // Predictive forecast (recalculates when result.net or branch changes)
  const forecast = useMemo(
    () => buildForecast(result.net, branch, lang),
    [result.net, branch, lang]
  );
  const forecastMax = Math.max(...forecast.map(m => Math.abs(m.adjusted)), 1);
  const forecastTotal = forecast.reduce((s,m) => s+m.adjusted, 0);

  const getAI = async () => {
    setAiLoading(true); setAiText("");
    const ctx = sc.aiContext(params, branch==="all"?t.allBranches:(branch==="İçərişəhər"?"İçərişəhər":branch), result, "en");
    const prompts = {
      az:`Kapi Coffee (Bakı) üçün biznes konsultantsan. Aşağıdakı simulasiyanı analiz et, 8-10 cümlə, Azərbaycanca, konkret rəqəmlərlə, riskləri də qeyd et.\n\n${ctx}`,
      ru:`Ты бизнес-консультант для Kapi Coffee (Баку). Проанализируй симуляцию, 8–10 предложений, по-русски, конкретные цифры и риски.\n\n${ctx}`,
      en:`You are a business consultant for Kapi Coffee (Baku). Analyse this simulation, 8–10 sentences in English, specific numbers, mention risks.\n\n${ctx}`,
    };
    try {
      const res = await fetch("/api/coach", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ messages:[{role:"user",content:prompts[lang]}], lang }),
      });
      const d = await res.json();
      setAiText(d.text || d.error || "Error.");
    } catch { setAiText(lang==="az"?"Bağlantı xətası.":lang==="ru"?"Ошибка.":"Connection error."); }
    setAiLoading(false);
  };

  const card = { background:C.panel, border:`1px solid ${C.line}`, borderRadius:14, padding:"16px 18px" };
  const netColor = result.net >= 0 ? C.green : C.clay;
  const scenarios3 = [
    { label:t.pess, r:pessResult, bg:"#FBEDEA", tc:C.clay },
    { label:t.base, r:result,     bg:"#EEF2EC", tc:C.green },
    { label:t.opt,  r:optResult,  bg:"#E8F4E8", tc:"#27500A" },
  ];

  return (
    <div style={{ background:C.bg, minHeight:"100%", padding:"22px 18px 40px", fontFamily:SANS, color:C.ink, fontVariantNumeric:"tabular-nums" }}>

      {/* ── Header ── */}
      <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:4 }}>
        <h1 style={{ fontFamily:SERIF, fontSize:25, fontWeight:600, margin:0 }}>{t.title}</h1>
        {ca && <span style={{ fontSize:10.5, fontWeight:600, color:C.green, background:"#EEF2EC", border:`1px solid #CBD8C6`, borderRadius:999, padding:"3px 9px" }}>{t.liveTag}</span>}
      </div>
      <p style={{ color:C.sub, fontSize:12.5, margin:"0 0 20px", lineHeight:1.5 }}>{t.sub}</p>

      {/* ── Scenario + branch selectors ── */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:12, marginBottom:14 }}>
        <div>
          <div style={{ fontSize:11.5, color:C.sub, marginBottom:5 }}>{t.selectScenario}</div>
          <select value={scenario} onChange={e=>handleScenarioChange(e.target.value)}
            style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:`1px solid ${C.line}`, background:C.panel, color:C.ink, fontSize:13 }}>
            {Object.entries(SCENARIOS).map(([k,v]) => (
              <option key={k} value={k}>
                {k==="cashback" ? `★ ${v.label[lang]}` : v.label[lang]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ fontSize:11.5, color:C.sub, marginBottom:5 }}>{t.selectBranch}</div>
          <select value={branch} onChange={e=>{setBranch(e.target.value);setAiText("");}}
            style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:`1px solid ${C.line}`, background:C.panel, color:C.ink, fontSize:13 }}>
            <option value="all">{t.allBranches}</option>
            {branchIds.map(b=><option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      {/* Cashback highlight badge */}
      {scenario==="cashback" && (
        <div style={{ background:`${C.gold}18`, border:`1px solid ${C.gold}50`, borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:12, color:C.ink, lineHeight:1.55 }}>
          <strong style={{ color:C.gold }}>★ {lang==="az"?"Yeni ssenari — Cashback Proqramı":lang==="ru"?"Новый сценарий — программа кэшбэка":"New scenario — Cashback Program"}</strong>
          <span style={{ color:C.sub, marginLeft:8 }}>
            {lang==="az"?"Kapi Coffee-nin loyallıq kartından maksimum faydalanmaq üçün optimal cashback faizini tapın.":
             lang==="ru"?"Найдите оптимальный % кэшбэка для Kapi Coffee.":
             "Find the optimal cashback rate to maximise returns from Kapi Coffee's loyalty card program."}
          </span>
        </div>
      )}

      {/* ── Sliders ── */}
      <div style={{ ...card, marginBottom:14 }}>
        {sc.sliders.map(s => (
          <div key={s.id} style={{ marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
              <span style={{ fontSize:12, color:C.sub, maxWidth:"78%", lineHeight:1.4 }}>{s.label[lang]}</span>
              <span style={{ fontSize:13, fontWeight:600, color:C.ink }}>
                {Number(params[s.id]).toFixed(s.step&&s.step<1?1:0)}{s.unit}
              </span>
            </div>
            <input type="range" min={s.min} max={s.max} step={s.step||1} value={params[s.id]}
              onChange={e=>updateParam(s.id,parseFloat(e.target.value))}
              style={{ width:"100%" }} />
          </div>
        ))}
        <div style={{ fontSize:11, color:C.sub, paddingTop:10, borderTop:`1px solid ${C.line}` }}>{t.grossNote}</div>
      </div>

      {/* ── KPI cards ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10, marginBottom:14 }}>
        {[
          [t.rev,  `₼${fmt(result.rev)}`,  C.caramel],
          [t.cost, `₼${fmt(result.cost)}`, C.sub    ],
          [t.net,  `${result.net>=0?"+":"−"}₼${fmt(result.net)}`, netColor],
          [t.roi,  result.roi>999?"∞":result.roi+"%", C.green],
        ].map(([label,val,color]) => (
          <div key={label} style={{ background:C.bg, borderRadius:10, padding:"12px 14px" }}>
            <div style={{ fontSize:11, color:C.sub, marginBottom:4 }}>{label}</div>
            <div style={{ fontFamily:SERIF, fontSize:21, fontWeight:600, color }}>{val}</div>
          </div>
        ))}
        {/* Cashback extra KPIs */}
        {scenario==="cashback" && result.adopted > 0 && (
          <>
            <div style={{ background:C.bg, borderRadius:10, padding:"12px 14px" }}>
              <div style={{ fontSize:11, color:C.sub, marginBottom:4 }}>{t.adopted}</div>
              <div style={{ fontFamily:SERIF, fontSize:21, fontWeight:600, color:C.caramel }}>{result.adopted.toLocaleString()}</div>
            </div>
            <div style={{ background:C.bg, borderRadius:10, padding:"12px 14px" }}>
              <div style={{ fontSize:11, color:C.sub, marginBottom:4 }}>{t.extraVisits}</div>
              <div style={{ fontFamily:SERIF, fontSize:21, fontWeight:600, color:C.slate }}>{fmt(result.extra)}</div>
            </div>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          PREDICTIVE FORECAST — Calendar + Events + Tourist Influx
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{ ...card, marginBottom:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
          <div style={{ fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:.5, color:C.sub }}>
            📅 {t.forecastTitle}
          </div>
          <div style={{ fontSize:10.5, color:C.sub }}>{t.forecastNote}</div>
        </div>
        <div style={{ fontSize:11, color:C.sub, marginBottom:14 }}>
          {lang==="az"?"Hər ay üçün: iş günü nisbəti × tədbir multiplikatoru × baza nəticəsi":
           lang==="ru"?"Для каждого месяца: коэф. раб. дней × событийный множитель × базовый результат":
           "Each month: working-day ratio × event multiplier × base result"}
        </div>

        {forecast.map((m, i) => {
          const pct = Math.round(Math.abs(m.adjusted) / forecastMax * 100);
          const isPos = m.adjusted >= 0;
          const wdIsHigh = m.wdDelta > 5;
          const wdIsLow  = m.wdDelta < -5;
          return (
            <div key={i} style={{ marginBottom:14 }}>
              {/* Month header */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:13, fontWeight:m.isNow?700:600, color:C.ink }}>
                    {m.label}
                    {m.isNow && <span style={{ fontSize:9, color:C.caramel, marginLeft:5 }}>●</span>}
                  </span>
                  {/* Event tags */}
                  {m.evtTags.map((tag, j) => (
                    <span key={j} style={{ fontSize:11, background:`${C.gold}22`, color:"#8B6200", padding:"2px 7px", borderRadius:999, fontWeight:600 }}>
                      {tag.icon} {tag.label} <span style={{ color:C.green }}>+{Math.round(tag.boost*100)}%</span>
                    </span>
                  ))}
                  {/* Working day annotation */}
                  {(wdIsHigh || wdIsLow) && (
                    <span style={{ fontSize:10, color:wdIsHigh?C.green:C.clay, background:wdIsHigh?"#EEF2EC":"#FBEDEA", padding:"2px 6px", borderRadius:999 }}>
                      {m.wd} {t.wdLabel} {wdIsHigh?`(+${m.wdDelta}%)`:`(${m.wdDelta}%)`}
                    </span>
                  )}
                  {/* Holiday warning */}
                  {m.holidays.length > 0 && (
                    <span style={{ fontSize:10, color:C.clay }}>
                      ⚠️ {m.holidays.slice(0,1).join(", ")}
                    </span>
                  )}
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:isPos?C.green:C.clay, flexShrink:0 }}>
                  {isPos?"+":"−"}₼{fmt(m.adjusted)}
                </div>
              </div>

              {/* Bar */}
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ flex:1, height:9, background:C.line, borderRadius:5 }}>
                  <div style={{
                    height:9, width:`${Math.max(3,pct)}%`,
                    background: isPos ? C.green : C.clay,
                    borderRadius:5, transition:"width .4s",
                    opacity: m.isNow ? 1 : 0.7,
                  }} />
                </div>
                {/* Vs flat label */}
                <div style={{ fontSize:10, color:C.sub, width:54, textAlign:"right" }}>
                  {m.wdMult !== 1 || m.evtMult !== 1 ? (
                    <span style={{ color:m.adjusted>=(result.net/6)?C.green:C.sub }}>
                      {m.evtMult>1 ? `×${m.evtMult.toFixed(2)}` : `${Math.round(m.wdMult*100)}%`}
                    </span>
                  ) : t.flatLabel}
                </div>
              </div>
            </div>
          );
        })}

        {/* Total row */}
        <div style={{ borderTop:`1px solid ${C.line}`, paddingTop:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:11, color:C.sub }}>{t.forecastTotal}</div>
            <div style={{ fontSize:11, color:C.sub, marginTop:2 }}>
              {lang==="az"?"Düz proqnozla müqayisə:":lang==="ru"?"Vs. без корректировки:":"Vs. unadjusted forecast:"}
              <span style={{ marginLeft:6, color:C.sub }}>₼{fmt(Math.abs(result.net*4/6))}</span>
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontFamily:SERIF, fontSize:22, fontWeight:600, color:forecastTotal>=0?C.green:C.clay }}>
              {forecastTotal>=0?"+":"−"}₼{fmt(forecastTotal)}
            </div>
            {forecastTotal !== 0 && result.net !== 0 && (
              <div style={{ fontSize:10, color:C.sub, marginTop:2 }}>
                {lang==="az"?"mövsüm tənzimlənmiş":lang==="ru"?"с сезонной поправкой":"season-adjusted"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 3-Scenario analysis ── */}
      <div style={{ ...card, marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:600, color:C.sub, textTransform:"uppercase", letterSpacing:.5, marginBottom:12 }}>{t.scenarios}</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
          {scenarios3.map(({label,r,bg,tc}) => (
            <div key={label} style={{ background:bg, borderRadius:9, padding:"10px 12px", textAlign:"center" }}>
              <div style={{ fontSize:11, color:tc, marginBottom:3 }}>{label}</div>
              <div style={{ fontFamily:SERIF, fontSize:19, fontWeight:600, color:tc }}>{r.net>=0?"+":"−"}₼{fmt(r.net)}</div>
            </div>
          ))}
        </div>
        {scenarios3.map(({label,r,tc},i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
            <div style={{ fontSize:11, color:C.sub, width:66 }}>{label}</div>
            <div style={{ flex:1, height:7, background:C.line, borderRadius:4 }}>
              <div style={{ height:7, width:`${Math.round(r.rev/maxRev*100)}%`, background:tc, borderRadius:4, transition:"width .4s" }} />
            </div>
            <div style={{ fontSize:12, fontWeight:600, color:tc, width:68, textAlign:"right" }}>₼{fmt(r.rev)}</div>
          </div>
        ))}
      </div>

      {/* ── AI business case ── */}
      <div style={card}>
        <div style={{ fontSize:12, fontWeight:600, color:C.sub, textTransform:"uppercase", letterSpacing:.5, marginBottom:10 }}>{t.aiTitle}</div>
        <div style={{ background:"#F0EDF8", border:`1px solid #C4BAE8`, borderRadius:10, padding:14, fontSize:13, lineHeight:1.65, color:"#3A2E6A", minHeight:72, marginBottom:12, fontStyle:aiText?"normal":"italic", whiteSpace:"pre-wrap" }}>
          {aiLoading ? t.aiLoading : aiText || t.aiHint}
        </div>
        <button onClick={getAI} disabled={aiLoading}
          style={{ background:aiLoading?C.line:C.ink, color:aiLoading?C.sub:"#fff", border:"none", borderRadius:9, padding:"10px 20px", fontSize:13, fontWeight:600, cursor:aiLoading?"not-allowed":"pointer" }}>
          {aiLoading ? t.aiLoading : t.aiBtn}
        </button>
      </div>
    </div>
  );
}
