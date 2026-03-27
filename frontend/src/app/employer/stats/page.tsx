"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";
import { useAuth } from "@/contexts/auth-context";
import { GlassPanel } from "@/components/ui/GlassPanel";
import {
  fetchEmployerOpportunities,
  fetchEmployerApplications,
  type EmployerApplication,
} from "@/lib/api";
import type { Opportunity } from "@/lib/types";
import { BarChart3, FileText, Users, TrendingUp, Eye } from "lucide-react";

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

function StatCard({
  label,
  value,
  icon,
  accent,
  delay,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="h-full"
    >
      <GlassPanel className="flex h-full min-h-[112px] items-center gap-4 p-5">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
          style={{ background: accent }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold leading-tight text-[var(--text-primary)]">{value}</p>
          <p className="mt-1 text-xs leading-snug text-[var(--text-secondary)]">{label}</p>
        </div>
      </GlassPanel>
    </motion.div>
  );
}

function buildTimelineData(applications: EmployerApplication[]) {
  const now = new Date();
  const days: string[] = [];
  const counts: number[] = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push(key.slice(5));
    const count = applications.filter((a) => a.createdAt?.slice(0, 10) === key).length;
    counts.push(count);
  }

  return { days, counts };
}

export default function EmployerStatsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<EmployerApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== "employer") {
      router.replace("/dashboard");
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [opp, apps] = await Promise.all([
          fetchEmployerOpportunities(),
          fetchEmployerApplications(),
        ]);
        if (!cancelled) {
          setOpportunities(opp);
          setApplications(apps);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user, router]);

  const statusCounts = useMemo(() => {
    const m = { pending: 0, accepted: 0, rejected: 0, reserve: 0 };
    for (const a of applications) {
      if (a.status in m) m[a.status as keyof typeof m]++;
    }
    return m;
  }, [applications]);

  const timeline = useMemo(() => buildTimelineData(applications), [applications]);

  const totalViews = useMemo(
    () => opportunities.reduce((s, o) => s + (o.viewCount ?? 0), 0),
    [opportunities],
  );

  const doughnutData = {
    labels: ["На рассмотрении", "Приняты", "Отклонены", "В резерве"],
    datasets: [
      {
        data: [statusCounts.pending, statusCounts.accepted, statusCounts.rejected, statusCounts.reserve],
        backgroundColor: [
          "rgba(245, 158, 11, 0.8)",
          "rgba(16, 185, 129, 0.8)",
          "rgba(239, 68, 68, 0.8)",
          "rgba(59, 130, 246, 0.8)",
        ],
        borderColor: [
          "rgba(245, 158, 11, 1)",
          "rgba(16, 185, 129, 1)",
          "rgba(239, 68, 68, 1)",
          "rgba(59, 130, 246, 1)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { bottom: 8 } },
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          boxWidth: 12,
          padding: 12,
          font: { size: 11 },
          color: "#64748b",
        },
      },
    },
  };

  const lineData = {
    labels: timeline.days,
    datasets: [
      {
        label: "Отклики",
        data: timeline.counts,
        borderColor: "#06b6d4",
        backgroundColor: "rgba(6, 182, 212, 0.1)",
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 6,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { left: 4, right: 8 } },
    plugins: {
      legend: {
        position: "top" as const,
        labels: { color: "#64748b", font: { size: 11 } },
      },
    },
    scales: {
      x: {
        ticks: { color: "#475569", maxRotation: 45, minRotation: 0, autoSkip: true, maxTicksLimit: 8 },
        grid: { color: "rgba(100, 116, 139, 0.12)" },
      },
      y: {
        ticks: { color: "#475569", stepSize: 1 },
        grid: { color: "rgba(100, 116, 139, 0.12)" },
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl py-12">
        <GlassPanel className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-cyan)] border-t-transparent" />
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-0.5 min-[400px]:px-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Статистика</h1>
          <p className="mt-1 text-[var(--text-secondary)]">
            Обзор ваших карточек и откликов
          </p>
        </div>
        <Link
          href="/employer/opportunities"
          className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          ← Мои карточки
        </Link>
      </div>

      <div className="grid auto-rows-fr grid-cols-1 gap-3 min-[480px]:grid-cols-2 min-[900px]:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Опубликовано карточек"
          value={opportunities.length}
          icon={<FileText className="h-6 w-6 text-white" />}
          accent="rgba(6, 182, 212, 0.25)"
          delay={0}
        />
        <StatCard
          label="Всего откликов"
          value={applications.length}
          icon={<Users className="h-6 w-6 text-white" />}
          accent="rgba(16, 185, 129, 0.25)"
          delay={0.05}
        />
        <StatCard
          label="На рассмотрении"
          value={statusCounts.pending}
          icon={<TrendingUp className="h-6 w-6 text-white" />}
          accent="rgba(245, 158, 11, 0.25)"
          delay={0.1}
        />
        <StatCard
          label="Принято"
          value={statusCounts.accepted}
          icon={<BarChart3 className="h-6 w-6 text-white" />}
          accent="rgba(139, 92, 246, 0.25)"
          delay={0.15}
        />
        <StatCard
          label="Просмотры карточек (всего)"
          value={totalViews}
          icon={<Eye className="h-6 w-6 text-white" />}
          accent="rgba(249, 115, 22, 0.28)"
          delay={0.18}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 min-[800px]:grid-cols-2 min-[800px]:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="min-w-0"
        >
          <GlassPanel className="p-4 min-[400px]:p-5">
            <h2 className="mb-3 text-base font-semibold text-[var(--text-primary)] min-[400px]:text-lg">
              Отклики по статусу
            </h2>
            <div className="relative mx-auto h-[240px] w-full max-w-full min-[400px]:h-[280px]">
              {applications.length > 0 ? (
                <Doughnut data={doughnutData} options={doughnutOptions} />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[var(--text-secondary)]">
                  Нет данных для отображения
                </div>
              )}
            </div>
          </GlassPanel>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="min-w-0"
        >
          <GlassPanel className="p-4 min-[400px]:p-5">
            <h2 className="mb-3 text-base font-semibold text-[var(--text-primary)] min-[400px]:text-lg">
              Отклики за 30 дней
            </h2>
            <div className="relative mx-auto h-[240px] w-full max-w-full min-[400px]:h-[280px]">
              <Line data={lineData} options={lineOptions} />
            </div>
          </GlassPanel>
        </motion.div>
      </div>
    </div>
  );
}
