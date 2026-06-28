"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DataProvider } from "@/lib/DataContext";
import CofiBakuDashboard from "@/components/CofiBakuDashboard";

export default function DashboardPage() {
  const { data:session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  if (status === "loading") return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#F6F2E9", fontFamily:"system-ui,sans-serif", color:"#6E6457", fontSize:14 }}>
      Yüklənir...
    </div>
  );

  if (!session) return null;

  return (
    <DataProvider userId={session.user.id}>
      <CofiBakuDashboard user={session.user} />
    </DataProvider>
  );
}
