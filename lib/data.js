// lib/data.js — CofiBakuPromo
// Static fallback + shape definition for CofiBakuDashboard.
// Mirrors Cofiesto's lib/data.js structure but for Kapi Coffee (3 Baku branches).

import {
  SAMPLE_BRANCHES,
  SAMPLE_BENCHMARKS,
  SAMPLE_MONTHLY_TREND,
  SAMPLE_CURRENT_MONTH,
} from "@/lib/sampleData";

export const CURRENT_MONTH = SAMPLE_CURRENT_MONTH;

export const BRANCHES = SAMPLE_BRANCHES;

export const BENCHMARKS = SAMPLE_BENCHMARKS;

export const MONTHLY_TREND = SAMPLE_MONTHLY_TREND;

export const MONTHLY_CLIENTS = [
  { m:"Nov", icerisheher:3280, nizami:2340, bineqedi:1620 },
  { m:"Dec", icerisheher:3510, nizami:2480, bineqedi:1710 },
  { m:"Jan", icerisheher:3020, nizami:2180, bineqedi:1540 },
  { m:"Feb", icerisheher:2940, nizami:2120, bineqedi:1490 },
  { m:"Mar", icerisheher:2430, nizami:1720, bineqedi:1250 },
  { m:"Apr", icerisheher:3580, nizami:2580, bineqedi:1950 },
  { m:"May", icerisheher:3640, nizami:2780, bineqedi:1890 },
];

export const RETENTION = [
  { m:"Nov", neu:2840, ret:440 },
  { m:"Dec", neu:2180, ret:1330 },
  { m:"Jan", neu:1880, ret:1140 },
  { m:"Feb", neu:1640, ret:1300 },
  { m:"Mar", neu:1210, ret:1220 },
  { m:"Apr", neu:2240, ret:1340 },
  { m:"May", neu:1980, ret:1660 },
];

export const LOYALTY_SCENARIOS = [
  {
    id:"conservative",
    label:{ az:"Konservativ (%5 çevrilmə)", en:"Conservative (5% conversion)", ru:"Консервативный (5%)" },
    newReturners:386, extraVisits:772, addRevenue:14802, cost:2890, net:11912,
  },
  {
    id:"realistic",
    label:{ az:"Real (%10 çevrilmə)", en:"Realistic (10% conversion)", ru:"Реалистичный (10%)" },
    newReturners:772, extraVisits:1544, addRevenue:29604, cost:5780, net:23824,
  },
  {
    id:"ambitious",
    label:{ az:"Ambisiyalı (%18 çevrilmə)", en:"Ambitious (18% conversion)", ru:"Амбициозный (18%)" },
    newReturners:1390, extraVisits:2780, addRevenue:53287, cost:10404, net:42883,
  },
];

export const CUSTOMER_KPIS = [
  { l:{ az:"Unikal kart",   en:"Unique cards",   ru:"Уник. карт"    }, v:"7,834", sub:"+12% MoM", tone:"ink"   },
  { l:{ az:"Bir-dəfəlik",   en:"One-time",        ru:"Разовые"       }, v:"4,879", sub:"62.3%",    tone:"amber" },
  { l:{ az:"At-Risk kart",  en:"At-Risk cards",   ru:"At-Risk карты" }, v:"847",   sub:"10.8%",    tone:"clay"  },
  { l:{ az:"VIP kart",      en:"VIP cards",       ru:"VIP карты"     }, v:"248",   sub:"3.2%",     tone:"sage"  },
];

export const GROWTH = {
  compSales:    8.4,
  transactions: 6.2,
  avgTicket:    2.1,
  period:       "Apr → May 2026",
  illustrative: false,
};

export default {
  CURRENT_MONTH,
  BRANCHES,
  BENCHMARKS,
  MONTHLY_TREND,
  MONTHLY_CLIENTS,
  RETENTION,
  LOYALTY_SCENARIOS,
  CUSTOMER_KPIS,
  GROWTH,
};
