"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { fetchAdminStats, fetchAdminTimeline, fetchPendingCompanies, fetchPendingOpportunities, setCompanyVerification, setOpportunityModerationStatus } from "@/lib/api";
import type { AdminStats, AdminTimeline, PendingCompany } from "@/lib/api";
import { TrendingUp } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserGroupIcon, Briefcase01Icon, CheckmarkCircle01Icon, Building01Icon, AlertCircleIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/cn";
import { useToast } from "@/hooks/useToast";

// Динамический импорт chart.js для избежания SSR issues
import dynamic from "next/dynamic";

const LineChart = dynamic(() => import("@/components/charts/LineChart"), { ssr: false });
// const BarChart = dynamic(() => import("@/components/charts/BarChart"), { ssr: false });
const DoughnutChart = dynamic(() => import("@/components/charts/DoughnutChart"), { ssr: false });

// const DARK_MAP_STYLE = [];

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [timeline, setTimeline] = useState<AdminTimeline | null>(null);
  const [pendingCompanies, setPendingCompanies] = useState<PendingCompany[]>([]);
  const [pendingOpps, setPendingOpps] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    if (!user || user.role !== "curator") {
      router.replace("/dashboard");
      return;
    }
    loadData();
  }, [user, router]);

  const loadData = async () => {
    try {
      const [statsData, timelineData, companies, opps] = await Promise.all([
        fetchAdminStats(),
        fetchAdminTimeline(),
        fetchPendingCompanies(),
        fetchPendingOpportunities(),
      ]);
      setStats(statsData);
      setTimeline(timelineData);
      setPendingCompanies(companies);
      setPendingOpps(opps);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCompany = async (userId: string, verified: boolean) => {
    try {
      await setCompanyVerification(userId, verified);
      setPendingCompanies(prev => prev.filter(c => c.userId !== userId));
      showToast("Статус обновлён", "success");
    } catch (e) {
      console.error(e);
      showToast("Не удалось выполнить операцию", "error");
    }
  };

  const handleModerateOpp = async (oppId: string, status: string) => {
    try {
      await setOpportunityModerationStatus(oppId, status);
      setPendingOpps(prev => prev.filter(o => o.id !== oppId));
      showToast("Статус обновлён", "success");
    } catch (e) {
      console.error(e);
      showToast("Не удалось выполнить операцию", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-cyan)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Панель администратора</h1>
          <p className="mt-1 text-[var(--text-secondary)]">Куратор платформы</p>
        </div>
        <Link
          href="/"
          className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          ← На главную
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          icon={<HugeiconsIcon icon={UserGroupIcon} size={20} />}
          label="Пользователей"
          value={stats?.totalUsers || 0}
          color="from-blue-500 to-cyan-500"
        />
        <StatCard
          icon={<HugeiconsIcon icon={Briefcase01Icon} size={20} />}
          label="Карточек"
          value={stats?.totalOpportunities || 0}
          color="from-emerald-500 to-teal-500"
        />
        <StatCard
          icon={<HugeiconsIcon icon={CheckmarkCircle01Icon} size={20} />}
          label="Откликов"
          value={stats?.totalApplications || 0}
          color="from-amber-500 to-orange-500"
        />
        <StatCard
          icon={<HugeiconsIcon icon={Building01Icon} size={20} />}
          label="На верификацию"
          value={stats?.pendingVerifications || 0}
          color="from-purple-500 to-pink-500"
          alert={!!(stats && stats.pendingVerifications > 0)}
        />
        <StatCard
          icon={<HugeiconsIcon icon={AlertCircleIcon} size={20} />}
          label="На модерацию"
          value={stats?.pendingModeration || 0}
          color="from-red-500 to-rose-500"
          alert={!!(stats && stats.pendingModeration > 0)}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassPanel className="p-5">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
            <TrendingUp className="h-5 w-5 text-[var(--brand-cyan)]" />
            Активность за 30 дней
          </h3>
          {timeline && <LineChart data={timeline} />}
        </GlassPanel>

        <GlassPanel className="p-5">
          <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Распределение по типам</h3>
          {stats && <DoughnutChart stats={stats} />}
        </GlassPanel>
      </div>

      {/* Moderation Queue */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Companies */}
        <GlassPanel className="p-5">
          <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
            Верификация компаний ({pendingCompanies.length})
          </h3>
          {pendingCompanies.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">Нет компаний на верификацию</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {pendingCompanies.map((company) => (
                <div
                  key={company.userId}
                  className="flex items-center justify-between gap-3 rounded-lg bg-[var(--glass-bg-strong)] p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--text-primary)] truncate">{company.companyName}</p>
                    <p className="text-xs text-[var(--text-secondary)]">ИНН: {company.inn || "не указан"}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{company.email}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleVerifyCompany(company.userId, true)}
                      className="rounded bg-emerald-500/20 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-500/30"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => handleVerifyCompany(company.userId, false)}
                      className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-200 hover:bg-red-500/30"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>

        {/* Opportunities */}
        <GlassPanel className="p-5">
          <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
            Модерация карточек ({pendingOpps.length})
          </h3>
          {pendingOpps.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">Нет карточек на модерацию</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {pendingOpps.map((opp: Record<string, unknown>) => (
                <div
                  key={String(opp.id)}
                  className="flex items-center justify-between gap-3 rounded-lg bg-[var(--glass-bg-strong)] p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--text-primary)] truncate">{String(opp.title)}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{String(opp.companyName || "Компания")}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleModerateOpp(String(opp.id), "approved")}
                      className="rounded bg-emerald-500/20 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-500/30"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => handleModerateOpp(String(opp.id), "rejected")}
                      className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-200 hover:bg-red-500/30"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}

function StatCard({ 
  icon, 
  label, 
  value, 
  color, 
  alert 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number; 
  color: string;
  alert?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4",
        alert && "border-amber-500/50"
      )}
    >
      <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br ${color} opacity-20 blur-2xl`} />
      <div className="relative">
        <div className={`inline-flex rounded-lg bg-gradient-to-br ${color} p-2 text-white`}>
          {icon}
        </div>
        <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{value.toLocaleString("ru-RU")}</p>
        <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      </div>
    </motion.div>
  );
}
