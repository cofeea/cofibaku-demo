// app/api/coach/route.js
// AI business coach for Kapi Coffee. Uses OpenAI GPT-4o.
// Receives the dashboard live data summary and grounds every answer in those real numbers.

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { buildBusinessContextBlock, getBakuWeather } from "@/lib/businessContext";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const LANG_NAME = { az: "Azerbaijani", ru: "Russian", en: "English" };

function systemPrompt(lang, dataSummary, contextBlock) {
  const langName = LANG_NAME[lang] || "Azerbaijani";
  return [
    `You are the AI business coach embedded in the Kapi Coffee management dashboard.`,
    `Kapi Coffee is a multi-branch coffee shop chain in Baku, Azerbaijan.`,
    `The three branches are: İçərişəhər, Nizami, and Binəqədi.`,
    ``,
    `ALWAYS answer in ${langName}.`,
    `Be concise, concrete, and practical — like a sharp operations consultant. Use the real numbers below.`,
    `When you cite a figure, use the actual values from the data. Money is in Azerbaijani manat (₼).`,
    `Use the BRANCH BUSINESS CONTEXT, the working-day calendar, events and weather to EXPLAIN why numbers move`,
    `and to give location-aware advice (e.g. Binəqədi dips on holidays because offices close; Nizami`,
    `depends on the office crowd; İçərişəhər benefits from tourist events like the F1 weekend). Judge Nizami by revenue`,
    `per working day. When relevant, point to upcoming events the owner should prepare for.`,
    `If asked something the data does not cover, say so briefly and give your best general guidance.`,
    `Do not invent precise figures that are not in the data.`,
    ``,
    `=== LIVE DASHBOARD DATA (current) ===`,
    dataSummary && dataSummary.trim().length
      ? dataSummary
      : `(No imported data is loaded yet — answer from general best practice and invite the user to import POS/P&L data.)`,
    `=== END DATA ===`,
    ``,
    contextBlock || "",
  ].join("\n");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const lang = body?.lang || "az";
    const dataSummary = typeof body?.dataSummary === "string" ? body.dataSummary : "";

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY not configured." }, { status: 500 });
    }

    // keep only the recent turns to stay light
    const trimmed = messages.slice(-12).map(m => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content ?? "").slice(0, 4000),
    }));

    // Business-specific context: branch profiles + AZ calendar + Baku events + live weather
    const weatherNote = await getBakuWeather();          // best-effort, null on failure
    const contextBlock = buildBusinessContextBlock(weatherNote);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.5,
      max_tokens: 700,
      messages: [
        { role: "system", content: systemPrompt(lang, dataSummary, contextBlock) },
        ...trimmed,
      ],
    });

    const text = completion.choices?.[0]?.message?.content?.trim() || "";
    return NextResponse.json({ text });
  } catch (err) {
    console.error("[coach]", err?.message);
    return NextResponse.json({ error: err?.message || "Coach error." }, { status: 500 });
  }
}
