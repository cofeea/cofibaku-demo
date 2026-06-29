// components/DeepAnalyticsTab.jsx — CoffeeAnalytics Demo
// Deep-dive customer analytics for Kapi Coffee (3 Baku branches).
// Uses imported data when available, falls back to sample data.
"use client";
import { useState } from "react";
import { useData } from "@/lib/DataContext";

const C = {
  bg:"#EAE6DF", panel:"#F7F4EE", ink:"#1A2D4A", sub:"#5B6D8A",
  line:"#D4CFC5", gold:"#CDA04B", caramel:"#BE7A3C", green:"#1B3A6B",
  clay:"#AD4E35", slate:"#5B6D8A", cream:"#EDE8DC",
};
const SERIF = "var(--brand-serif, Georgia), Georgia, serif";
const SANS  = "system-ui, -apple-system, 'Segoe UI', sans-serif";

// ── Sample deep-dive data per branch ──────────────────────────────────────
const DEEP = {
  "İçərişəhər": {
    pareto:{ top10:38.2, top20:55.1, top50:81.4 },
    repeatRev:61.3, onetimeRev:38.7,
    retMed:6, retMean:18,
    peak:13,
    clv:{ avg:142, vip:580, casual:38 },
    heatmap:[
      [0,0,0,0,0,0,0,12,18,24,32,38,42,40,36,28,22,18,14,10,6,0,0,0],
      [0,0,0,0,0,0,0,10,16,22,30,36,40,42,38,30,24,20,16,12,8,0,0,0],
      [0,0,0,0,0,0,0,10,16,22,30,36,40,42,38,30,24,20,16,12,8,0,0,0],
      [0,0,0,0,0,0,0,10,16,22,30,36,40,42,38,30,24,20,16,12,8,0,0,0],
      [0,0,0,0,0,0,0,12,18,24,32,38,42,40,36,28,22,18,14,10,6,0,0,0],
      [0,0,0,0,0,0,0,8,14,24,34,42,44,42,36,28,20,14,10,6,2,0,0,0],
      [0,0,0,0,0,0,0,14,22,30,36,40,42,38,32,24,18,12,8,4,2,0,0,0],
    ],
    cohort:[[100,52,38,28,22,18],[100,54,40,30,24],[100,56,42,32],[100,58,44],[100,60],[100]],
    rfm:{ VIP:248, loyal:892, casual:1840, atRisk:412, oneTime:2442 },
    insight:{
      az:"İçərişəhər turistlər və tədbirlər üçün əla lokasiyadadır. Nahar saatları (12-14) pik vaxtdır. VIP kartlar gəlirin 38%-ni daşıyır.",
      en:"İçərişəhər benefits from tourist traffic and events. Lunch hours (12-14) are peak. VIP cards carry 38% of revenue.",
      ru:"İçərişəhər выигрывает от туристического потока и мероприятий. Пик — обед (12-14). VIP-карты несут 38% выручки.",
    },
  },
  "Nizami": {
    pareto:{ top10:35.4, top20:51.8, top50:78.2 },
    repeatRev:54.6, onetimeRev:45.4,
    retMed:9, retMean:24,
    peak:9,
    clv:{ avg:108, vip:420, casual:31 },
    heatmap:[
      [0,0,0,0,0,0,0,28,34,38,30,24,32,30,22,16,28,32,28,20,10,0,0,0],
      [0,0,0,0,0,0,0,26,32,36,28,22,30,28,20,14,26,30,26,18,8,0,0,0],
      [0,0,0,0,0,0,0,26,32,36,28,22,30,28,20,14,26,30,26,18,8,0,0,0],
      [0,0,0,0,0,0,0,26,32,36,28,22,30,28,20,14,26,30,26,18,8,0,0,0],
      [0,0,0,0,0,0,0,28,34,38,30,24,32,30,22,16,28,32,28,20,10,0,0,0],
      [0,0,0,0,0,0,0,8,12,16,20,22,24,22,18,14,12,10,8,6,4,0,0,0],
      [0,0,0,0,0,0,0,6,10,14,18,20,22,20,16,12,10,8,6,4,2,0,0,0],
    ],
    cohort:[[100,46,34,24,18,14],[100,48,36,26,20],[100,50,38,28],[100,52,40],[100,54],[100]],
    rfm:{ VIP:186, loyal:698, casual:1420, atRisk:384, oneTime:2092 },
    insight:{
      az:"Nizami ofis işçiləri üçün əsas məkandır. Səhər (8-9) və axşam (17-19) saatlarda iki pik var. Həftəsonu trafik zəifdir.",
      en:"Nizami is primary for office workers with two peaks: morning (8-9) and evening (17-19). Weekends are weaker.",
      ru:"Nizami — основное место для офисных работников. Два пика: утро (8-9) и вечер (17-19). Выходные слабее.",
    },
  },
  "Binəqədi": {
    pareto:{ top10:31.8, top20:47.2, top50:74.6 },
    repeatRev:48.2, onetimeRev:51.8,
    retMed:14, retMean:32,
    peak:8,
    clv:{ avg:84, vip:310, casual:26 },
    heatmap:[
      [0,0,0,0,0,0,0,36,40,32,24,18,22,20,14,10,8,6,4,2,0,0,0,0],
      [0,0,0,0,0,0,0,34,38,30,22,16,20,18,12,8,6,4,2,0,0,0,0,0],
      [0,0,0,0,0,0,0,34,38,30,22,16,20,18,12,8,6,4,2,0,0,0,0,0],
      [0,0,0,0,0,0,0,34,38,30,22,16,20,18,12,8,6,4,2,0,0,0,0,0],
      [0,0,0,0,0,0,0,36,40,32,24,18,22,20,14,10,8,6,4,2,0,0,0,0],
      [0,0,0,0,0,0,0,16,20,18,16,14,12,10,8,6,4,2,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,14,18,16,14,12,10,8,6,4,2,0,0,0,0,0,0,0],
    ],
    cohort:[[100,38,26,18,12,8],[100,40,28,20,14],[100,42,30,22],[100,44,32],[100,46],[100]],
    rfm:{ VIP:112, loyal:486, casual:1180, atRisk:286, oneTime:1696 },
    insight:{
      az:"Binəqədi yerli sakinlərə xidmət edir. Səhər saatları (7-9) pik vaxtdır. Müştəri saxlama aşağıdır — sadiqlik proqramı böyük imkan yarada bilər.",
      en:"Binəqədi serves local residents. Morning (7-9) is peak. Customer retention is lower — a loyalty program could create significant upside.",
      ru:"Binəqədi обслуживает местных жителей. Пик — утро (7-9). Удержание клиентов ниже — программа лояльности даст значительный рост.",
    },
  },
};

const BRANCHES = ["İçərişəhər","Nizami","Binəqədi"];
const HOURS = Array.from({length:24},(_,i)=>i);
const DAYS_AZ = ["B.e","Ç.a","Ç","C.a","C","Ş","B"];
const DAYS_EN = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const DAYS_RU = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
const fmt = (n) => n>=1000?(n/1000).toFixed(1)+"k":Math.round(n);

const T = {
  az:{ title:"Dərin Analitika", branch:"Filial", heatTitle:"Saat × Gün istilik xəritəsi",
    paretoTitle:"Pareto analizi (kart konsentrasiyası)", cohortTitle:"Kohort saxlanma",
    rfmTitle:"Müştəri seqmentləri", clvTitle:"Müştəri ömür dəyəri",
    top10:"Top 10% kart", top20:"Top 20% kart", top50:"Top 50% kart",
    gəlir:"gəlir daşıyır", vip:"VIP", loyal:"Sadiq", casual:"Adi",
    atRisk:"Risk altında", oneTime:"Bir-dəfəlik",
    avgClv:"Orta CLV", vipClv:"VIP CLV", casClv:"Adi CLV",
    insight:"Əsas tapıntı", repeatRev:"Təkrar müştəri gəliri",
    mo:"ort/ay", retMed:"median geri dönüş",
  },
  en:{ title:"Deep Analytics", branch:"Branch", heatTitle:"Hour × Day heatmap",
    paretoTitle:"Pareto analysis (card concentration)", cohortTitle:"Cohort retention",
    rfmTitle:"Customer segments", clvTitle:"Customer lifetime value",
    top10:"Top 10% cards", top20:"Top 20% cards", top50:"Top 50% cards",
    gəlir:"of revenue", vip:"VIP", loyal:"Loyal", casual:"Casual",
    atRisk:"At-Risk", oneTime:"One-time",
    avgClv:"Avg CLV", vipClv:"VIP CLV", casClv:"Casual CLV",
    insight:"Key finding", repeatRev:"Repeat customer revenue",
    mo:"avg/mo", retMed:"median return gap",
  },
  ru:{ title:"Глубокая аналитика", branch:"Филиал", heatTitle:"Тепловая карта час × день",
    paretoTitle:"Анализ Парето (концентрация карт)", cohortTitle:"Когортное удержание",
    rfmTitle:"Сегменты клиентов", clvTitle:"Пожизненная ценность клиента",
    top10:"Топ 10% карт", top20:"Топ 20% карт", top50:"Топ 50% карт",
    gəlir:"выручки", vip:"VIP", loyal:"Лояльные", casual:"Обычные",
    atRisk:"At-Risk", oneTime:"Разовые",
    avgClv:"Ср. CLV", vipClv:"VIP CLV", casClv:"Обычный CLV",
    insight:"Ключевой вывод", repeatRev:"Выручка от повторных клиентов",
    mo:"ср/мес", retMed:"медиана возврата",
  },
};

export default function DeepAnalyticsTab({ lang="az" }) {
  const { customerAnalytics } = useData();
  const t = T[lang] || T.az;
  const [branch, setBranch] = useState("İçərişəhər");
  const live = customerAnalytics?.hasData ? customerAnalytics : null;

  const branchList = live ? (Object.keys(live.byBranch).filter(b => BRANCHES.includes(b))) : BRANCHES;
  const curBranch = branchList.includes(branch) ? branch : (branchList[0] || "İçərişəhər");

  // Use live data if available, else static sample
  const liveB = live?.byBranch?.[curBranch]?._base;
  const d = DEEP[curBranch] || DEEP["İçərişəhər"];

  const rfm = liveB ? {
    VIP: liveB.vipCount, loyal: liveB.loyalCount, casual: liveB.casualCount,
    atRisk: liveB.atRiskCount, oneTime: liveB.oneTimeCount,
  } : d.rfm;

  const hmMax = Math.max(...d.heatmap.flat(), 1);
  const heatColor = (v) => {
    if (!v) return "#F7F4EE";
    const a = Math.pow(v / hmMax, 0.6);
    return `rgba(27,58,107,${(0.08 + a * 0.82).toFixed(2)})`;
  };

  const days = lang === "az" ? DAYS_AZ : lang === "ru" ? DAYS_RU : DAYS_EN;

  const card = { background:C.panel, border:`1px solid ${C.line}`, borderRadius:14, padding:"16px 18px 14px" };
  const h = { fontFamily:SERIF, color:C.ink, fontSize:15, fontWeight:600, margin:"0 0 10px" };

  // CLV bars across branches
  const clvBars = BRANCHES.map(b => ({
    b, v: live?.byBranch?.[b]?._base?.avgTicket || DEEP[b]?.clv?.avg || 0,
  }));
  const clvMax = Math.max(...clvBars.map(x => x.v), 1);

  const totalRfm = Object.values(rfm).reduce((s,v)=>(s+(v||0)),0) || 1;
  const rfmSeg = [
    { label:t.vip,      v:rfm.VIP||0,     color:"#1B3A6B" },
    { label:t.loyal,    v:rfm.loyal||0,    color:"#CDA04B" },
    { label:t.casual,   v:rfm.casual||0,   color:"#6E8C6A" },
    { label:t.atRisk,   v:rfm.atRisk||0,   color:"#BF8329" },
    { label:t.oneTime,  v:rfm.oneTime||0,  color:"#C2B49B" },
  ];

  return (
    <div style={{ fontFamily:SANS }}>
      {/* Branch selector */}
      <div style={{ display:"flex", gap:8, marginBottom:"1.25rem", flexWrap:"wrap" }}>
        {(branchList.length ? branchList : BRANCHES).map(b => (
          <button key={b} onClick={()=>setBranch(b)} style={{
            fontSize:13, fontWeight:600, padding:"7px 16px", borderRadius:999, cursor:"pointer",
            border:`1.5px solid ${curBranch===b?"#1B3A6B":C.line}`,
            background:curBranch===b?"#1B3A6B":"transparent",
            color:curBranch===b?"#fff":C.sub,
          }}>{b}</button>
        ))}
      </div>

      {/* Key insight banner */}
      <div style={{ background:"#D6E4F5", border:"1px solid #A8C4E8", borderRadius:14, padding:"10px 16px", marginBottom:"1.25rem", fontSize:12.5, color:"#1A2D4A", lineHeight:1.5 }}>
        <strong>💡 {t.insight}:</strong> {d.insight[lang] || d.insight.en}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:12, marginBottom:12 }}>

        {/* Pareto */}
        <div style={card}>
          <div style={h}>📊 {t.paretoTitle}</div>
          {[
            { label:t.top10, v:d.pareto.top10, color:"#1B3A6B" },
            { label:t.top20, v:d.pareto.top20, color:"#CDA04B" },
            { label:t.top50, v:d.pareto.top50, color:"#6E8C6A" },
          ].map(row => (
            <div key={row.label} style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}>
                <span style={{ color:C.sub }}>{row.label}</span>
                <span style={{ fontWeight:600, color:row.color }}>{row.v}% {t.gəlir}</span>
              </div>
              <div style={{ height:6, background:C.line, borderRadius:4 }}>
                <div style={{ height:6, width:`${row.v}%`, background:row.color, borderRadius:4 }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop:12, paddingTop:10, borderTop:`1px solid ${C.line}`, display:"flex", gap:16, fontSize:11.5, color:C.sub }}>
            <span>🔄 {d.repeatRev}% {t.repeatRev}</span>
            <span>⏱ {d.retMed} {lang==="az"?"gün":lang==="ru"?"дн":"d"} {t.retMed}</span>
          </div>
        </div>

        {/* RFM Segments */}
        <div style={card}>
          <div style={h}>👥 {t.rfmTitle}</div>
          {rfmSeg.map(seg => (
            <div key={seg.label} style={{ marginBottom:9 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}>
                <span style={{ color:C.sub }}>{seg.label}</span>
                <span style={{ fontWeight:600, color:seg.color }}>{(seg.v||0).toLocaleString()}</span>
              </div>
              <div style={{ height:5, background:C.line, borderRadius:4 }}>
                <div style={{ height:5, width:`${Math.round((seg.v||0)/totalRfm*100)}%`, background:seg.color, borderRadius:4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap */}
      <div style={{...card, marginBottom:12}}>
        <div style={h}>🕐 {t.heatTitle}</div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ borderCollapse:"collapse", fontSize:9, color:C.sub }}>
            <thead>
              <tr>
                <td style={{ width:28, paddingRight:4 }} />
                {HOURS.map(h => (
                  <td key={h} style={{ width:18, textAlign:"center", paddingBottom:3, color:h===d.peak?"#1B3A6B":C.sub, fontWeight:h===d.peak?700:400 }}>
                    {h%3===0?h:""}
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.heatmap.map((row, di) => (
                <tr key={di}>
                  <td style={{ paddingRight:4, fontWeight:500, color:di>=5?"#CDA04B":C.sub }}>{days[di]}</td>
                  {row.map((v, hi) => (
                    <td key={hi} style={{ width:18, height:14, background:heatColor(v), borderRadius:2, border:`1px solid ${C.panel}` }} title={`${days[di]} ${hi}:00 — ${v}`} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize:10, color:C.sub, marginTop:6 }}>
          ★ {lang==="az"?"Pik saat":"Peak hour"}: {d.peak}:00
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:12, marginBottom:12 }}>

        {/* Cohort */}
        <div style={card}>
          <div style={h}>📈 {t.cohortTitle}</div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ borderCollapse:"collapse", fontSize:10 }}>
              <thead>
                <tr>
                  <td style={{ paddingRight:8, color:C.sub, fontSize:9 }}>{lang==="az"?"Ay":"Mo"}</td>
                  {[0,1,2,3,4,5].map(i=>(
                    <td key={i} style={{ width:36, textAlign:"center", color:C.sub, fontSize:9, paddingBottom:3 }}>
                      {lang==="az"?`+${i} ay`:`M+${i}`}
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.cohort.map((row,ri)=>(
                  <tr key={ri}>
                    <td style={{ paddingRight:8, color:C.sub, fontSize:9 }}>C{ri+1}</td>
                    {row.map((v,ci)=>{
                      const bg = v>=80?"rgba(27,58,107,0.7)":v>=60?"rgba(27,58,107,0.45)":v>=40?"rgba(27,58,107,0.25)":v>=20?"rgba(205,160,75,0.3)":"rgba(0,0,0,0.06)";
                      return <td key={ci} style={{ width:36, height:22, background:bg, borderRadius:3, textAlign:"center", fontSize:9, fontWeight:600, color:v>=60?"#fff":C.ink, border:`1px solid ${C.panel}` }}>{v}%</td>;
                    })}
                    {Array.from({length:6-row.length}).map((_,i)=>(
                      <td key={`e${i}`} style={{ width:36 }} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CLV */}
        <div style={card}>
          <div style={h}>💎 {t.clvTitle}</div>
          {clvBars.map(({b,v})=>(
            <div key={b} style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}>
                <span style={{ color:C.sub }}>{b}</span>
                <span style={{ fontWeight:600, color:"#1B3A6B" }}>₼{v}</span>
              </div>
              <div style={{ height:6, background:C.line, borderRadius:4 }}>
                <div style={{ height:6, width:`${Math.round(v/clvMax*100)}%`, background:"#1B3A6B", borderRadius:4 }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop:14, paddingTop:10, borderTop:`1px solid ${C.line}`, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
            {[
              { l:t.avgClv, v:d.clv.avg },
              { l:t.vipClv, v:d.clv.vip },
              { l:t.casClv, v:d.clv.casual },
            ].map(x=>(
              <div key={x.l} style={{ textAlign:"center", background:C.bg, borderRadius:8, padding:"6px 4px" }}>
                <div style={{ fontSize:9, color:C.sub, marginBottom:2 }}>{x.l}</div>
                <div style={{ fontSize:14, fontWeight:700, color:"#1B3A6B" }}>₼{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
