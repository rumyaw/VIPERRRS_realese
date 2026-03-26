"use client";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import type { AdminStats } from "@/lib/api";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function DoughnutChart({ stats }: { stats: AdminStats }) {
  const data = {
    labels: ["Пользователи", "Карточки", "Отклики"],
    datasets: [
      {
        data: [stats.totalUsers, stats.totalOpportunities, stats.totalApplications],
        backgroundColor: [
          "rgba(6, 182, 212, 0.8)",
          "rgba(16, 185, 129, 0.8)",
          "rgba(245, 158, 11, 0.8)",
        ],
        borderColor: [
          "rgba(6, 182, 212, 1)",
          "rgba(16, 185, 129, 1)",
          "rgba(245, 158, 11, 1)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { color: "#64748b" },
      },
    },
  };

  return <Doughnut data={data} options={options} height={200} />;
}
