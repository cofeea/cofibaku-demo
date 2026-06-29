// app/api/process-data/route.js
// ─────────────────────────────────────────────────────────────────────────────
// App Router format (Next.js 13+)
// Place at:  app/api/process-data/route.js
//            (same level as app/api/coach/route.js)
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── helpers ──────────────────────────────────────────────────────────────────

function rowsToTSV(rows) {
  return rows
    .map(r => (r || []).map(v => String(v ?? "")).join("\t"))
    .join("\n");
}

async function callGPT(system, user) {
  const res = await openai.chat.completions.create({
    model:       "gpt-4o",
    temperature: 0,
    max_tokens:  1500,
    messages: [
      { role: "system", content: system },
      { role: "user",   content: user   },
    ],
  });
  const text  = res.choices[0].message.content;
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ── P&L processor ─────────────────────────────────────────────────────────────

async function processPnL(rows, fileName) {
  const tsv = rowsToTSV(rows.slice(0, 120));

  const result = await callGPT(
    `You are a financial data extraction AI for coffee shop P&L reports.
Extract structured data and return ONLY valid JSON — no markdown, no explanation.`,

    `File: "${fileName}"

P&L TABLE (tab-separated):
${tsv}

INSTRUCTIONS:
- Months are in columns, date format M/DD/YYYY or M/D/YYYY (end of month).
- Find rows with these labels and extract monthly values:
    revenue       → "Total Revenue" or "Total Sales revenue"
    cogs          → "Total Cost"
    grossProfit   → "Gross profit"
    staffCosts    → "Total Personal"
    rent          → "Total İcarə" or "Total Icare"
    totalExpenses → "Total Expenses"
    netProfit     → "TOTAL NET PROFIT"
- Return COST values (cogs, staffCosts, rent, totalExpenses) as POSITIVE numbers.
- CRITICAL — profit keeps its sign: "netProfit" (TOTAL NET PROFIT) is NEGATIVE when
  it is a loss. If the cell shows a loss (e.g. "-606.83", "(606.83)", or parenthesised),
  return it as a negative number (-606.83). NEVER convert a loss to positive — a branch
  can be unprofitable; do not "fix" the sign.
- Detect branch from content or filename.
  Valid: "İçərişəhər", "Nizami", "Binəqədi"
- Only include months with non-zero revenue.

Return ONLY this JSON:
{
  "branch": "string",
  "dataType": "pnl",
  "monthly": [
    {
      "month": "Nov 2025",
      "revenue": 0, "cogs": 0, "grossProfit": 0,
      "staffCosts": 0, "rent": 0, "totalExpenses": 0, "netProfit": 0
    }
  ],
  "summary": "2-sentence analysis of revenue trend and profitability"
}`
  );

  // Defensive sign correction: GPT sometimes strips the "-" from a loss
  // (e.g. -606.83 → 606.83). Operating profit (grossProfit − totalExpenses) cannot be
  // negative while net profit is positive (this report has no other income).
  // When that impossible combination appears, the net is a loss → restore the sign.
  if (result?.monthly?.length) {
    for (const m of result.monthly) {
      const opProfit = (Number(m.grossProfit) || 0) - (Number(m.totalExpenses) || 0);
      if (opProfit < 0 && (Number(m.netProfit) || 0) > 0) {
        m.netProfit = -Math.abs(Number(m.netProfit) || 0);
      }
    }
  }
  return result;
}

// ── POS processor ──────────────────────────────────────────────────────────────

async function processPOS(monthly, fileName, detectedBranch, detectedBank) {
  return callGPT(
    `You are a payment analytics AI for restaurant POS terminal data.
Validate monthly transaction data and return ONLY valid JSON — no markdown, no explanation.`,

    `File: "${fileName}"
Auto-detected branch: ${detectedBranch || "unknown"}
Auto-detected bank:   ${detectedBank   || "unknown"}

Pre-aggregated monthly data:
${JSON.stringify(monthly, null, 2)}

INSTRUCTIONS:
- Confirm or correct branch (must be one of):
    "İçərişəhər", "Nizami", "Binəqədi"
- Confirm or correct bank (must be one of):
    "ABB", "Kapital", "Pasa"
- Use file name and content to detect if auto-detect was wrong.
- Flag anomalies: months where revenue/txns drop or spike >40% vs average.
- Recalculate avgTicket = revenue / txns per month.

Return ONLY this JSON:
{
  "branch": "string",
  "bank": "string",
  "dataType": "pos",
  "monthly": [
    { "month": "Nov 2025", "revenue": 0, "txns": 0, "uniqueCards": 0, "avgTicket": 0 }
  ],
  "anomalies": [],
  "summary": "2-sentence analysis of transaction trends"
}`
  );
}

// ── handler ───────────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, rows, monthly, fileName, detectedBranch, detectedBank } = body;

    if (!type || !fileName) {
      return NextResponse.json({ error: "Missing type or fileName" }, { status: 400 });
    }

    let result;

    if (type === "pnl") {
      if (!rows?.length) {
        return NextResponse.json({ error: "No rows for P&L" }, { status: 400 });
      }
      result = await processPnL(rows, fileName);

    } else if (type === "pos") {
      if (!monthly?.length) {
        return NextResponse.json({ error: "No monthly data for POS" }, { status: 400 });
      }
      result = await processPOS(monthly, fileName, detectedBranch, detectedBank);

    } else {
      return NextResponse.json({ error: "type must be pnl or pos" }, { status: 400 });
    }

    return NextResponse.json({ success: true, ...result });

  } catch (err) {
    console.error("[process-data]", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
