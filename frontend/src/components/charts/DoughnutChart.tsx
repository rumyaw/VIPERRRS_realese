"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import type { ChartOptions } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import type { AdminStats } from "@/lib/api";

ChartJS.register(ArcElement, Tooltip, Legend);

const options: ChartOptions<"doughnut"> = {
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: { left: 4, right: 4, top: 4, bottom: 8 },
  },
  plugins: {
    legend: {
      position: "bottom",
      labels: {
        color: "#64748b",
        boxWidth: 10,
        padding: 10,
        font: { size: 10 },
      },
    },
  },
};

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

  return (
    <div className="relative mx-auto h-full w-full min-w-0 max-w-full">
      <Doughnut data={data} options={options} />
    </div>
  );
}
