"use client";

import KPICards from "@/components/dashboard/KPICards";
import UsageChart from "@/components/dashboard/UsageChart";
import PerformanceChart from "@/components/dashboard/PerformanceChart";
import AIInsights from "@/components/dashboard/AIInsights";
import RecentQueries from "@/components/dashboard/RecentQueries";

export default function DashboardPage() {
  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-8 space-y-10">
    
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">
          Analytics Overview
        </h1>
        <p className="text-sm text-neutral-400 max-w-2xl">
          High-level visibility into database usage, performance, and operational health.
        </p>
      </div>

      <KPICards />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8">
          <UsageChart />
        </div>
        <div className="xl:col-span-4">
          <PerformanceChart />
        </div>
      </div>

      <AIInsights />

      <RecentQueries />
    </div>
  );
}