// lib/businessContext.js
// ─────────────────────────────────────────────────────────────────────────────
// Business-specific context for Kapi Coffee branches in Baku:
//   • per-branch location / customer / demand profile
//   • Azerbaijan 2026 production calendar (working days + holidays)
//   • Baku events (past within the data window + upcoming)
//   • live Baku weather (Open-Meteo, no API key)
//   • helpers to build a context block for the AI coach and UI insights
//
// Used by:  app/api/coach/route.js  (system prompt enrichment)
//           Overview / insight cards (buildContextInsights)
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. Branch profiles ───────────────────────────────────────────────────────
// Keyed by the display name used in dashboardData.pos.
export const BRANCH_CONTEXT = {
  "İçərişəhər": {
    location: "Bakı mərkəzi, İçərişəhər metrosu yanı. Fountain Square, JW Marriott, turist mərkəzi.",
    customers: "Turistlər, otel qonaqları, şəhər mərkəzinin ziyarətçiləri",
    calendarSensitivity: "all_days",
    weekendEffect: "positive",
    weatherSensitivity: "medium",
    eventSensitivity: "high",
    demandDrivers: ["tourism", "events", "weather"],
  },
  "Nizami": {
    location: "Bakı mərkəzi, Nizami küçəsi. Alış-veriş zolağı, ofis binaları.",
    customers: "Ofis işçiləri, alış-veriş edənlər, yerli turistlər",
    calendarSensitivity: "all_days",
    weekendEffect: "neutral",
    weatherSensitivity: "low",
    eventSensitivity: "medium",
    demandDrivers: ["office_workers", "retail", "events"],
  },
  "Binəqədi": {
    location: "Bakı, Binəqədi rayonu. Yaşayış məntəqəsi, yerli müştəri bazası.",
    customers: "Yerli sakinlər, ətrafdakı kiçik ofis işçiləri",
    calendarSensitivity: "all_days",
    weekendEffect: "negative",
    weatherSensitivity: "low",
    eventSensitivity: "low",
    demandDrivers: ["local_residents"],
  },
}
export const AZ_CALENDAR_2026 = {
  "2026-01": { workDays: 19, hours: 151, holidays: ["1–2 Jan New Year", "20 Jan Martyrs' Day"] },
  "2026-02": { workDays: 20, hours: 160, holidays: [] },
  "2026-03": { workDays: 14, hours: 111, holidays: ["8 Mar Women's Day", "20–24 Mar Novruz (20–30 Mar effectively non-working)", "20–21 Mar Ramazan Bayramı"] },
  "2026-04": { workDays: 22, hours: 176, holidays: [] },
  "2026-05": { workDays: 17, hours: 134, holidays: ["9 May Victory & Peace Day", "27–28 May Qurban Bayramı", "28 May Independence Day"] },
  "2026-06": { workDays: 20, hours: 159, holidays: ["15 Jun National Salvation Day", "26 Jun Armed Forces Day"] },
  "2026-07": { workDays: 23, hours: 184, holidays: [] },
  "2026-08": { workDays: 21, hours: 168, holidays: [] },
  "2026-09": { workDays: 22, hours: 176, holidays: ["27 Sep Remembrance Day"] },
  "2026-10": { workDays: 22, hours: 176, holidays: [] },
  "2026-11": { workDays: 19, hours: 152, holidays: ["8 Nov Victory Day", "9 Nov State Flag Day"] },
  "2026-12": { workDays: 22, hours: 175, holidays: ["31 Dec International Solidarity Day"] },
};

// Ramadan fasting month (affects daytime food/coffee demand among observant locals;
// evening / iftar demand rises). Official Ramazan Bayramı holiday is 20–21 Mar.
export const RAMADAN_2026 = { fastStart: "2026-02-17", fastEnd: "2026-03-18" };

export function workDaysForKey(monthKey) {
  return AZ_CALENDAR_2026[monthKey]?.workDays ?? null;
}

// ── 3. Baku events (impact on footfall) ──────────────────────────────────────
// `window` = true if it falls inside the current data range (Oct 2025 – Jun 2026).
export const BAKU_EVENTS = [
  // ---- within the data window (already happened) ----
  { name: "New Year holidays", start: "2025-12-31", end: "2026-01-02", window: true,
    type: "public_holiday",
    impact: "Offices closed (Nizami low); festive, tourist & leisure footfall up in the centre (İçərişəhər)." },
  { name: "Ramadan (fasting month)", start: "2026-02-17", end: "2026-03-18", window: true,
    type: "religious_season",
    impact: "Daytime food/coffee demand softens among observant locals; evening demand firmer. Affects local-heavy sites more than tourist/transit ones." },
  { name: "Novruz holiday", start: "2026-03-20", end: "2026-03-30", window: true,
    type: "public_holiday",
    impact: "Long break: offices closed (Nizami very low) and many residents leave Baku, softening local footfall; tourist traffic moderate." },
  { name: "Victory & Peace Day", start: "2026-05-09", end: "2026-05-09", window: true,
    type: "public_holiday", impact: "Office sites (Nizami) lower; central leisure footfall normal-to-up." },
  { name: "Qurban Bayramı + Independence Day", start: "2026-05-27", end: "2026-05-28", window: true,
    type: "public_holiday", impact: "Offices closed (Nizami low); some residents travel; central/tourist sites steadier." },
  { name: "National Salvation Day", start: "2026-06-15", end: "2026-06-15", window: true,
    type: "public_holiday", impact: "Office sites lower; central footfall normal." },

  // ---- upcoming (future opportunities) ----
  { name: "Women's European Volleyball Championship (Baku co-hosts)", start: "2026-08-21", end: "2026-09-06", window: false,
    type: "sports_event",
    impact: "International visitor uptick in late summer — upside for the tourist/central branches (İçərişəhər especially)." },
  { name: "Formula 1 Azerbaijan Grand Prix", start: "2026-09-23", end: "2026-09-26", window: false,
    type: "mega_event",
    impact: "The single biggest tourist surge of the year. The street circuit runs through the city centre / Old City right next to İçərişəhər; expect a large, high-spend influx around the race and the Crystal Hall concerts. Plan staffing, stock and hours for İçərişəhər and central sites; book this window every year (contract runs to 2030)." },
];

export function eventsForMonth(monthKey) {
  // monthKey like "2026-05"
  return BAKU_EVENTS.filter(e => e.start.slice(0,7) <= monthKey && e.end.slice(0,7) >= monthKey);
}
export function upcomingEvents(fromISO) {
  const today = fromISO || new Date().toISOString().slice(0,10);
  return BAKU_EVENTS.filter(e => e.end >= today).sort((a,b)=>a.start.localeCompare(b.start));
}

// ── 4. Live Baku weather (Open-Meteo, no key) ────────────────────────────────
const WMO = {
  0:"clear",1:"mainly clear",2:"partly cloudy",3:"overcast",45:"fog",48:"rime fog",
  51:"light drizzle",53:"drizzle",55:"heavy drizzle",61:"light rain",63:"rain",65:"heavy rain",
  71:"light snow",73:"snow",75:"heavy snow",80:"rain showers",81:"rain showers",82:"violent rain showers",
  95:"thunderstorm",96:"thunderstorm w/ hail",99:"thunderstorm w/ hail",
};
// Returns a short text note (or null on failure). Best-effort, ~3s timeout.
export async function getBakuWeather() {
  const url = "https://api.open-meteo.com/v1/forecast?latitude=40.4093&longitude=49.8671"
    + "&current=temperature_2m,weather_code"
    + "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
    + "&timezone=Asia%2FBaku&forecast_days=4";
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    const j = await r.json();
    const cur = j.current || {};
    const d = j.daily || {};
    const desc = WMO[cur.weather_code] ?? "";
    const lines = [];
    if (cur.temperature_2m != null)
      lines.push(`Baku now: ${Math.round(cur.temperature_2m)}°C, ${desc}.`);
    if (d.time?.length) {
      const days = d.time.slice(0,4).map((day,i) =>
        `${day}: ${Math.round(d.temperature_2m_min[i])}–${Math.round(d.temperature_2m_max[i])}°C, ${WMO[d.weather_code[i]]??""}, rain ${d.precipitation_probability_max?.[i] ?? "?"}%`
      );
      lines.push("Forecast — " + days.join(" | "));
    }
    return lines.join(" ");
  } catch {
    return null;
  }
}

// ── 5. Context block for the AI coach system prompt ──────────────────────────
export function buildBusinessContextBlock(weatherNote) {
  const today = new Date().toISOString().slice(0,10);
  const lines = [];

  lines.push("=== BRANCH BUSINESS CONTEXT (use this to explain WHY numbers move) ===");
  for (const [name, b] of Object.entries(BRANCH_CONTEXT)) {
    lines.push(`• ${name}: ${b.location}`);
    lines.push(`    Customers: ${b.customers}`);
    lines.push(`    Demand: ${b.demandDrivers}`);
    lines.push(`    Calendar sensitivity: ${b.calendarSensitivity}; weekend effect: ${b.weekendEffect}; weather: ${b.weatherSensitivity}; events: ${b.eventSensitivity}.`);
  }

  lines.push("");
  lines.push("=== AZERBAIJAN 2026 WORKING-DAY CALENDAR (key for Nizami) ===");
  lines.push("Compare months by revenue PER WORKING DAY for office-dependent Nizami. Working days per month:");
  lines.push(Object.entries(AZ_CALENDAR_2026)
    .map(([k,v]) => `${k}:${v.workDays}d`).join("  "));
  lines.push("Notable holiday clusters: " + Object.entries(AZ_CALENDAR_2026)
    .filter(([,v]) => v.holidays.length)
    .map(([k,v]) => `${k} (${v.holidays.join("; ")})`).join("  |  "));
  lines.push(`Ramadan fasting: ${RAMADAN_2026.fastStart} → ${RAMADAN_2026.fastEnd} (softer daytime demand; stronger evenings).`);

  lines.push("");
  lines.push("=== BAKU EVENTS ===");
  lines.push("Within the data window (already reflected in the numbers):");
  for (const e of BAKU_EVENTS.filter(e=>e.window))
    lines.push(`• ${e.start}…${e.end} ${e.name} — ${e.impact}`);
  lines.push("Upcoming (plan ahead):");
  for (const e of upcomingEvents(today))
    lines.push(`• ${e.start}…${e.end} ${e.name} — ${e.impact}`);
  lines.push("NOTE: the data period (Oct 2025–Jun 2026) contains NO Formula 1 weekend (the 2025 race was in Sept 2025, just before it). The next F1 surge is Sept 2026 — a future upside, not in current numbers.");

  if (weatherNote) {
    lines.push("");
    lines.push("=== CURRENT BAKU WEATHER (relevant to İçərişəhər footfall) ===");
    lines.push(weatherNote);
  }
  return lines.join("\n");
}

// ── 6. Context-aware insights for the UI (trilingual) ────────────────────────
// Returns [{ id, tone, az, ru, en }] — drop into an Overview / insights card.
// dashboardData is the live computeDashboardData() output (may be null).
export function buildContextInsights(dashboardData, lang) {
  const out = [];
  const today = new Date().toISOString().slice(0,10);

  // (a) Next big event
  const next = upcomingEvents(today)[0];
  if (next) {
    const d0 = new Date(next.start), now = new Date(today);
    const days = Math.max(0, Math.round((d0 - now) / 86400000));
    out.push({
      id: "next_event", tone: "gold",
      az: `Yaxınlaşan tədbir: ${next.name} (${next.start})${days?` — ${days} gün qalıb`:""}. Mərkəzi və turist filialları (xüsusən İçərişəhər) üçün hazırlaş: kadr, ehtiyat, iş saatları.`,
      ru: `Ближайшее событие: ${next.name} (${next.start})${days?` — через ${days} дн.`:""}. Подготовьте центральные/туристические филиалы (особенно İçərişəhər): персонал, запасы, часы работы.`,
      en: `Upcoming event: ${next.name} (${next.start})${days?` — in ${days} days`:""}. Prepare the central/tourist branches (İçərişəhər especially): staffing, stock, opening hours.`,
    });
  }

  // (b) Nizami — revenue per working day (calendar-fair view)
  const cp = dashboardData?.pos?.["Nizami"];
  if (cp?.monthly?.length >= 2) {
    const withWD = cp.monthly
      .map(m => ({ k: m.month_key, rev: m.revenue, wd: workDaysForKey(m.month_key) }))
      .filter(x => x.wd);
    if (withWD.length >= 2) {
      const a = withWD[withWD.length-2], b = withWD[withWD.length-1];
      const perA = a.rev / a.wd, perB = b.rev / b.wd;
      const rawMoM = (b.rev - a.rev) / a.rev * 100;
      const perMoM = (perB - perA) / perA * 100;
      out.push({
        id: "nizami_workday", tone: "slate",
        az: `Nizami ofis mərkəzindədir — ədalətli müqayisə iş günü başına gəlirdir. Son ay ${b.wd} iş günü (əvvəlki ${a.wd}). Xam dəyişim ${rawMoM>=0?"+":""}${rawMoM.toFixed(1)}%, amma iş günü başına ${perMoM>=0?"+":""}${perMoM.toFixed(1)}% — fərq təqvimdəndir, tələb itkisi deyil.`,
        ru: `Nizami — в бизнес-центре; честнее сравнивать выручку на рабочий день. В последнем месяце ${b.wd} раб. дн. (ранее ${a.wd}). Грубое изменение ${rawMoM>=0?"+":""}${rawMoM.toFixed(1)}%, но на рабочий день ${perMoM>=0?"+":""}${perMoM.toFixed(1)}% — разница из-за календаря, а не падения спроса.`,
        en: `Nizami sits in an office centre — the fair comparison is revenue per working day. Latest month had ${b.wd} working days (prev ${a.wd}). Raw change ${rawMoM>=0?"+":""}${rawMoM.toFixed(1)}%, but per working day ${perMoM>=0?"+":""}${perMoM.toFixed(1)}% — the gap is calendar, not lost demand.`,
      });
    }
  }

  // (c) İçərişəhər — weather/season note
  out.push({
    id: "icerisheher_weather", tone: "green",
    az: "İçərişəhər turist mərkəzindədir və hava/tədbirlərdən asılıdır — mülayim aylar (apr–iyun, sen–okt) və günəşli həftəsonları ən güclü vaxtlardır; tədbir həftələrində (F1, konsertlər) kəskin artım olur.",
    ru: "İçərişəhər в туристическом центре, зависит от погоды/событий — мягкие месяцы (апр–июнь, сен–окт) и солнечные выходные сильнее всего; в недели событий (F1, концерты) резкий рост.",
    en: "İçərişəhər is in the tourist centre, weather/event-driven — mild months (Apr–Jun, Sep–Oct) and sunny weekends are strongest; event weeks (F1, concerts) drive sharp spikes.",
  });

  return out.map(o => ({ id: o.id, tone: o.tone, text: o[lang] || o.en }));
}
