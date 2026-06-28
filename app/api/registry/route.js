// app/api/registry/route.js — per-user Upstash Redis storage
import { NextResponse } from "next/server";

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const CHUNK = 350_000;

async function kv(cmd, ...args) {
  const res = await fetch(`${REDIS_URL}/${cmd}/${args.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  const j = await res.json();
  return j.result;
}
async function kvSet(key, val) {
  const res = await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization:`Bearer ${REDIS_TOKEN}`, "Content-Type":"application/json" },
    body: JSON.stringify({ value: val }),
  });
  return (await res.json()).result;
}

function prefix(userId) { return `cofibaku:user:${userId}:reg:v1`; }

export async function GET(req) {
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ ok:false, error:"no userId" });
  if (!REDIS_URL) return NextResponse.json({ ok:false, error:"no redis" });
  try {
    const meta = JSON.parse(await kv("get", `${prefix(userId)}:meta`) || "null");
    if (!meta) return NextResponse.json({ ok:true, gz:null });
    const chunks = await Promise.all(
      Array.from({ length: meta.n }, (_, i) => kv("get", `${prefix(userId)}:${i}`))
    );
    if (chunks.some(c => !c)) return NextResponse.json({ ok:false, error:"chunk missing" });
    return NextResponse.json({ ok:true, gz: chunks.join("") });
  } catch (e) {
    return NextResponse.json({ ok:false, error:e.message });
  }
}

export async function POST(req) {
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ ok:false });
  if (!REDIS_URL) return NextResponse.json({ ok:false, error:"no redis" });
  try {
    const { gz } = await req.json();
    const chunks = [];
    for (let i = 0; i < gz.length; i += CHUNK) chunks.push(gz.slice(i, i + CHUNK));
    await Promise.all(chunks.map((c, i) => kvSet(`${prefix(userId)}:${i}`, c)));
    await kvSet(`${prefix(userId)}:meta`, JSON.stringify({ n: chunks.length, ts: Date.now() }));
    return NextResponse.json({ ok:true });
  } catch (e) {
    return NextResponse.json({ ok:false, error:e.message });
  }
}
