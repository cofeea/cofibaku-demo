// components/DataImportTab.jsx
// ─────────────────────────────────────────────────────────────────────────────
// File upload → SheetJS parse → /api/process-data (OpenAI) → DataContext
// All dashboard tabs update automatically once data is saved.
//
// INTEGRATION (Kapi CoffeeDashboard.jsx):
//   import { DataProvider } from "@/lib/DataContext";
//   import DataImportTab    from "./DataImportTab";
//
//   // 1. Wrap root: export default () => <DataProvider><App/></DataProvider>
//   // 2. TABS: { id:"import", labelKey:"tabImport", icon:"📂" }
//   // 3. switch: case "import": return <DataImportTab theme={theme} lang={lang}/>;
//
//   // lib/i18n.js:
//   //   tabImport: { en:"Import", az:"İdxal", ru:"Импорт" }
//
// DEPENDENCY: npm install xlsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
import { useData, BRANCHES, BANKS } from "@/lib/DataContext";

// ── Month key helpers ──────────────────────────────────────────────────────
const MN_S = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function toKey(label) {
  if (!label) return null;
  if (/^\d{4}-\d{2}$/.test(label)) return label;
  const idx = MN_S.findIndex(n => label.startsWith(n));
  const yr  = (label.match(/\d{4}/) || [])[0];
  return (idx >= 0 && yr) ? `${yr}-${String(idx+1).padStart(2,"0")}` : null;
}
function keyLabel(key) {
  if (!key) return "?";
  const [y, m] = key.split("-");
  return `${MN_S[parseInt(m)-1]}'${y.slice(2)}`;
}
function srcKeys(monthly) {
  const s = new Set();
  (monthly||[]).forEach(m => { const k=toKey(m.month); if(k)s.add(k); });
  return s;
}
function allNetworkKeys(registry) {
  const s = new Set();
  for (const b of BRANCHES) {
    (registry[b]?.pnl?.monthly||[]).forEach(m => { const k=toKey(m.month); if(k)s.add(k); });
    for (const bk of BANKS) {
      (registry[b]?.pos?.[bk]?.monthly||[]).forEach(m => { const k=toKey(m.month); if(k)s.add(k); });
    }
  }
  return [...s].sort();
}
function findGaps(registry, allKeys) {
  if (!allKeys.length) return [];
  const latest = allKeys[allKeys.length-1];
  const gaps = [];
  for (const b of BRANCHES) {
    for (const bk of BANKS) {
      const src = registry[b]?.pos?.[bk];
      if (!src?.monthly?.length) continue;
      const keys = srcKeys(src.monthly);
      if (!keys.has(latest)) {
        const last = [...keys].sort().pop() || null;
        gaps.push({ id:`${b}::${bk}`, label:`${b} / ${bk}`, type:"pos", last, missing:latest });
      }
    }
    const pnl = registry[b]?.pnl;
    if (pnl?.monthly?.length) {
      const keys = srcKeys(pnl.monthly);
      if (!keys.has(latest)) {
        const last = [...keys].sort().pop() || null;
        gaps.push({ id:`${b}::pnl`, label:`${b} / P&L`, type:"pnl", last, missing:latest });
      }
    }
  }
  return gaps;
}

// ══════════════════════════════════════════════════════════════
// CLIENT-SIDE PRE-PROCESSING (SheetJS)
// ══════════════════════════════════════════════════════════════

function detectMeta(fileName) {
  const f = fileName
    .toUpperCase()
    .replace(/İ/g,"I").replace(/Ş/g,"S").replace(/Ə/g,"E")
    .replace(/Ğ/g,"G").replace(/Ç/g,"C").replace(/Ö/g,"O").replace(/Ü/g,"U")
    .replace(/[_\-\s\.]/g,"");

  let branch = null;
  if      (f.includes("ZARIFA") || f.includes("ICERI") || f.includes("ICERISHEHER")) branch = "İçərişəhər";
  else if (f.includes("PORT") && !f.includes("REPORT"))       branch = "İçərişəhər";
  else if (f.includes("CENTRAL"))                             branch = "Nizami";
  else if (f.includes("CITYPOINT")||f.includes("BINEQEDI")||(f.includes("CITY")&&f.includes("POINT"))) branch = "Binəqədi";
  else if (f.includes("CITY"))                                branch = "Binəqədi";
  else if (f.includes("Binəqədi"))                                 branch = "Binəqədi";

  let bank = null;
  if      (f.includes("ABB"))                                 bank = "ABB";
  else if (f.includes("KAPI") || f.includes("BIRBANK"))      bank = "Kapital";
  else if (f.includes("PASA") || f.includes("PASHA"))        bank = "Pasa";

  // P&L if it has typical P&L name markers AND no bank/POS markers.
  // (Targeted "+ Upload" into the Satış Hesabatı (P&L) column overrides this anyway.)
  const looksLikeBank = f.includes("BANK") || f.includes("BIRBANK")
                        || f.includes("ABB") || f.includes("KAPI")
                        || f.includes("PASA") || f.includes("PASHA")
                        || f.includes("POS") || f.includes("STATEMENT")
                        || f.includes("TERMINAL");
  const looksLikePnL  = f.includes("REPORT") || f.includes("PNL") || f.includes("P&L")
                        || f.includes("MENFEET") || f.includes("ZERER")
                        || f.includes("HESABAT") || f.includes("PROFIT")
                        || (f.includes("PL") && !looksLikeBank);
  const isPnL = looksLikePnL && !looksLikeBank;
  return { branch, bank, type: isPnL ? "pnl" : "pos" };
}

// Extract raw rows for P&L (sent to OpenAI as CSV)
function extractPnLRows(wb) {
  const sheetName = wb.SheetNames.find(n =>
    n==="MZ"||n.includes("Hesabat")||n.includes("Profit")||n.includes("profit")
  ) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(ws, { header:1, defval:"" });
}

// ── Parse a date cell → {year, month} ──────────────────────────
function parseDateCell(dv) {
  if (dv == null) return null;
  if (typeof dv === "number" && dv > 40000) {
    const d = new Date(Math.round((dv - 25569) * 86400000));
    const frac = dv - Math.floor(dv);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(),
             hour: frac > 0 ? Math.floor(frac * 24) : null };
  }
  const ds = String(dv);
  let mt = ds.match(/^(\d{2})-(\d{2})-(\d{2,4})$/);          // DD-MM-YY(YY)
  if (mt) { let y=+mt[3]; if(y<100)y+=2000; return { y, m:+mt[2], d:+mt[1], hour:null }; }
  mt = ds.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);              // DD.MM.YYYY
  if (mt) return { y:+mt[3], m:+mt[2], d:+mt[1], hour:null };
  mt = ds.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):)?/); // YYYY-MM-DD [HH:]
  if (mt) return { y:+mt[1], m:+mt[2], d:+mt[3], hour: mt[4]!=null ? +mt[4] : null };
  return null;
}

// Extract hour (0-23) from a time cell. Handles "18:49", "13.08.03", "HH:MM:SS",
// and Excel fractional-day numbers. Returns null if unparseable.
function parseHourCell(tv) {
  if (tv == null) return null;
  if (typeof tv === "number") {
    const frac = tv - Math.floor(tv);
    return frac >= 0 && frac < 1 ? Math.floor(frac * 24) : null;
  }
  const ts = String(tv).trim();
  const mt = ts.match(/^(\d{1,2})[:.]\d{2}/);   // HH:MM or HH.MM…
  if (mt) { const h=+mt[1]; return h>=0 && h<=23 ? h : null; }
  return null;
}

// weekday Mon=0 … Sun=6 from y/m/d
function weekdayMon0(y, m, d) {
  if (!y || !m || !d) return null;
  const js = new Date(Date.UTC(y, m-1, d)).getUTCDay(); // 0=Sun
  return (js + 6) % 7;
}

// ── Extract RAW transactions with a stable dedup key ───────────
// Returns { transactions: [{ rrn, ym, amount, card }], bank }
// The dedup key (rrn) is bank-specific:
//   ABB     → RRN column
//   Paşa    → İstinad No
//   Kapital → RRN, else Sənəd nömrəsi, else Əməliyyat ID-si
// Falls back to a composite "date|time|amount|card" key when no ID.
function extractTransactions(wb, detectedBank) {
  const out = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:null });
    if (!rows.length) continue;

    // ── locate header + column layout ──
    let hi=-1;
    let cDate=-1, cTime=-1, cAmt=-1, cCard=-1, cRRN=-1, cDoc=-1, cID=-1;

    for (let i=0; i<Math.min(rows.length,35); i++) {
      const r = rows[i]; if (!r) continue;
      const has = (kw) => r.findIndex(v => String(v??"").includes(kw));

      // ABB
      if (has("TRN_DT") >= 0) {
        hi=i;
        cDate=has("TRN_DT"); cTime=has("TRN_TIME"); cAmt=has("TRAN_AMT");
        cCard=has("CARD_NUMBER"); cRRN=has("RRN");
        break;
      }
      // Paşa (İstinad No)
      if (has("İstinad") >= 0 || (has("Əməliyyat tarixi")>=0 && has("Əməliyyat vaxtı")>=0)) {
        hi=i;
        cDate=has("Əməliyyat tarixi"); cTime=has("Əməliyyat vaxtı");
        cAmt =r.findIndex(v=>String(v??"").includes("Əməliyyat məbləği")||String(v??"").toLowerCase().includes("məbləği"));
        cCard=r.findIndex(v=>String(v??"").includes("Kartın nömrəsi")||String(v??"").includes("nömrəsi"));
        cRRN =has("İstinad");
        break;
      }
      // Kapital (header has "Əməliyyat tarixi" + "RRN" + "Sənəd nömrəsi")
      if (has("Əməliyyat tarixi") >= 0 && (has("RRN")>=0 || has("Sənəd")>=0)) {
        hi=i;
        cDate=has("Əməliyyat tarixi"); cTime=-1;
        cAmt =r.findIndex(v=>String(v??"").includes("Əməliyyat Məbləği")||String(v??"").includes("Məbləğ"));
        cCard=r.findIndex(v=>String(v??"").includes("Kart Nömrəsi")||String(v??"").includes("Kart"));
        cRRN =has("RRN"); cDoc=has("Sənəd"); cID=has("Əməliyyatın ID");
        break;
      }
      // Kapital xlsb without header keywords — date in col 9 looks like YYYY-MM-DD
      if (i>0 && r[9] && String(r[9]).match(/^\d{4}-\d{2}-\d{2}/)) {
        hi=i-1;
        cDate=9; cAmt=11; cCard=5; cRRN=17; cDoc=18; cID=16;
        break;
      }
    }
    if (hi<0) continue;

    // ── read rows ──
    for (let i=hi+1; i<rows.length; i++) {
      const r = rows[i]; if (!r) continue;
      const dt = parseDateCell(r[cDate]);
      if (!dt) continue;

      const amtCol = cAmt>=0 ? cAmt : (cDate+1);
      const amount = parseFloat(r[amtCol]) || 0;
      if (amount <= 0) continue;

      const card = cCard>=0 && r[cCard] ? String(r[cCard]).trim() : "";
      const ym   = `${dt.y}-${String(dt.m).padStart(2,"0")}`;
      const dd   = dt.d ? `${ym}-${String(dt.d).padStart(2,"0")}` : null;

      // hour: from date string if present (Kapital), else from time column
      let hour = dt.hour;
      if (hour == null && cTime>=0) hour = parseHourCell(r[cTime]);
      const wd = weekdayMon0(dt.y, dt.m, dt.d);

      // build dedup key (rrn)
      let rrn = "";
      if (cRRN>=0 && r[cRRN]) rrn = String(r[cRRN]).trim();
      if (!rrn && cDoc>=0 && r[cDoc]) rrn = "DOC:" + String(r[cDoc]).trim();
      if (!rrn && cID >=0 && r[cID])  rrn = "ID:"  + String(r[cID]).trim();
      // composite fallback — same txn appears identical across files
      if (!rrn) {
        const tm = cTime>=0 && r[cTime] ? String(r[cTime]).trim() : "";
        rrn = `CMP:${ym}|${tm}|${amount}|${card}`;
      }

      out.push({ rrn, ym, date: dd, hour, wd, amount, card });
    }

    if (out.length) break; // first sheet with data wins
  }

  return { transactions: out };
}

// ── Aggregate deduplicated transactions → monthly summary ──────
// Accepts an array of {rrn, ym, amount, card}. Caller is responsible
// for having already removed duplicate RRNs across files.
function aggregateTransactions(txns) {
  const MN=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthly = {};
  for (const t of txns) {
    if (!monthly[t.ym]) {
      const [y,m] = t.ym.split("-");
      monthly[t.ym] = { month:`${MN[+m-1]} ${y}`, revenue:0, txns:0, cards:new Set() };
    }
    monthly[t.ym].revenue += t.amount;
    monthly[t.ym].txns++;
    if (t.card) monthly[t.ym].cards.add(t.card);
  }
  return Object.entries(monthly)
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([,v]) => ({
      month:       v.month,
      revenue:     Math.round(v.revenue*100)/100,
      txns:        v.txns,
      uniqueCards: v.cards.size,
      avgTicket:   v.txns>0 ? Math.round(v.revenue/v.txns*100)/100 : 0,
    }));
}

// ══════════════════════════════════════════════════════════════
// UPLOAD + PROCESS PIPELINE
// ══════════════════════════════════════════════════════════════

async function processFile(file, override) {
  const meta = detectMeta(file.name);
  const buf  = await file.arrayBuffer();
  const wb   = XLSX.read(buf, { type:"array" });

  // The cell the user clicked wins over filename guessing.
  // override = { branch, type:"pnl"|"pos", bank } when a specific cell's
  // "+ Upload" button was used; null when dropped into the general zone.
  const effType = override?.type || meta.type;
  const effBank = override?.bank ?? meta.bank;

  // ── P&L: send rows to OpenAI, no dedup needed ──
  if (effType === "pnl") {
    const rows = extractPnLRows(wb);
    const res = await fetch("/api/process-data", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ type:"pnl", rows, fileName: file.name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(()=>({}));
      throw new Error(err.error || `API error ${res.status}`);
    }
    const result = await res.json();
    if (!result.success) throw new Error(result.error || "Processing failed");
    return { meta, result, transactions: null };
  }

  // ── POS: extract raw transactions WITH dedup keys (RRN) ──
  const { transactions } = extractTransactions(wb, effBank);
  if (!transactions.length) throw new Error("No transaction data found in file");

  // de-dup WITHIN this file first (rare, but bank exports can repeat)
  const seen = new Set();
  const unique = [];
  for (const t of transactions) {
    if (seen.has(t.rrn)) continue;
    seen.add(t.rrn);
    unique.push(t);
  }

  // aggregate the file's own months (for the AI summary call only)
  const monthly = aggregateTransactions(unique);

  // ask OpenAI to confirm branch/bank + write a summary (cheap: ~8 rows)
  const res = await fetch("/api/process-data", {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({
      type:"pos", monthly, fileName: file.name,
      detectedBranch: override?.branch || meta.branch,
      detectedBank:   effBank,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(()=>({}));
    throw new Error(err.error || `API error ${res.status}`);
  }
  const result = await res.json();
  if (!result.success) throw new Error(result.error || "Processing failed");

  // return the deduped raw transactions so the store can merge across files
  return { meta, result, transactions: unique };
}

// ══════════════════════════════════════════════════════════════
// STRINGS
// ══════════════════════════════════════════════════════════════

const STR = {
  en:{
    title:"Data Import", sub:"Upload P&L and payment files — OpenAI extracts the data, all dashboard tabs update automatically",
    drop:"Drop Excel files here, or click to browse",
    dropSub:"Supports .xlsx and .xlsb  ·  Satış Hesabatı (P&L), ABB, Kapital, Paşa Bank",
    reading:"Reading file…", parsing:"Extracting data…", analyzing:"Analysing with AI…",
    done:"Saved to dashboard", error:"Error",
    pnl:"Satış Hesabatı (P&L)", notLoaded:"Not loaded", upload:"Upload",
    delete:"Delete", replace:"Replace",
    active:"Dashboard is using imported data",
    clear:"Clear all data",
    noData:"No data loaded yet — upload files above to populate the dashboard",
    summary:"AI Summary", anomalies:"Anomalies",
    months:"months", revenue:"Revenue", txns:"Txns", margin:"Margin",
    howTitle:"How it works",
    how1:"Drop your Excel files in the box below — the file name tells the system which branch and bank it belongs to (e.g. \"...ADY...\" → ADY row, \"...KAPITAL...\" → Kapital column).",
    how2:"OpenAI reads each file, extracts monthly revenue, transactions and profit, and writes it to the right cell.",
    how3:"Every dashboard tab (Branch Pulse, Growth, Cards, Customers…) updates automatically from this data.",
    how4:"If a file name isn't recognised, use the \"+ Upload\" button inside the exact cell to place it manually. Use 🔄 to replace, 🗑️ to delete.",
    fileNames:"Recognised file name keywords:",
    addMore:"Add / merge another file", replaceAll:"Replace (clear & re-upload)",
    filesLabel:"files", txnLabel:"txns", merged:"merged", duplicatesSkipped:"duplicates skipped",
    // Coverage / gaps
    coverageTitle:"Data coverage",
    coverageSub:"Month-by-month view of all loaded sources",
    gapTitle:"Data gaps detected",
    gapSub:"These sources are missing the latest month available in the network",
    gapMissing:"missing",
    gapLastLoaded:"last loaded",
    noGaps:"All loaded sources are up to date",
    showCoverage:"Show coverage matrix",
    hideCoverage:"Hide coverage matrix",
    monthStrip:"Months loaded",
  },
  az:{
    title:"Məlumat İdxalı", sub:"P&L və ödəniş fayllarını yükləyin — OpenAI datanı çıxarır, bütün tablar avtomatik yenilənir",
    drop:"Excel fayllarını bura sürükləyin və ya klikləyin",
    dropSub:".xlsx və .xlsb dəstəklənir  ·  Satış Hesabatı (P&L), ABB, Kapital, Paşa Bank",
    reading:"Fayl oxunur…", parsing:"Data çıxarılır…", analyzing:"AI ilə analiz…",
    done:"Dashboard-a əlavə edildi", error:"Xəta",
    pnl:"Satış Hesabatı (P&L)", notLoaded:"Yüklənməyib", upload:"Yüklə",
    delete:"Sil", replace:"Əvəz et",
    active:"Dashboard idxal edilmiş datadan istifadə edir",
    clear:"Hamısını sil",
    noData:"Məlumat yoxdur — faylları yükləyin",
    summary:"AI Xülasəsi", anomalies:"Anormallıqlar",
    months:"ay", revenue:"Gəlir", txns:"Əm.", margin:"Marja",
    howTitle:"Necə işləyir",
    how1:"Excel fayllarını aşağıdakı qutuya atın — fayl adı sistemə hansı filial və bank olduğunu bildirir (məs. \"...ADY...\" → ADY sətri, \"...KAPITAL...\" → Kapital sütunu).",
    how2:"OpenAI hər faylı oxuyur, aylıq gəlir, əməliyyat və mənfəəti çıxarır və düzgün xanaya yazır.",
    how3:"Bütün dashboard tabları (Branch Pulse, Growth, Cards, Customers…) bu datadan avtomatik yenilənir.",
    how4:"Əgər fayl adı tanınmasa, dəqiq xananın içindəki \"+ Yüklə\" düyməsi ilə əl ilə yerləşdirin. Əvəz etmək üçün 🔄, silmək üçün 🗑️.",
    fileNames:"Tanınan fayl adı açar sözləri:",
    addMore:"Başqa fayl əlavə et / birləşdir", replaceAll:"Əvəz et (təmizlə & yenidən yüklə)",
    filesLabel:"fayl", txnLabel:"əm.", merged:"birləşdirildi", duplicatesSkipped:"dublikat atıldı",
    // Coverage / gaps
    coverageTitle:"Data əhatəsi",
    coverageSub:"Bütün yüklənmiş mənbələrin ay üzrə görünüşü",
    gapTitle:"Data boşluqları aşkar edildi",
    gapSub:"Bu mənbələrdə şəbəkənin son ayı yoxdur",
    gapMissing:"əksikdir",
    gapLastLoaded:"son yüklənmiş",
    noGaps:"Bütün yüklənmiş mənbələr aktual vəziyyətdədir",
    showCoverage:"Coverage matrix-i göstər",
    hideCoverage:"Coverage matrix-i gizlət",
    monthStrip:"Yüklənmiş aylar",
  },
  ru:{
    title:"Импорт данных", sub:"Загрузите P&L и платёжные файлы — OpenAI извлекает данные, все вкладки обновляются автоматически",
    drop:"Перетащите файлы Excel или нажмите для выбора",
    dropSub:"Поддерживаются .xlsx и .xlsb  ·  Satış Hesabatı (P&L), ABB, Kapital, Paşa Bank",
    reading:"Чтение файла…", parsing:"Извлечение данных…", analyzing:"Анализ с AI…",
    done:"Сохранено в дашборд", error:"Ошибка",
    pnl:"Satış Hesabatı (P&L)", notLoaded:"Не загружено", upload:"Загрузить",
    delete:"Удалить", replace:"Заменить",
    active:"Дашборд использует импортированные данные",
    clear:"Очистить всё",
    noData:"Данных нет — загрузите файлы выше",
    summary:"AI Анализ", anomalies:"Аномалии",
    months:"мес", revenue:"Выручка", txns:"Тр.", margin:"Маржа",
    howTitle:"Как это работает",
    how1:"Перетащите файлы Excel в поле ниже — имя файла указывает системе, к какому филиалу и банку он относится (напр. \"...ADY...\" → строка ADY, \"...KAPITAL...\" → столбец Kapital).",
    how2:"OpenAI читает каждый файл, извлекает месячную выручку, транзакции и прибыль и записывает в нужную ячейку.",
    how3:"Все вкладки дашборда (Branch Pulse, Growth, Cards, Customers…) обновляются автоматически из этих данных.",
    how4:"Если имя файла не распознано, используйте кнопку \"+ Загрузить\" в нужной ячейке. 🔄 — заменить, 🗑️ — удалить.",
    fileNames:"Распознаваемые ключевые слова в имени файла:",
    addMore:"Добавить / объединить файл", replaceAll:"Заменить (очистить и загрузить заново)",
    filesLabel:"файлов", txnLabel:"тр.", merged:"объединено", duplicatesSkipped:"дубликатов пропущено",
    // Coverage / gaps
    coverageTitle:"Покрытие данных",
    coverageSub:"Помесячное представление всех загруженных источников",
    gapTitle:"Обнаружены пробелы в данных",
    gapSub:"В этих источниках отсутствует последний месяц сети",
    gapMissing:"отсутствует",
    gapLastLoaded:"последний загруженный",
    noGaps:"Все загруженные источники актуальны",
    showCoverage:"Показать матрицу покрытия",
    hideCoverage:"Скрыть матрицу покрытия",
    monthStrip:"Загруженные месяцы",
  },
};

const BCOLORS={
  "İçərişəhər":"#c8a96e",
  "Nizami": "#5b8dd9",
  "Binəqədi":   "#4caf50",
  "Binəqədi":          "#9c6fe4",
};

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export default function DataImportTab({ theme={}, lang="en" }) {
  const T = STR[lang] || STR.en;
  const { registry, addSource, deleteSource, clearAll, dashboardData } = useData();

  const S = {
    bg:     theme.card    || "#1c1c1c",
    bg2:    theme.bg      || "#141414",
    border: theme.border  || "#2c2c2c",
    accent: theme.accent  || "#c8a96e",
    text:   theme.text    || "#f0f0f0",
    muted:  theme.muted   || "#888",
    green:  "#4caf50",
    red:    "#ef5350",
    yellow: "#ffb300",
  };

  // ── Coverage & gap analysis ───────────────────────────────
  const [showCoverage, setShowCoverage] = useState(false);
  const [dismissGaps,  setDismissGaps]  = useState(false);

  const allKeys = useMemo(() => allNetworkKeys(registry), [registry]);
  const gaps    = useMemo(() => findGaps(registry, allKeys), [registry, allKeys]);

  // { cellKey: "reading"|"parsing"|"analyzing"|"done"|errorString }
  const [status,    setStatus]    = useState({});
  const [isDragging,setDragging]  = useState(false);
  const [expanded,  setExpanded]  = useState(null); // branch key for expanded AI summary
  const [targetCell,setTarget]    = useState(null);  // { branch, type, bank }
  const [showHowTo,  setShowHowTo] = useState(false);
  const inputRef = useRef();

  const cellKey = (b,t,bk) => t==="pnl" ? `${b}::pnl` : `${b}::pos::${bk}`;
  const getSource = (b,t,bk) => t==="pnl" ? registry[b]?.pnl : registry[b]?.pos?.[bk];

  // ── upload pipeline ───────────────────────────────────────
  const handleFiles = useCallback(async (fileList, override=null) => {
    for (const file of Array.from(fileList)) {
      if (!/\.(xlsx|xlsb)$/i.test(file.name)) continue;

      const ck = override
        ? cellKey(override.branch, override.type, override.bank)
        : `pending::${file.name}`;

      try {
        setStatus(p=>({...p,[ck]:"reading"}));
        await new Promise(r=>setTimeout(r,50)); // let UI update

        setStatus(p=>({...p,[ck]:"analyzing"}));
        const { meta, result, transactions } = await processFile(file, override);

        // A targeted "+ Upload" cell overrides everything. For general drops,
        // trust filename/AI detection.
        const branch = override?.branch || result.branch || meta.branch;
        const type   = override?.type   || result.dataType || meta.type;
        const bank   = override?.bank   ?? (result.bank || meta.bank);

        if (!branch) throw new Error("Branch not detected. Use the + Upload button in the correct cell.");

        addSource(branch, type, bank, result, file.name, { transactions, replace: override?.replace || false });

        const finalKey = cellKey(branch, type, bank);
        setStatus(p=>{ const n={...p}; delete n[ck]; n[finalKey]="done"; return n; });
        setTimeout(()=>setStatus(p=>{ const n={...p}; delete n[finalKey]; return n; }),3000);

      } catch(err) {
        setStatus(p=>({...p,[ck]: err.message}));
        setTimeout(()=>setStatus(p=>{ const n={...p}; delete n[ck]; return n; }),5000);
      }
    }
  }, [addSource]);

  const onDrop  = e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files, null); };
  const onInput = e => { handleFiles(e.target.files, targetCell); setTarget(null); e.target.value=""; };

  const openPicker = (b,t,bk,replace=false) => { setTarget({branch:b,type:t,bank:bk,replace}); inputRef.current?.click(); };

  // ── render ────────────────────────────────────────────────
  const hasData = dashboardData.hasData;

  return (
    <div style={{padding:"20px 16px",maxWidth:1000,margin:"0 auto"}}>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8,marginBottom:20}}>
        <div>
          <h2 style={{color:S.text,fontSize:19,fontWeight:700,margin:0}}>📂 {T.title}</h2>
          <p style={{color:S.muted,fontSize:12,margin:"4px 0 0",maxWidth:560}}>{T.sub}</p>
        </div>
        {hasData&&(
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{color:S.green,fontSize:12,fontWeight:600}}>⚡ {T.active}</span>
            <button onClick={clearAll}
              style={{background:"none",border:`1px solid ${S.red}40`,color:S.red,borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11}}>
              {T.clear}
            </button>
          </div>
        )}
      </div>

      {/* ── GAP ALERT BANNER ── */}
      {!dismissGaps && gaps.length > 0 && (
        <div style={{background:`${S.red}18`,border:`1px solid ${S.red}50`,borderRadius:12,padding:"12px 16px",marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{flex:1}}>
              <div style={{color:S.red,fontWeight:700,fontSize:13,marginBottom:6}}>
                ⚠ {gaps.length} {T.gapTitle}
              </div>
              <div style={{fontSize:11,color:S.muted,marginBottom:8}}>{T.gapSub}</div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {gaps.map(g=>(
                  <div key={g.id} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,flexWrap:"wrap"}}>
                    <span style={{fontWeight:700,color:S.text}}>{g.label}</span>
                    <span style={{color:S.muted}}>→</span>
                    <span style={{color:S.red,fontWeight:600}}>{keyLabel(g.missing)} {T.gapMissing}</span>
                    {g.last&&<span style={{color:S.muted,fontSize:11}}>({T.gapLastLoaded}: {keyLabel(g.last)})</span>}
                  </div>
                ))}
              </div>
            </div>
            <button onClick={()=>setDismissGaps(true)} style={{background:"none",border:"none",color:S.muted,cursor:"pointer",fontSize:18,padding:"0 4px",lineHeight:1,marginLeft:8}}>×</button>
          </div>
        </div>
      )}
      {!dismissGaps && gaps.length===0 && allKeys.length>0 && (
        <div style={{background:`${S.green}18`,border:`1px solid ${S.green}40`,borderRadius:10,padding:"8px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
          <span style={{color:S.green,fontSize:13}}>✓</span>
          <span style={{color:S.muted,fontSize:12}}>{T.noGaps} · {keyLabel(allKeys[0])} – {keyLabel(allKeys[allKeys.length-1])}</span>
        </div>
      )}

      {/* ── HOW IT WORKS (collapsible) ── */}
      <div style={{marginBottom:20}}>
        <button onClick={()=>setShowHowTo(p=>!p)} style={{
          background:`${S.accent}0f`,border:`1px solid ${S.accent}33`,
          borderRadius:showHowTo?"12px 12px 0 0":12,padding:"10px 18px",
          width:"100%",textAlign:"left",cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"space-between",
        }}>
          <span style={{color:S.accent,fontSize:13,fontWeight:700}}>💡 {T.howTitle}</span>
          <span style={{color:S.accent,fontSize:16,lineHeight:1,transform:showHowTo?"rotate(180deg)":"none",transition:"transform .2s",display:"inline-block"}}>▾</span>
        </button>
        {showHowTo&&(
          <div style={{background:`${S.accent}0f`,border:`1px solid ${S.accent}33`,borderTop:"none",borderRadius:"0 0 12px 12px",padding:"14px 18px"}}>
            <ol style={{margin:0,paddingLeft:18,color:S.muted,fontSize:12,lineHeight:1.7}}>
              <li>{T.how1}</li>
              <li>{T.how2}</li>
              <li>{T.how3}</li>
              <li>{T.how4}</li>
            </ol>
            <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${S.border}`,fontSize:11,color:S.muted}}>
              <span style={{fontWeight:600}}>{T.fileNames}</span>{" "}
              <code style={{color:S.accent}}>ICERISHEHER / NIZAMI</code> ·{" "}
              <code style={{color:S.accent}}>CENTRAL</code> ·{" "}
              <code style={{color:S.accent}}>CITY POINT</code> ·{" "}
              <code style={{color:S.accent}}>ADY</code>{"  |  "}
              <code style={{color:S.accent}}>ABB</code> ·{" "}
              <code style={{color:S.accent}}>KAPITAL / BIRBANK</code> ·{" "}
              <code style={{color:S.accent}}>PASA</code> ·{" "}
              <code style={{color:S.accent}}>REPORT</code> (Satış Hesabatı (P&L))
            </div>
          </div>
        )}
      </div>

      {/* ── REGISTRY GRID ── */}
      <div style={{background:S.bg,border:`1px solid ${S.border}`,borderRadius:12,overflow:"hidden",marginBottom:20}}>
        {/* Column headers */}
        <div style={{display:"grid",gridTemplateColumns:`150px repeat(${BANKS.length+1},1fr)`,borderBottom:`1px solid ${S.border}`}}>
          <GH S={S}>Branch</GH>
          <GH S={S}>{T.pnl}</GH>
          {BANKS.map(b=><GH key={b} S={S}>{b}</GH>)}
        </div>

        {/* Branch rows */}
        {BRANCHES.map((branch,ri)=>{
          const color=BCOLORS[branch]||S.accent;
          const branchKey=branch.replace(/\s/g,"_");
          return(
            <div key={branch}>
              <div style={{display:"grid",gridTemplateColumns:`150px repeat(${BANKS.length+1},1fr)`,borderBottom:ri<BRANCHES.length-1?`1px solid ${S.border}`:"none"}}>
                {/* Branch name */}
                <div style={{padding:"12px 12px",display:"flex",alignItems:"center",gap:6,borderRight:`1px solid ${S.border}`}}>
                  <span style={{width:7,height:7,borderRadius:"50%",background:color,display:"inline-block",flexShrink:0}}/>
                  <span style={{color:S.text,fontWeight:600,fontSize:11}}>{branch}</span>
                </div>

                {/* P&L cell */}
                <RegistryCell S={S} T={T}
                  source={getSource(branch,"pnl",null)}
                  status={status[cellKey(branch,"pnl",null)]}
                  onAddMore={()=>openPicker(branch,"pnl",null,false)}
                  onReplace={()=>openPicker(branch,"pnl",null,true)}
                  onDelete={()=>deleteSource(branch,"pnl",null)}
                  color={color}
                  onExpand={()=>setExpanded(expanded===`${branchKey}_pnl`?null:`${branchKey}_pnl`)}
                  isExpanded={expanded===`${branchKey}_pnl`}
                  allKeys={allKeys}
                  isPnL
                />

                {/* POS bank cells */}
                {BANKS.map(bank=>(
                  <RegistryCell key={bank} S={S} T={T}
                    source={getSource(branch,"pos",bank)}
                    status={status[cellKey(branch,"pos",bank)]}
                    onAddMore={()=>openPicker(branch,"pos",bank,false)}
                    onReplace={()=>openPicker(branch,"pos",bank,true)}
                    onDelete={()=>deleteSource(branch,"pos",bank)}
                    color={color}
                    onExpand={()=>setExpanded(expanded===`${branchKey}_${bank}`?null:`${branchKey}_${bank}`)}
                    isExpanded={expanded===`${branchKey}_${bank}`}
                    allKeys={allKeys}
                  />
                ))}
              </div>

              {/* AI Summary expansion */}
              {BANKS.concat(["pnl"]).map(key=>{
                const eKey=`${branchKey}_${key}`;
                if(expanded!==eKey) return null;
                const src=key==="pnl"?registry[branch]?.pnl:registry[branch]?.pos?.[key];
                if(!src) return null;
                return(
                  <div key={eKey} style={{padding:"12px 16px",background:`${color}08`,borderBottom:`1px solid ${S.border}`}}>
                    {src.summary&&(
                      <div style={{marginBottom:8}}>
                        <span style={{color:color,fontSize:11,fontWeight:700}}>🤖 {T.summary}  </span>
                        <span style={{color:S.muted,fontSize:12}}>{src.summary}</span>
                      </div>
                    )}
                    {src.anomalies?.filter(Boolean).length>0&&(
                      <div>
                        <span style={{color:S.red,fontSize:11,fontWeight:700}}>⚠️ {T.anomalies}  </span>
                        <span style={{color:S.muted,fontSize:12}}>{src.anomalies.join(" · ")}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* ── COVERAGE MATRIX ── */}
      {allKeys.length > 0 && (
        <div style={{marginBottom:16}}>
          <button onClick={()=>setShowCoverage(p=>!p)} style={{
            background:`${S.border}40`,border:`1px solid ${S.border}`,borderRadius:showCoverage?"10px 10px 0 0":10,
            padding:"9px 16px",width:"100%",textAlign:"left",cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"space-between",color:S.text,fontSize:12,fontWeight:600,
          }}>
            <span>📊 {T.coverageTitle} — {T.coverageSub}</span>
            <span style={{color:S.muted}}>{showCoverage?"▲":"▼"}</span>
          </button>
          {showCoverage && (
            <div style={{border:`1px solid ${S.border}`,borderTop:"none",borderRadius:"0 0 10px 10px",overflow:"auto",background:S.bg}}>
              <table style={{borderCollapse:"collapse",fontSize:11,width:"100%",minWidth:400}}>
                <thead>
                  <tr style={{borderBottom:`1px solid ${S.border}`}}>
                    <th style={{textAlign:"left",padding:"8px 10px",color:S.muted,fontWeight:600,minWidth:140,position:"sticky",left:0,background:S.bg}}>
                      {lang==="az"?"Mənbə":lang==="ru"?"Источник":"Source"}
                    </th>
                    {allKeys.map(k=>(
                      <th key={k} style={{padding:"6px 4px",color:S.muted,fontWeight:600,minWidth:38,textAlign:"center",whiteSpace:"nowrap"}}>
                        {keyLabel(k)}
                      </th>
                    ))}
                    <th style={{padding:"6px 8px",color:S.muted,fontWeight:600,minWidth:80,textAlign:"right"}}>
                      {lang==="az"?"Aralıq":lang==="ru"?"Диапазон":"Range"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {BRANCHES.flatMap(b=>{
                    const shortB = b;
                    const rows = [];
                    // P&L row
                    const pnl = registry[b]?.pnl;
                    if (pnl?.monthly?.length) {
                      const ks = srcKeys(pnl.monthly);
                      const latest = allKeys[allKeys.length-1];
                      const isGap = !ks.has(latest);
                      const first = [...ks].sort()[0];
                      const last  = [...ks].sort().pop();
                      rows.push(
                        <tr key={`${b}::pnl`} style={{borderBottom:`1px solid ${S.border}30`}}>
                          <td style={{padding:"6px 10px",fontWeight:600,color:isGap?S.red:S.text,position:"sticky",left:0,background:S.bg,whiteSpace:"nowrap"}}>
                            {isGap&&"⚠ "}{shortB} / P&L
                          </td>
                          {allKeys.map(k=>{
                            const has = ks.has(k);
                            const isLatestGap = k===latest && !has;
                            return (
                              <td key={k} style={{padding:"5px 4px",textAlign:"center"}}>
                                <div style={{
                                  width:18,height:18,borderRadius:4,margin:"0 auto",
                                  background:has?"#4caf5022":isLatestGap?"#ef535025":"transparent",
                                  border:`1px solid ${has?"#4caf50":isLatestGap?"#ef5350":S.border}30`,
                                  display:"flex",alignItems:"center",justifyContent:"center",
                                }}>
                                  {has&&<span style={{fontSize:9,color:"#4caf50"}}>✓</span>}
                                  {isLatestGap&&<span style={{fontSize:9,color:"#ef5350"}}>!</span>}
                                </div>
                              </td>
                            );
                          })}
                          <td style={{padding:"6px 8px",textAlign:"right",color:S.muted,fontSize:10,whiteSpace:"nowrap"}}>
                            {first&&last ? `${keyLabel(first)}–${keyLabel(last)}` : "—"}
                          </td>
                        </tr>
                      );
                    }
                    // POS bank rows
                    for (const bk of BANKS) {
                      const src = registry[b]?.pos?.[bk];
                      if (!src?.monthly?.length) continue;
                      const ks = srcKeys(src.monthly);
                      const latest = allKeys[allKeys.length-1];
                      const isGap = !ks.has(latest);
                      const first = [...ks].sort()[0];
                      const last  = [...ks].sort().pop();
                      rows.push(
                        <tr key={`${b}::${bk}`} style={{borderBottom:`1px solid ${S.border}30`}}>
                          <td style={{padding:"6px 10px",fontWeight:600,color:isGap?S.red:S.text,position:"sticky",left:0,background:S.bg,whiteSpace:"nowrap"}}>
                            {isGap&&"⚠ "}{shortB} / {bk}
                          </td>
                          {allKeys.map(k=>{
                            const has = ks.has(k);
                            const isLatestGap = k===latest && !has;
                            return (
                              <td key={k} style={{padding:"5px 4px",textAlign:"center"}}>
                                <div style={{
                                  width:18,height:18,borderRadius:4,margin:"0 auto",
                                  background:has?"#4caf5022":isLatestGap?"#ef535025":"transparent",
                                  border:`1px solid ${has?"#4caf50":isLatestGap?"#ef5350":S.border}30`,
                                  display:"flex",alignItems:"center",justifyContent:"center",
                                }}>
                                  {has&&<span style={{fontSize:9,color:"#4caf50"}}>✓</span>}
                                  {isLatestGap&&<span style={{fontSize:9,color:"#ef5350"}}>!</span>}
                                </div>
                              </td>
                            );
                          })}
                          <td style={{padding:"6px 8px",textAlign:"right",color:S.muted,fontSize:10,whiteSpace:"nowrap"}}>
                            {first&&last ? `${keyLabel(first)}–${keyLabel(last)}` : "—"}
                          </td>
                        </tr>
                      );
                    }
                    return rows;
                  })}
                </tbody>
              </table>
              <div style={{padding:"6px 10px",fontSize:10,color:S.muted,borderTop:`1px solid ${S.border}30`,display:"flex",gap:16}}>
                <span><span style={{color:"#4caf50"}}>✓</span> {lang==="az"?"Data var":lang==="ru"?"Есть данные":"Data present"}</span>
                <span><span style={{color:"#ef5350"}}>!</span> {lang==="az"?"Son ay əksik":lang==="ru"?"Посл. месяц отсутствует":"Latest month missing"}</span>
                <span><span style={{opacity:.4}}>□</span> {lang==="az"?"Yüklənməyib":lang==="ru"?"Не загружено":"Not loaded"}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DROP ZONE ── */}
      <div
        onDrop={onDrop}
        onDragOver={e=>{e.preventDefault();setDragging(true);}}
        onDragLeave={()=>setDragging(false)}
        onClick={()=>{setTarget(null);inputRef.current?.click();}}
        style={{
          border:`2px dashed ${isDragging?S.accent:S.border}`,borderRadius:12,
          padding:"28px 20px",textAlign:"center",cursor:"pointer",
          background:isDragging?`${S.accent}12`:S.bg2,transition:"all .2s",marginBottom:20,
        }}
      >
        <div style={{fontSize:28,marginBottom:6}}>📤</div>
        <div style={{color:S.text,fontWeight:600,fontSize:14}}>{T.drop}</div>
        <div style={{color:S.muted,fontSize:12,marginTop:4}}>{T.dropSub}</div>
      </div>

      <input ref={inputRef} type="file" multiple accept=".xlsx,.xlsb" onChange={onInput} style={{display:"none"}}/>

      {/* ── NETWORK SUMMARY ── */}
      {hasData&&(
        <div style={{background:S.bg,border:`1px solid ${S.border}`,borderRadius:12,padding:16}}>
          <div style={{color:S.muted,fontSize:10,fontWeight:700,letterSpacing:.6,marginBottom:12}}>NETWORK TOTALS (IMPORTED DATA)</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10,marginBottom:14}}>
            <SCard S={S} label={T.revenue} value={`₼${dashboardData.network.totalRevenue.toLocaleString()}`}/>
            <SCard S={S} label={T.txns} value={dashboardData.network.totalTxns.toLocaleString()}/>
            <SCard S={S} label="Unique cards" value={dashboardData.network.uniqueCards.toLocaleString()}/>
            <SCard S={S} label="Avg ticket" value={`₼${dashboardData.network.avgTicket}`}/>
            {dashboardData.growth.compSales!==0&&(
              <SCard S={S} label={`MoM (${dashboardData.growth.period})`}
                value={`${dashboardData.growth.compSales>0?"+":""}${dashboardData.growth.compSales}%`}
                pos={dashboardData.growth.compSales>0}/>
            )}
          </div>
          {/* Branch chips */}
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {BRANCHES.map(b=>{
              const color=BCOLORS[b]||S.accent;
              const hasPnL=!!registry[b]?.pnl;
              const banks=BANKS.filter(bk=>registry[b]?.pos?.[bk]);
              if(!hasPnL&&!banks.length) return null;
              return(
                <div key={b} style={{background:`${color}18`,border:`1px solid ${color}30`,borderRadius:8,padding:"6px 10px",fontSize:11}}>
                  <div style={{color,fontWeight:700,marginBottom:2}}>{b}</div>
                  {hasPnL&&<div style={{color:S.muted}}>P&L ✅</div>}
                  {banks.length>0&&<div style={{color:S.muted}}>POS: {banks.join(", ")}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!hasData&&<div style={{textAlign:"center",color:S.muted,fontSize:13,marginTop:32}}>{T.noData}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════

function GH({ S, children }) {
  return(
    <div style={{padding:"9px 10px",color:S.muted,fontSize:10,fontWeight:700,letterSpacing:.5,borderRight:`1px solid ${S.border}`}}>
      {children}
    </div>
  );
}

function RegistryCell({ S, T, source, status, onAddMore, onReplace, onDelete, color, onExpand, isExpanded, isPnL, allKeys }) {
  const [hover,setHover]=useState(false);
  const isLoading=["reading","parsing","analyzing"].includes(status);

  if (source) {
    const m=source.monthly||[];
    const totRev  = m.reduce((s,x)=>s+(x.revenue||0),0);
    const totNet  = isPnL ? m.reduce((s,x)=>s+(x.netProfit||0),0) : null;
    const totTxn  = !isPnL ? m.reduce((s,x)=>s+(x.txns||0),0) : null;
    const label   = isPnL ? `${totNet>=0?"+":""}₼${Math.round(totNet||0).toLocaleString()}` : `${(totTxn||0).toLocaleString()} ${T.txnLabel}`;
    const nFiles  = source.files?.length || 1;
    const nMonths = m.length;
    const lm      = source.lastMerge;

    // Month coverage strip
    const myKeys    = srcKeys(m);
    const latest    = allKeys?.length ? allKeys[allKeys.length-1] : null;
    const hasGap    = latest && !myKeys.has(latest);
    const firstKey  = [...myKeys].sort()[0];
    const lastKey   = [...myKeys].sort().pop();

    return(
      <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
        style={{borderRight:`1px solid ${S.border}`,background:hover?`${S.border}30`:"transparent",transition:"background .15s"}}>
        <div style={{padding:"9px 9px",display:"flex",justifyContent:"space-between",gap:4}}>
          <div role="button" onClick={onExpand} style={{cursor:"pointer",minWidth:0,flex:1}}>
            <div style={{color:hasGap?S.red:S.green,fontSize:9,fontWeight:700,marginBottom:1}}>
              {hasGap?"⚠":"✅"} {nMonths}{T.months.slice(0,2)}{nFiles>1 ? ` · ${nFiles}${T.filesLabel.slice(0,1)}` : ""}
            </div>
            <div style={{color:S.text,fontSize:11,fontWeight:600}}>₼{Math.round(totRev).toLocaleString()}</div>
            <div style={{color:S.muted,fontSize:10}}>{label}</div>

            {/* Date range */}
            {firstKey && lastKey && (
              <div style={{color:S.muted,fontSize:9,marginTop:2}}>
                {keyLabel(firstKey)} – {keyLabel(lastKey)}
              </div>
            )}

            {/* Month coverage strip */}
            {allKeys?.length > 0 && (
              <div style={{display:"flex",gap:2,marginTop:4,flexWrap:"wrap"}}>
                {allKeys.map(k=>{
                  const has = myKeys.has(k);
                  const isGapCell = k===latest && !has && myKeys.size>0;
                  return (
                    <div key={k} title={`${keyLabel(k)}: ${has?"✓":"✗"}`} style={{
                      width:7,height:7,borderRadius:1.5,flexShrink:0,
                      background: has ? S.green : isGapCell ? S.red : `${S.border}80`,
                    }}/>
                  );
                })}
              </div>
            )}

            {lm && lm.skipped>0 && (
              <div style={{color:S.muted,fontSize:9,marginTop:2}}>↺ {lm.skipped} {T.duplicatesSkipped}</div>
            )}
            {(source.summary||source.anomalies?.length>0)&&(
              <div style={{color:isExpanded?color:S.muted,fontSize:9,marginTop:2}}>{isExpanded?"▲":"▼"} AI</div>
            )}
          </div>
          {hover&&(
            <div style={{display:"flex",flexDirection:"column",gap:2}}>
              <Btn S={S} c={S.green}  onClick={onAddMore} title={T.addMore}>➕</Btn>
              <Btn S={S} c={S.accent} onClick={onReplace} title={T.replaceAll}>🔄</Btn>
              <Btn S={S} c={S.red}    onClick={onDelete}  title={T.delete}>🗑️</Btn>
            </div>
          )}
        </div>
      </div>
    );
  }

  return(
    <div style={{borderRight:`1px solid ${S.border}`,display:"flex",alignItems:"center",justifyContent:"center",padding:"9px 6px"}}>
      {isLoading?(
        <span style={{color:S.accent,fontSize:10,textAlign:"center"}}>
          {status==="reading"?T.reading:status==="analyzing"?T.analyzing:T.parsing}
        </span>
      ):status?(
        <span style={{color:S.red,fontSize:10,wordBreak:"break-word",textAlign:"center"}}>{status.slice(0,40)}</span>
      ):(
        <button onClick={onAddMore}
          style={{background:`${S.border}60`,border:`1px dashed ${S.border}`,color:S.muted,
                  borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",gap:3}}>
          <span>+</span><span>{T.upload}</span>
        </button>
      )}
    </div>
  );
}

function Btn({ S, c, onClick, title, children }) {
  const [h,setH]=useState(false);
  return(
    <button onClick={e=>{e.stopPropagation();onClick();}} title={title}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{background:h?`${c}30`:`${c}15`,border:`1px solid ${c}50`,borderRadius:4,
              padding:"2px 4px",cursor:"pointer",fontSize:11,transition:"background .1s"}}>
      {children}
    </button>
  );
}

function SCard({ S, label, value, pos }) {
  return(
    <div style={{background:`${S.border}40`,borderRadius:8,padding:"10px 12px"}}>
      <div style={{color:S.muted,fontSize:10,marginBottom:3}}>{label}</div>
      <div style={{color:pos===true?S.green:pos===false?S.red:S.text,fontSize:16,fontWeight:700}}>{value}</div>
    </div>
  );
}
