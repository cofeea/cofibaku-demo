"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const C = {
  bg:"#EAE6DF", ink:"#1A2D4A", sub:"#5B6D8A",
  gold:"#CDA04B", caramel:"#BE7A3C", line:"#D4CFC5", panel:"#F7F4EE",
  navy:"#1B3A6B",
};
const SERIF = "var(--brand-serif, Georgia), serif";
const SANS  = "var(--brand-sans, system-ui, sans-serif)";

const FEATURES = [
  { icon:"📊", az:"7 aylıq P&L analizi",        en:"7-month P&L analysis" },
  { icon:"💳", az:"Kart & müştəri analitikası",  en:"Card & customer analytics" },
  { icon:"🗓️", az:"F1, bayram, hava proqnozu",   en:"F1, holidays, weather forecast" },
  { icon:"🧠", az:"AI Coach (AZ/RU/EN)",         en:"AI Coach (AZ/RU/EN)" },
  { icon:"📈", az:"Gəlir Playboku + Simulator",  en:"Revenue Playbook + Simulator" },
  { icon:"📂", az:"Öz datasını yüklə — 2 dəq",  en:"Import your data — 2 min" },
];

export default function LandingPage() {
  const router = useRouter();
  const [lang, setLang] = useState("az");
  const [loading, setLoading] = useState(false);

  const handleEnter = () => {
    setLoading(true);
    router.push("/dashboard");
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:SANS, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px 16px" }}>

      {/* Lang toggle */}
      <div style={{ position:"fixed", top:16, right:16, display:"flex", gap:6 }}>
        {["az","en"].map(l => (
          <button key={l} onClick={()=>setLang(l)} style={{
            fontSize:11, padding:"4px 10px", borderRadius:999, cursor:"pointer",
            border:`1px solid ${lang===l?C.navy:C.line}`,
            background:lang===l?C.navy:"transparent",
            color:lang===l?"#fff":C.sub, fontWeight:600,
          }}>{l.toUpperCase()}</button>
        ))}
      </div>

      {/* Main card */}
      <div style={{ background:C.panel, border:`1px solid ${C.line}`, borderRadius:24, padding:"40px 36px", maxWidth:480, width:"100%", textAlign:"center" }}>

        {/* Logo */}
        <div style={{ fontSize:36, marginBottom:8 }}>☕</div>
        <div style={{ fontFamily:SERIF, fontSize:28, fontWeight:600, color:C.navy, marginBottom:6 }}>
          Kapi Coffee
        </div>
        <div style={{ fontSize:13, color:C.sub, marginBottom:28, lineHeight:1.5 }}>
          {lang==="az"
            ? "Bakı qəhvəxanaları üçün AI-dəstəkli analitika · Demo versiya"
            : "AI-powered analytics for Baku coffee shops · Demo version"}
        </div>

        {/* Feature pills */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:28, textAlign:"left" }}>
          {FEATURES.map(f => (
            <div key={f.icon} style={{ display:"flex", alignItems:"center", gap:7, background:C.bg, borderRadius:8, padding:"7px 10px", fontSize:12, color:C.ink }}>
              <span style={{ fontSize:14 }}>{f.icon}</span>
              <span>{lang==="az"?f.az:f.en}</span>
            </div>
          ))}
        </div>

        {/* Enter button */}
        <button onClick={handleEnter} disabled={loading} style={{
          display:"flex", alignItems:"center", justifyContent:"center", gap:10,
          width:"100%", padding:"13px 20px", borderRadius:12, cursor:loading?"not-allowed":"pointer",
          background:loading?C.line:C.navy, color:"#fff", border:"none",
          fontSize:14, fontWeight:600, transition:"background .2s",
        }}>
          {loading
            ? (lang==="az"?"Açılır...":"Opening...")
            : (lang==="az"?"Demo dashboarda keç →":"Open demo dashboard →")}
        </button>

        <div style={{ marginTop:16, fontSize:11, color:C.sub, lineHeight:1.6 }}>
          {lang==="az"
            ? "Hazır nümunə data ilə bütün analitika tabları açılır. Öz fayllarını da yükləyə bilərsən."
            : "All analytics tabs open with pre-loaded sample data. You can also import your own files."}
        </div>
      </div>

      {/* Sample data badge */}
      <div style={{ marginTop:16, fontSize:11, color:C.sub, display:"flex", alignItems:"center", gap:6 }}>
        <span style={{ background:`${C.gold}30`, border:`1px solid ${C.gold}60`, borderRadius:999, padding:"2px 10px", color:"#7A5500", fontWeight:600 }}>
          ★ {lang==="az"?"Nümunə data ilə açılır":"Opens with sample data"}
        </span>
        <span>·</span>
        <span>{lang==="az"?"Kapi Coffee (xəyali zəncir)":"Kapi Coffee (fictional chain)"}</span>
      </div>
    </div>
  );
}
