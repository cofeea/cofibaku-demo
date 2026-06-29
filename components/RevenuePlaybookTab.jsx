import React, { useState, useEffect } from "react";
import { useData } from "@/lib/DataContext";
import {
  BRANCH_CONTEXT,
  AZ_CALENDAR_2026,
  upcomingEvents,
  workDaysForKey,
} from "@/lib/businessContext";

const C = {
  bg: "#F6F2E9", panel: "#FBF8F1", ink: "#2A251E", sub: "#6E6457",
  line: "#E3DBCB", caramel: "#BE7A3C", green: "#6E8C6A", clay: "#B5524A",
  gold: "#CDA04B", slate: "#7C8AA0", cream: "#EDE8DC",
};
const SERIF = "var(--brand-serif, Georgia), Georgia, serif";
const SANS  = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const fmt = n => Math.round(n).toLocaleString("en-US").replace(/,/g, " ");

// ── Seasonal intelligence ────────────────────────────────────────────────────
const WMO_ICON = {
  0:"☀️",1:"🌤️",2:"⛅",3:"☁️",45:"🌫️",48:"🌫️",
  51:"🌦️",53:"🌧️",55:"🌧️",61:"🌧️",63:"🌧️",65:"🌧️",
  71:"❄️",73:"❄️",75:"❄️",80:"🌦️",81:"🌦️",82:"⛈️",
  95:"⛈️",96:"⛈️",99:"⛈️",
};

const SENS_CFG = {
  high:          { level:4, az:"Çox güclü", ru:"Очень сильный", en:"Very high"  },
  medium:        { level:3, az:"Orta",      ru:"Средний",       en:"Medium"     },
  low_to_medium: { level:2, az:"Zəif-Orta", ru:"Умеренный",     en:"Moderate"   },
  low:           { level:1, az:"Minimal",   ru:"Минимально",    en:"Minimal"    },
};

const EVENT_EST = {
  "Formula 1 Azerbaijan Grand Prix": {
    "İçərişəhər": { min:10000, max:25000 },
    "Nizami":  { min:3000,  max:8000  },
    "Binəqədi":           { min:2000,  max:5000  },
    "Binəqədi":    { min:0,     max:400   },
  },
  "Women's European Volleyball Championship (Baku co-hosts)": {
    "İçərişəhər": { min:6000,  max:14000 },
    "Nizami":  { min:2000,  max:5000  },
    "Binəqədi":           { min:1500,  max:4000  },
    "Binəqədi":    { min:0,     max:300   },
  },
};

const BSHORT = {
  "İçərişəhər":"İçərişəhər", "Nizami":"Nizami",
  "Binəqədi":"C.Point",  "Binəqədi":"Binəqədi",
};

const MN3 = {
  az:["Yan","Fev","Mar","Apr","May","İyn","İyl","Avq","Sen","Okt","Noy","Dek"],
  ru:["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"],
  en:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
};

// ── Tab key → customerAnalytics key ──────────────────────────────────────────
const TO_CA = { İçərişəhər:"İçərişəhər", "Binəqədi":"Binəqədi", Binəqədi:"Binəqədi", "Nizami":"Nizami" };

function getBase(ca, br) {
  if (!ca?.hasData) return null;
  if (br === "all") return ca.network;
  return ca.byBranch?.[TO_CA[br]]?._base || null;
}

function getAvgTicket(dash, br) {
  if (!dash?.hasData) return null;
  const ctxMap = { İçərişəhər:"İçərişəhər", "Binəqədi":"Binəqədi", Binəqədi:"Binəqədi", "Nizami":"Nizami" };
  return dash.pos?.[ctxMap[br]]?.avgTicket || null;
}

function calcLiveRev(id, ca, dash, br) {
  const base = getBase(ca, br);
  if (!base) return null;
  const tk = getAvgTicket(dash, br) || base.avgTicket || 11;
  switch (id) {
    case "loyalty": {
      const n = base.oneTimeCount || 0;
      return Math.round((n*0.10*2*tk)*0.70 - n*0.10*(tk/5)*2 - 480);
    }
    case "upsell":
      return Math.round((base.totalTxns||0)*0.20*1.37*0.70 - 200);
    case "atrisk":
      return Math.round((base.atRiskCount||0)*0.15*2*tk*0.70 - 50);
    case "vip": {
      const vRev = br==="all" ? ca.network.vipRev : (ca.byBranch?.[TO_CA[br]]?._base?.vipRev||0);
      return Math.round(vRev*0.10 - 120);
    }
    case "daypart":
      return Math.round((base.totalTxns||0)*0.15*0.20*tk*0.70 - 600);
    case "crossbranch":
      return Math.round((base.totalCusts||0)*0.03*(tk*2.5)*0.70);
    default: return null;
  }
}

// ── Actions ───────────────────────────────────────────────────────────────────
const ACTIONS = [
  {
    id:"loyalty", rank:1,
    category:{ az:"Saxlama", ru:"Удержание", en:"Retention" },
    catColor:C.green,
    title:{ az:"Loyallıq möhür kartı", ru:"Карта лояльности", en:"Loyalty stamp card" },
    rev6mo_static:38879, difficulty:"easy", allBranches:true,
    dataInsight:{
      az:(live)=>live?`Şəbəkədə ${live.oneTimeCount?.toLocaleString()||"17,143"} bir-dəfəlik kart var. Yalnız 10%-ni 2 əlavə ziyarətə çevirməklə əhəmiyyətli gəlir əldə etmək mümkündür.`:"Şəbəkədə 17,143 bir-dəfəlik kart var. Bu müştərilər gəlib, amma bir daha qayıtmayıb. Onların yalnız 10%-nin 2 əlavə ziyarət etməsi ₼38,879 gəlir deməkdir.",
      ru:(live)=>live?`В сети ${live.oneTimeCount?.toLocaleString()||"17 143"} разовых карты. Конвертация лишь 10% в 2 доп. визита даст существенную выручку.`:"В сети 17 143 разовых карты.",
      en:(live)=>live?`The network has ${live.oneTimeCount?.toLocaleString()||"17,143"} one-time cards. Converting just 10% to 2 more visits generates significant incremental revenue.`:"The network has 17,143 one-time cards.",
    },
    action:{ az:"'5 al, 1 hədiyyə' stamp kartı tətbiq et. Kassada ödəniş anında karta keç.", ru:"Запусти карту '5 покупок — 6-я в подарок'. Вручай на кассе.", en:"Launch a '5 buy, 1 free' stamp card. Hand out at point of payment." },
    steps:{ az:["Kağız möhür kartı çap et","Kassir hər ödənişdə 1 möhür vurur","5-ci möhürdə içki hədiyyə","Aylıq: neçə kart geri gəldi?"], ru:["Напечатай карты","1 штамп за платёж","На 5-м — напиток","Ежемесячно: сколько вернулось?"], en:["Print paper stamp cards","Cashier stamps once per payment","Free drink on stamp #5","Monthly: how many cards returned?"] },
    benchmark:{ az:"Stamp kartla pul qazanan müştərilər həftəlik 20-30% daha çox xərc edir.", ru:"Держатели карт лояльности тратят на 20–30% больше.", en:"Loyalty card holders spend 20–30% more per week." },
  },
  {
    id:"upsell", rank:2,
    category:{ az:"Orta çek", ru:"Средний чек", en:"Avg ticket" },
    catColor:C.caramel,
    title:{ az:"Upsell — ölçü və əlavə", ru:"Апсейл — размер и дополнения", en:"Upsell — size & add-ons" },
    rev6mo_static:26138, difficulty:"easy", allBranches:true,
    dataInsight:{
      az:(live)=>live?`Bu filialda ${live.totalTxns?.toLocaleString()||"~10,000"} əməliyyat var. 20% upsell nisbəti ilə orta çeki ₼1.37 artırmaq mümkündür.`:"Binəqədi orta çeki ₼11.63 — Nizami-dan ₼1.74 az. Kassir hər əməliyyatda upsell etsə, +₼15,685 var.",
      ru:(live)=>live?`В филиале ${live.totalTxns?.toLocaleString()||"~10 000"} транзакций. При 20% апсейле средний чек вырастет на ₼1,37.`:"Binəqədi: чек ₼11,63 — на ₼1,74 ниже Nizami.",
      en:(live)=>live?`This branch has ${live.totalTxns?.toLocaleString()||"~10,000"} transactions. At 20% upsell rate, avg ticket grows ₼1.37.`:"Binəqədi avg ticket ₼11.63 — ₼1.74 below Nizami.",
    },
    action:{ az:"Kassir skripti: hər sifariş üçün 1 sual — ölçü yüksəltmə (₼1-2) və ya əlavə.", ru:"Скрипт: 1 вопрос — апгрейд размера (₼1–2) или дополнение.", en:"Cashier script: 1 question per order — size upgrade (₼1–2) or add-on." },
    steps:{ az:["2 skript sözü öyrət","İlk həftə upsell sayı","2-ci həftə ən yaxşı upseller-ə bonus","Aylıq: orta çek hədəfini yoxla"], ru:["Выучи 2 фразы","Считай апсейлы","Бонус лучшему","Следи за чеком"], en:["Learn 2 prompts","Track upsell count","Bonus for top upseller","Monthly: track avg ticket"] },
    benchmark:{ az:"McDonald's ekran upsell-i orta çeki 30% artırıb.", ru:"McDonald's киоски дали +30% к среднему чеку.", en:"McDonald's kiosk upsell lifted avg ticket 30%." },
  },
  {
    id:"atrisk", rank:3,
    category:{ az:"Reaktivasiya", ru:"Реактивация", en:"Reactivation" },
    catColor:C.clay,
    title:{ az:"At-Risk müştəri reaktivasiyası", ru:"Реактивация ушедших клиентов", en:"At-Risk customer reactivation" },
    rev6mo_static:11720, difficulty:"medium", allBranches:true,
    dataInsight:{
      az:(live)=>live?`${live.atRiskCount?.toLocaleString()||"3,387"} kart 2+ dəfə gəlib, amma 60+ gündür yoxdur. Bu müştərilər Cofiesto-nu tanıyır — yalnız bir siqnal lazımdır.`:"3,387 kart 2+ dəfə gəlib, 60+ gündür yoxdur.",
      ru:(live)=>live?`${live.atRiskCount?.toLocaleString()||"3 387"} карт приходили 2+ раз, но отсутствуют 60+ дней.`:"3 387 карт были 2+ раза, но 60+ дней отсутствуют.",
      en:(live)=>live?`${live.atRiskCount?.toLocaleString()||"3,387"} cards visited 2+ times but gone 60+ days. They know Cofiesto — just need a signal.`:"3,387 cards visited 2+ times but absent 60+ days.",
    },
    action:{ az:"WhatsApp/SMS: 'Sizi çox görmədik — bu həftə gəlin, əlavə içki hədiyyədir.'", ru:"WhatsApp/SMS: «Давно не видели — зайдите, доп. напиток в подарок».", en:"WhatsApp/SMS: 'We miss you — come this week, extra drink on us.'" },
    steps:{ az:["At-Risk kart siyahısını al","WhatsApp Business mesajı göndər","Hər karta yalnız 1 mesaj","2 həftə sonra: neçəsi gəldi?"], ru:["Получи список","Отправь WhatsApp","1 сообщение на карту","Через 2 нед: сколько вернулось?"], en:["Pull At-Risk card list","Send WhatsApp Business","Max 1 per card","2 weeks later: how many returned?"] },
    benchmark:{ az:"Hədəfli mesaj 15-20% reaktivasiya verir. Yeni müştəri cəlb etmək 5-7× baha.", ru:"Целевое сообщение даёт 15–20% реактивации. Привлечение нового в 5–7× дороже.", en:"Targeted messaging achieves 15–20% reactivation. Acquiring new costs 5–7× more." },
  },
  {
    id:"vip", rank:4,
    category:{ az:"VIP qorunması", ru:"Защита VIP", en:"VIP protection" },
    catColor:C.gold,
    title:{ az:"VIP müştəri qorunması", ru:"Защита VIP-клиентов", en:"VIP customer protection" },
    rev6mo_static:7167, difficulty:"easy", allBranches:true,
    dataInsight:{
      az:(live)=>live?`${live.vipCount?.toLocaleString()||"596"} VIP kart gəlirin böyük hissəsini daşıyır. 10% churn azalması əhəmiyyətli gəliri qoruyur.`:"Zarifa filialında 596 VIP kart (5.3%) gəlirin 23.3%-ni gətirir.",
      ru:(live)=>live?`${live.vipCount?.toLocaleString()||"596"} VIP-карт несут значительную долю выручки.`:"В Zarifa 596 VIP-карт (5,3%) дают 23,3% выручки.",
      en:(live)=>live?`${live.vipCount?.toLocaleString()||"596"} VIP cards carry a large share of revenue. A 10% churn reduction protects significant revenue.`:"Zarifa has 596 VIP cards (5.3%) generating 23.3% of revenue.",
    },
    action:{ az:"VIP kartları tanı. Kassir onları ad ilə salamlasın. Ayda bir 'teşekkür' mesajı.", ru:"Узнавай VIP-карты. Кассир здоровается по имени. Ежемесячное «спасибо».", en:"Recognise VIP cards. Cashier greets by name. Monthly 'thank you' message." },
    steps:{ az:["VIP kart siyahısı al","Kassir ekranına 'VIP' qeydi","Aylıq WhatsApp","Yeni məhsulda VIP-lərə əvvəl xəbər ver"], ru:["Список VIP-карт","Пометь «VIP» на кассе","Ежемесячный WhatsApp","VIP узнают о новинке первыми"], en:["Pull VIP card list","Flag 'VIP' on cashier screen","Monthly WhatsApp","VIPs get 24h advance notice"] },
    benchmark:{ az:"VIP tanınması müştəri saxlama nisbətini 25-40% artırır.", ru:"Признание VIP повышает удержание на 25–40%.", en:"VIP recognition lifts retention 25–40%." },
  },
  {
    id:"daypart", rank:5,
    category:{ az:"Trafik", ru:"Трафик", en:"Traffic" },
    catColor:C.slate,
    title:{ az:"Zəif saatları aktiv et", ru:"Активизация тихих часов", en:"Activate slow dayparts" },
    rev6mo_static:7523, difficulty:"easy", allBranches:true,
    dataInsight:{
      az:(live)=>live?`Bu filialda ${live.totalTxns?.toLocaleString()||"~8,000"} əməliyyat var. Zəif saatlarda 15% trafik artımı əlavə gəlir verəcək.`:"ADY-də günorta (11-15) bütün saatların yalnız 13.6%-i.",
      ru:(live)=>live?`В филиале ${live.totalTxns?.toLocaleString()||"~8 000"} транзакций. Рост трафика на 15% в тихие часы даст доп. выручку.`:"Binəqədi: обед (11–15) — 13,6% трафика.",
      en:(live)=>live?`This branch has ${live.totalTxns?.toLocaleString()||"~8,000"} transactions. A 15% traffic lift in slow hours adds meaningful revenue.`:"ADY midday (11–15) is 13.6% of traffic.",
    },
    action:{ az:"ADY günorta: 'Günorta Seti' ₼1 endirim. Binəqədi səhər: ilk 30 müştəriyə kiçik qəhvə hədiyyə.", ru:"Binəqədi: «Обеденный сет» −₼1. Binəqədi: первым 30 гостям с 08:00 кофе в подарок.", en:"ADY 11–15: 'Lunch set' ₼1 off. Binəqədi 08–10: free small coffee first 30 guests." },
    steps:{ az:["Kassada görünən lövhə as","İlk 2 həftə: set sayı","Kassir 08:00-da elan edir","Həftəlik xüsusi spesial"], ru:["Плакат у кассы","2 нед: сколько сетов","Объявление в 08:00","Еженедельный спецпредложение"], en:["Hang visible sign","First 2 weeks: count sets","08:00 announcement","Weekly rotating special"] },
    benchmark:{ az:"Zəif saat promosyonları həmin saatda 20-35% trafik artımı verir.", ru:"Промо в тихие часы +20–35% трафика.", en:"Off-peak promotions drive 20–35% traffic increase." },
  },
  {
    id:"crossbranch", rank:6,
    category:{ az:"Çox-filial", ru:"Мульти-точки", en:"Multi-branch" },
    catColor:"#8B7355",
    title:{ az:"Çox-filial loyallığı", ru:"Лояльность между точками", en:"Cross-branch loyalty" },
    rev6mo_static:3405, difficulty:"hard", allBranches:true,
    dataInsight:{
      az:(live)=>live?`Şəbəkədə ${live.totalCusts?.toLocaleString()||"~25,000"} unikal kart var. Çox-filial müştərilər adətən 3× daha çox xərc edir.`:"1,502 kart artıq 2+ filialda alış-veriş edir.",
      ru:(live)=>live?`В сети ${live.totalCusts?.toLocaleString()||"~25 000"} уникальных карт. Мульти-клиенты тратят в 3× больше.`:"1 502 карты уже в 2+ точках.",
      en:(live)=>live?`The network has ${live.totalCusts?.toLocaleString()||"~25,000"} unique cards. Multi-branch customers spend 3× more.`:"1,502 cards shop at 2+ branches.",
    },
    action:{ az:"Şəbəkə möhür kartı: istənilən filialda möhür vurulur. Kassada digər filiala qısa tanıtım.", ru:"Сетевая карта: штамп в любой точке. Кассир представляет другую точку.", en:"Network stamp card: stamps valid at any branch. Cashier briefly introduces another branch." },
    steps:{ az:["Stamp kartda şəbəkə bonusu bloku","Kassir digər filiala tanıtım edir","Aylıq çox-filial kart sayı","3 aydan sonra: neçə yeni?"], ru:["Добавь сетевой блок","Кассир представляет другую точку","Отслеживай мульти-карты","Через 3 мес: новые?"], en:["Add network bonus block","Cashier introduces other branch","Monthly: track multi-branch cards","After 3 months: new multi-cards?"] },
    benchmark:{ az:"Çox-filial loyallıq proqramı multi-branch ziyarətlərini 28% artırıb.", ru:"Программа лояльности для нескольких точек +28% кросс-визитов.", en:"Multi-location loyalty program grew cross-branch visits 28%." },
  },
];

const DIFF = {
  easy:   { az:"Asan",  ru:"Легко",   en:"Easy",   color:C.green  },
  medium: { az:"Orta",  ru:"Средне",  en:"Medium", color:C.gold   },
  hard:   { az:"Çətin", ru:"Сложно",  en:"Hard",   color:C.clay   },
};

const T = {
  az:{
    title:"Gəlir Playboku", sub:"İdxal edilmiş datadan çıxarılmış 6 addım · Beynəlxalq praktika ilə dəstəklənib",
    total:"6 aylıq potensial", filter:"Filial", all:"Hamısı",
    insight:"Datadan baxış", action:"Addım", howTo:"Necə", bench:"Dünyada necədir?",
    impact:"Gəlir (6ay)", dataNote:"Real POS datası əsasında hesablanmış (konservativ: 15% konversiya)", liveTag:"● idxal datası",
    seasonalTitle:"Mövsümi Fürsətlər & Gəlir Gözləntiləri",
    upcomingLabel:"Gələcək tədbirlər",
    weatherTitle:"Canlı hava — filial təsiri",
    calTitle:"İş günü təqvimi",
    daysLeft:"gün qalıb",
    workDays:"iş günü",
    actionsTitle:"Davamlı gəlir addımları",
    weatherLoad:"Hava məlumatı yüklənir...",
    noHolidays:"Bayram yoxdur",
    cpNote:"Binəqədi ofis mərkəzindədir — iş günü başına gəliri izləyin",
    nowLabel:"Bakı · indi",
  },
  ru:{
    title:"Книга роста", sub:"6 шагов из импортированных данных · Подкреплено мировой практикой",
    total:"Потенциал за 6 мес.", filter:"Филиал", all:"Все",
    insight:"Взгляд из данных", action:"Действие", howTo:"Как сделать", bench:"Мировая практика",
    impact:"Выручка (6 мес.)", dataNote:"Рассчитано по реальным POS-данным", liveTag:"● импорт",
    seasonalTitle:"Сезонные возможности и прогноз выручки",
    upcomingLabel:"Предстоящие события",
    weatherTitle:"Погода — влияние на филиалы",
    calTitle:"Рабочий календарь",
    daysLeft:"дней",
    workDays:"раб. дней",
    actionsTitle:"Постоянные инструменты роста",
    weatherLoad:"Загрузка погоды...",
    noHolidays:"Праздников нет",
    cpNote:"Binəqədi — в бизнес-центре. Следите за выручкой за рабочий день",
    nowLabel:"Баку · сейчас",
  },
  en:{
    title:"Revenue Playbook", sub:"6 actions derived from imported data · Validated against international benchmarks",
    total:"6-month potential", filter:"Branch", all:"All",
    insight:"Data insight", action:"Action", howTo:"How to", bench:"Global benchmark",
    impact:"Revenue (6mo)", dataNote:"Computed from real POS data (conservative: 15% conversion)", liveTag:"● imported",
    seasonalTitle:"Seasonal Opportunities & Revenue Outlook",
    upcomingLabel:"Upcoming events",
    weatherTitle:"Live weather — branch impact",
    calTitle:"Working day calendar",
    daysLeft:"days",
    workDays:"working days",
    actionsTitle:"Ongoing revenue actions",
    weatherLoad:"Loading weather...",
    noHolidays:"No holidays",
    cpNote:"Binəqədi is in a business centre — track revenue per working day",
    nowLabel:"Baku · now",
  },
};

const brLabel = (b) => b === "İçərişəhər" ? "İçərişəhər" : b;

export default function RevenuePlaybookTab({ lang = "az" }) {
  const { customerAnalytics, dashboardData } = useData();
  const ca   = customerAnalytics?.hasData ? customerAnalytics : null;
  const dash = dashboardData?.hasData ? dashboardData : null;

  const [filter,   setFilter]   = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [weather,  setWeather]  = useState(null);
  const t = T[lang];

  // Live weather (Open-Meteo, no API key)
  useEffect(() => {
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=40.4093&longitude=49.8671" +
      "&current=temperature_2m,weather_code" +
      "&daily=weather_code,temperature_2m_max,precipitation_probability_max" +
      "&timezone=Asia%2FBaku&forecast_days=4"
    )
      .then(r => r.json())
      .then(setWeather)
      .catch(() => {});
  }, []);

  // Upcoming events + 3-month calendar
  const today   = new Date().toISOString().slice(0, 10);
  const upcoming = upcomingEvents(today);

  const nowDate   = new Date();
  const calMonths = [0, 1, 2].map(off => {
    const d   = new Date(nowDate.getFullYear(), nowDate.getMonth() + off, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const cal = AZ_CALENDAR_2026[key];
    const mn  = (MN3[lang] || MN3.en)[d.getMonth()];
    return { key, label:`${mn} ${d.getFullYear()}`, wd:cal?.workDays ?? null, holidays:cal?.holidays ?? [], isNow:off === 0 };
  });

  // Weather impact text
  const weatherMsg = () => {
    if (!weather?.current) return null;
    const temp = Math.round(weather.current.temperature_2m);
    const code = weather.current.weather_code;
    const isRain  = code >= 51 && code <= 82;
    const isStorm = code >= 95;
    const isHot   = temp > 32;
    const isCold  = temp < 8;
    const m = {
      az: isStorm ? `⛈️ Fırtına — Nizami trafiki əhəmiyyətli düşəcək` :
          isRain  ? `🌧️ Yağış — Nizami gün içi trafiki azalacaq` :
          isHot   ? `☀️ ${temp}°C istilik — xarici trafik azalır, İçərişəhər stabil` :
          isCold  ? `🥶 Soyuq — Nizami trafiki aşağı` :
          `🌤️ ${temp}°C mülayim — Nizami üçün əla şərait`,
      ru: isStorm ? `⛈️ Гроза — посещаемость Nizami резко упадёт` :
          isRain  ? `🌧️ Дождь — трафик Nizami снизится` :
          isHot   ? `☀️ ${temp}°C жара — парковый трафик падает` :
          isCold  ? `🥶 Холодно — Nizami мало посетителей` :
          `🌤️ ${temp}°C мягко — отличные условия для Nizami`,
      en: isStorm ? `⛈️ Storm — Nizami footfall will drop sharply` :
          isRain  ? `🌧️ Rain — Nizami daytime traffic will be lower` :
          isHot   ? `☀️ ${temp}°C heat — outdoor traffic drops, İçərişəhər stable` :
          isCold  ? `🥶 Cold — Nizami traffic low` :
          `🌤️ ${temp}°C mild — great conditions for Nizami`,
    };
    return m[lang] || m.en;
  };

  // Branch list
  const branchIds = ca
    ? ["Binəqədi","Binəqədi","Nizami","İçərişəhər"].filter(br => ca.byBranch?.[TO_CA[br]])
    : ["Binəqədi","Binəqədi","İçərişəhər"];

  const filtered  = ACTIONS.filter(() => filter === "all" || branchIds.includes(filter));
  const totalPot  = filtered.reduce((s, a) => {
    const live = calcLiveRev(a.id, ca, dash, filter);
    return s + Math.max(0, live != null ? live : a.rev6mo_static);
  }, 0);

  const card = { background:C.panel, border:`1px solid ${C.line}`, borderRadius:14, padding:"18px 18px 14px" };
  const sLabel = { fontSize:11, fontWeight:700, letterSpacing:.6, textTransform:"uppercase", color:C.sub, marginBottom:10 };

  return (
    <div style={{ background:C.bg, minHeight:"100%", padding:"22px 18px 40px", fontFamily:SANS, color:C.ink, fontVariantNumeric:"tabular-nums" }}>

      {/* ── Header ── */}
      <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:4 }}>
        <h1 style={{ fontFamily:SERIF, fontSize:25, fontWeight:600, margin:0 }}>{t.title}</h1>
        {ca && <span style={{ fontSize:10.5, fontWeight:600, color:C.green, background:"#EEF2EC", border:`1px solid #CBD8C6`, borderRadius:999, padding:"3px 9px" }}>{t.liveTag}</span>}
      </div>
      <p style={{ color:C.sub, fontSize:12.5, margin:"0 0 20px", maxWidth:560, lineHeight:1.5 }}>{t.sub}</p>

      {/* ── Total + filter ── */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:12, alignItems:"center", marginBottom:24 }}>
        <div style={{ background:C.ink, borderRadius:14, padding:"14px 20px", display:"flex", alignItems:"baseline", gap:10 }}>
          <span style={{ fontFamily:SERIF, fontSize:28, fontWeight:600, color:C.gold }}>₼{fmt(totalPot)}</span>
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.6)" }}>{t.total}</span>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
          <span style={{ fontSize:12, color:C.sub, marginRight:4 }}>{t.filter}:</span>
          {["all",...branchIds].map(b=>(
            <button key={b} onClick={()=>setFilter(b)} style={{
              fontSize:12, fontWeight:600, padding:"6px 13px", borderRadius:999, cursor:"pointer",
              border:`1px solid ${filter===b?C.ink:C.line}`,
              background:filter===b?C.ink:C.panel, color:filter===b?"#fff":C.sub,
            }}>{b==="all"?t.all:brLabel(b)}</button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SEASONAL INTELLIGENCE SECTION
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom:28 }}>

        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
          <h2 style={{ fontFamily:SERIF, fontSize:17, fontWeight:600, margin:0 }}>
            🗓️ {t.seasonalTitle}
          </h2>
        </div>

        {/* ── Upcoming events ── */}
        {upcoming.length > 0 && (
          <div style={{ marginBottom:12 }}>
            <div style={sLabel}>{t.upcomingLabel}</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(265px,1fr))", gap:12 }}>
              {upcoming.slice(0, 3).map((event, idx) => {
                const daysLeft   = Math.max(0, Math.round((new Date(event.start) - new Date(today)) / 86400000));
                const isF1       = event.name.includes("Formula 1");
                const revByBranch = EVENT_EST[event.name];
                const dotColor   = isF1 ? C.gold : C.caramel;

                return (
                  <div key={idx} style={{
                    background: isF1 ? `${C.gold}12` : C.panel,
                    border:`1px solid ${isF1 ? C.gold : C.line}`,
                    borderRadius:14, padding:"14px 16px",
                  }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                      <div style={{ flex:1, paddingRight:8 }}>
                        <div style={{ fontSize:13, fontWeight:700, lineHeight:1.35, color:C.ink }}>{event.name}</div>
                        <div style={{ fontSize:11, color:C.sub, marginTop:2 }}>{event.start} — {event.end}</div>
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <div style={{ fontFamily:SERIF, fontSize:28, fontWeight:700, color:dotColor, lineHeight:1 }}>{daysLeft}</div>
                        <div style={{ fontSize:10, color:C.sub }}>{t.daysLeft}</div>
                      </div>
                    </div>

                    {/* Branch impact */}
                    {Object.entries(BRANCH_CONTEXT).map(([ctx, bCtx]) => {
                      const sens = SENS_CFG[bCtx.eventSensitivity] || SENS_CFG.low;
                      const est  = revByBranch?.[ctx];
                      return (
                        <div key={ctx} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                          <div style={{ width:58, fontSize:10.5, color:C.sub, flexShrink:0 }}>{BSHORT[ctx]}</div>
                          <div style={{ display:"flex", gap:2 }}>
                            {[1,2,3,4].map(n => (
                              <div key={n} style={{ width:9, height:9, borderRadius:2, background:n<=sens.level?dotColor:C.line }} />
                            ))}
                          </div>
                          <div style={{ fontSize:10, color:C.sub, flex:1 }}>
                            {lang==="az"?sens.az:lang==="ru"?sens.ru:sens.en}
                          </div>
                          {est && est.max > 500 && (
                            <div style={{ fontSize:10, fontWeight:600, color:C.green, whiteSpace:"nowrap" }}>
                              +₼{Math.round(est.min/1000)}k–₼{Math.round(est.max/1000)}k
                            </div>
                          )}
                          {est && est.max <= 500 && est.max > 0 && (
                            <div style={{ fontSize:10, color:C.sub }}>~₼{est.max}</div>
                          )}
                        </div>
                      );
                    })}

                    <div style={{ marginTop:8, background:"#EEF2EC", border:"1px solid #CBD8C6", borderRadius:8, padding:"7px 10px", fontSize:11, color:"#46603F", lineHeight:1.5 }}>
                      {event.impact}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Weather + Calendar row ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))", gap:12 }}>

          {/* Weather card */}
          <div style={card}>
            <div style={sLabel}>{t.weatherTitle}</div>
            {!weather ? (
              <div style={{ fontSize:12, color:C.sub }}>{t.weatherLoad}</div>
            ) : (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                  <span style={{ fontSize:30 }}>{WMO_ICON[weather.current?.weather_code] ?? "🌤️"}</span>
                  <div>
                    <div style={{ fontFamily:SERIF, fontSize:26, fontWeight:600, color:C.ink, lineHeight:1 }}>
                      {Math.round(weather.current?.temperature_2m ?? 0)}°C
                    </div>
                    <div style={{ fontSize:10.5, color:C.sub }}>{t.nowLabel}</div>
                  </div>
                </div>
                <div style={{ fontSize:12, color:C.ink, background:"#EEF2EC", border:"1px solid #CBD8C6", borderRadius:8, padding:"8px 10px", marginBottom:10, lineHeight:1.55 }}>
                  {weatherMsg()}
                </div>
                {weather.daily?.time && (
                  <div style={{ display:"flex", gap:6 }}>
                    {weather.daily.time.slice(1, 4).map((day, i) => (
                      <div key={i} style={{ flex:1, textAlign:"center", background:C.cream, borderRadius:8, padding:"7px 4px" }}>
                        <div style={{ fontSize:9, color:C.sub }}>{day.slice(5).replace("-","/")} </div>
                        <div style={{ fontSize:16, margin:"3px 0" }}>{WMO_ICON[weather.daily.weather_code[i+1]] ?? "🌤️"}</div>
                        <div style={{ fontSize:11, fontWeight:600, color:C.ink }}>{Math.round(weather.daily.temperature_2m_max[i+1])}°</div>
                        <div style={{ fontSize:9, color:C.sub }}>{weather.daily.precipitation_probability_max?.[i+1]}%</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Calendar card */}
          <div style={card}>
            <div style={sLabel}>{t.calTitle}</div>
            <div style={{ fontSize:11, color:C.sub, marginBottom:12, lineHeight:1.5 }}>{t.cpNote}</div>

            {calMonths.map(({ key, label, wd, holidays, isNow }) => (
              <div key={key} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                  <div style={{ width:64, fontSize:12, fontWeight:isNow?700:400, color:isNow?C.ink:C.sub }}>
                    {label}{isNow && <span style={{ fontSize:9, color:C.caramel, marginLeft:4 }}>●</span>}
                  </div>
                  <div style={{ flex:1, height:7, background:C.line, borderRadius:4 }}>
                    <div style={{ height:7, width:`${((wd||0)/23)*100}%`, background:isNow?C.caramel:C.slate, borderRadius:4 }} />
                  </div>
                  <div style={{ fontSize:12, fontWeight:600, color:C.ink, width:46, textAlign:"right" }}>
                    {wd ?? "?"} {lang==="az"?"iş":lang==="ru"?"р.дн":"wd"}
                  </div>
                </div>
                {holidays.length > 0 ? (
                  <div style={{ fontSize:10, color:C.clay, marginLeft:72, lineHeight:1.4 }}>
                    ⚠️ {holidays.slice(0,2).join(" · ")}
                  </div>
                ) : wd !== null ? (
                  <div style={{ fontSize:10, color:C.green, marginLeft:72 }}>✓ {t.noHolidays}</div>
                ) : null}
              </div>
            ))}

            {calMonths[0].wd && calMonths[1].wd && (
              <div style={{ marginTop:8, background:C.cream, borderRadius:8, padding:"8px 10px", fontSize:11, color:C.sub, lineHeight:1.5 }}>
                {(() => {
                  const cur = calMonths[0].wd, nxt = calMonths[1].wd;
                  const delta = Math.round((nxt-cur)/cur*100);
                  return lang==="az"
                    ? `${calMonths[1].label}: ${nxt} iş günü — bu aydakından ${delta>=0?"+":""}${delta}%. Binəqədi üçün ${delta>0?"daha güclü ay.":"daha az iş günü."}`
                    : lang==="ru"
                    ? `${calMonths[1].label}: ${nxt} раб. дней — ${delta>=0?"+":""}${delta}% к текущему. Binəqədi ${delta>0?"сильнее":"слабее"}.`
                    : `${calMonths[1].label}: ${nxt} working days — ${delta>=0?"+":""}${delta}% vs this month. Binəqədi ${delta>0?"stronger":"weaker"} next month.`;
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height:1, background:C.line, margin:"22px 0 18px" }} />
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:.6, textTransform:"uppercase", color:C.sub, marginBottom:14 }}>
          {t.actionsTitle}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          EXISTING ACTION CARDS (unchanged)
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{ display:"grid", gap:12 }}>
        {filtered.map(a => {
          const open        = expanded === a.id;
          const liveRev     = calcLiveRev(a.id, ca, dash, filter);
          const revShow     = Math.max(0, liveRev != null ? liveRev : a.rev6mo_static);
          const liveBase    = getBase(ca, filter);
          const insightText = typeof a.dataInsight[lang] === "function"
            ? a.dataInsight[lang](liveBase)
            : a.dataInsight[lang];

          return (
            <div key={a.id} style={{ ...card, cursor:"pointer" }} onClick={()=>setExpanded(open?null:a.id)}>
              <div style={{ display:"flex", flexWrap:"wrap", gap:10, alignItems:"flex-start" }}>
                <div style={{ width:32, height:32, borderRadius:99, background:C.ink, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:SERIF, fontSize:15, fontWeight:600, flexShrink:0 }}>
                  {a.rank}
                </div>
                <div style={{ flex:1, minWidth:180 }}>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6, alignItems:"center", marginBottom:4 }}>
                    <span style={{ fontFamily:SERIF, fontSize:15, fontWeight:600, color:C.ink }}>{a.title[lang]}</span>
                    <span style={{ fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:999, background:`${a.catColor}20`, color:a.catColor }}>
                      {a.category[lang]}
                    </span>
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6, alignItems:"center" }}>
                    <span style={{ fontSize:10, padding:"2px 7px", borderRadius:999, background:C.cream, color:C.sub }}>
                      {lang==="az"?"Bütün filiallar":lang==="ru"?"Все филиалы":"All branches"}
                    </span>
                    <span style={{ fontSize:10, padding:"2px 7px", borderRadius:999, background:`${DIFF[a.difficulty].color}18`, color:DIFF[a.difficulty].color, fontWeight:600 }}>
                      {DIFF[a.difficulty][lang]}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontFamily:SERIF, fontSize:22, fontWeight:600, color:C.green }}>+₼{fmt(revShow)}</div>
                  <div style={{ fontSize:10, color:C.sub }}>{t.impact}</div>
                </div>
                <div style={{ fontSize:18, color:C.sub, flexShrink:0, transform:open?"rotate(180deg)":"none", transition:"transform .2s" }}>↓</div>
              </div>

              {open && (
                <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${C.line}`, display:"grid", gap:14 }} onClick={e=>e.stopPropagation()}>
                  <div style={{ background:"#EEF2EC", borderRadius:10, padding:"12px 14px" }}>
                    <div style={{ fontSize:11, fontWeight:600, color:"#46603F", marginBottom:4, textTransform:"uppercase", letterSpacing:.5 }}>📊 {t.insight}</div>
                    <div style={{ fontSize:13, color:"#3A5235", lineHeight:1.55 }}>{insightText}</div>
                  </div>
                  <div style={{ background:C.cream, borderRadius:10, padding:"12px 14px" }}>
                    <div style={{ fontSize:11, fontWeight:600, color:C.caramel, marginBottom:4, textTransform:"uppercase", letterSpacing:.5 }}>🎯 {t.action}</div>
                    <div style={{ fontSize:13, color:C.ink, lineHeight:1.55 }}>{a.action[lang]}</div>
                  </div>
                  <div style={card}>
                    <div style={{ fontSize:11, fontWeight:600, color:C.sub, marginBottom:10, textTransform:"uppercase", letterSpacing:.5 }}>{t.howTo}</div>
                    <div style={{ display:"grid", gap:8 }}>
                      {a.steps[lang].map((step, i)=>(
                        <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                          <div style={{ width:22, height:22, borderRadius:99, background:C.ink, color:"#fff", fontSize:11, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{i+1}</div>
                          <div style={{ fontSize:13, color:C.ink, lineHeight:1.5, paddingTop:2 }}>{step}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ background:"#F0EDF8", borderRadius:10, padding:"12px 14px" }}>
                    <div style={{ fontSize:11, fontWeight:600, color:"#5E4A8A", marginBottom:4, textTransform:"uppercase", letterSpacing:.5 }}>🌍 {t.bench}</div>
                    <div style={{ fontSize:12.5, color:"#4A3870", lineHeight:1.55 }}>{a.benchmark[lang]}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop:20, fontSize:11, color:C.sub, textAlign:"center", lineHeight:1.5 }}>
        {t.dataNote}
      </div>
    </div>
  );
}
