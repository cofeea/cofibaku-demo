"use client";
import { DataProvider } from "@/lib/DataContext";
import CofiBakuDashboard from "@/components/CofiBakuDashboard";

export default function DashboardPage() {
  return (
    <DataProvider userId="demo">
      <CofiBakuDashboard user={null} />
    </DataProvider>
  );
}
