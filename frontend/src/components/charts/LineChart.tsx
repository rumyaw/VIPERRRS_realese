"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import type { ChartOptions } from "chart.js";
import { Line } from "react-chartjs-2";
import type { AdminTimeline } from "@/lib/api";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const options: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: { left: 0, right: 4, top: 4, bottom: 0 },
  },
  plugins: {
    legend: {
      position: "top",
      labels: {
        color: "#64748b",
        boxWidth: 10,
        padding: 8,
        font: { size: 10 },
      },
    },
  },
  scales: {
    x: {
      ticks: {
        color: "#94a3b8",
        maxRotation: 50,
        minRotation: 0,
        autoSkip: true,
        maxTicksLimit: 10,
      },
      grid: { color: "rgba(148, 163, 184, 0.1)" },
    },
    y: {
      ticks: { color: "#94a3b8" },
      grid: { color: "rgba(148, 163, 184, 0.1)" },
      beginAtZero: true,
    },
  },
};

export default function LineChart({ data }: { data: AdminTimeline }) {
  const labels = data.userRegistrations.map((d) => d.date.slice(5));

  const chartData = {
    labels,
    datasets: [
      {
        label: "Регистрации",
        data: data.userRegistrations.map((d) => d.count),
        borderColor: "#06b6d4",
        backgroundColor: "rgba(6, 182, 212, 0.1)",
        tension: 0.4,
        fill: true,
      },
      {
        label: "Отклики",
        data: data.applications.map((d) => d.count),
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245, 158, 11, 0.1)",
        tension: 0.4,
        fill: true,
      },
      {
        label: "Карточки",
        data: data.opportunities.map((d) => d.count),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  return (
    <div className="relative h-full w-full min-w-0 max-w-full">
      <Line data={chartData} options={options} />
    </div>
  );
}
