"use client";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const C = {
  bg:"#F6F2E9", ink:"#2A251E", sub:"#6E6457",
  gold:"#CDA04B", caramel:"#BE7A3C", line:"#E3DBCB", panel:"#FBF8F1",
};
const SERIF = "var(--brand-serif, Georgia), serif";
const SANS  = "var(--brand-sans, system-ui, sans-serif)";

const FEATURES = [
  { icon:"📊", az:"7 aylıq P&L analizi",         en:"7-month P&L analysis" },
  { icon:"💳", az:"Kart & müştəri analitikası",   en:"Card & customer analytics" },
  { icon:"🗓️", az:"F1, bayram, hava proqnozu",    en:"F1, holidays, weather forecast" },
  { icon:"🧠", az:"AI Coach (AZ/RU/EN)",          en:"AI Coach (AZ/RU/EN)" },
  { icon:"📈", az:"Gəlir Playboku + Simulator",   en:"Revenue Playbook + Simulator" },
  { icon:"📂", az:"Öz datasını yüklə — 2 dəq",   en:"Import your data — 2 min" },
];

export default function LandingPage() {
  const { data:session, status } = useSession();
  const router = useRouter();
  const [lang, setLang] = useState("az");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.push("/dashboard");
  }, [status, router]);

  const handleSignIn = async () => {
    setLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  if (status === "loading") return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:C.bg, fontFamily:SANS }}>
      <div style={{ fontSize:14, color:C.sub }}>Yüklənir...</div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:SANS, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px 16px" }}>

      {/* Lang toggle */}
      <div style={{ position:"fixed", top:16, right:16, display:"flex", gap:6 }}>
        {["az","en"].map(l => (
          <button key={l} onClick={()=>setLang(l)} style={{
            fontSize:11, padding:"4px 10px", borderRadius:999, cursor:"pointer",
            border:`1px solid ${lang===l?C.caramel:C.line}`,
            background:lang===l?C.caramel:"transparent",
            color:lang===l?"#fff":C.sub, fontWeight:600,
          }}>{l.toUpperCase()}</button>
        ))}
      </div>

      {/* Main card */}
      <div style={{ background:C.panel, border:`1px solid ${C.line}`, borderRadius:24, padding:"40px 36px", maxWidth:480, width:"100%", textAlign:"center" }}>

        {/* Logo */}
        <div style={{ fontSize:36, marginBottom:8 }}>☕</div>
        <div style={{ fontFamily:SERIF, fontSize:28, fontWeight:600, color:C.ink, marginBottom:6 }}>
          CofiBakuPromo
        </div>
        <div style={{ fontSize:13, color:C.sub, marginBottom:28, lineHeight:1.5 }}>
          {lang==="az"
            ? "Bakı qəhvəxanaları üçün AI-dəstəkli analitika · Nümunə demo"
            : "AI-powered analytics for Baku coffee shops · Sample demo"}
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

        {/* Sign in button */}
        <button onClick={handleSignIn} disabled={loading} style={{
          display:"flex", alignItems:"center", justifyContent:"center", gap:10,
          width:"100%", padding:"13px 20px", borderRadius:12, cursor:loading?"not-allowed":"pointer",
          background:loading?C.line:C.ink, color:"#fff", border:"none",
          fontSize:14, fontWeight:600, transition:"background .2s",
        }}>
          {loading ? (
            <span>{lang==="az"?"Yönləndirilir...":"Redirecting..."}</span>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {lang==="az"?"Google ilə daxil ol":"Sign in with Google"}
            </>
          )}
        </button>

        <div style={{ marginTop:16, fontSize:11, color:C.sub, lineHeight:1.6 }}>
          {lang==="az"
            ? "Daxil olduqdan sonra hazır nümunə data ilə bütün analitika tabları açılır. Öz fayllarını da yükləyə bilərsən."
            : "After signing in, all analytics tabs open with pre-loaded sample data. You can also import your own files."}
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
