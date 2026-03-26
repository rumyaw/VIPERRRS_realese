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
import { Line } from "react-chartjs-2";
import type { AdminTimeline } from "@/lib/api";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function LineChart({ data }: { data: AdminTimeline }) {
  const labels = data.userRegistrations.map(d => d.date.slice(5)); // MM-DD

  const chartData = {
    labels,
    datasets: [
      {
        label: "Регистрации",
        data: data.userRegistrations.map(d => d.count),
        borderColor: "#06b6d4",
        backgroundColor: "rgba(6, 182, 212, 0.1)",
        tension: 0.4,
        fill: true,
      },
      {
        label: "Отклики",
        data: data.applications.map(d => d.count),
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245, 158, 11, 0.1)",
        tension: 0.4,
        fill: true,
      },
      {
        label: "Карточки",
        data: data.opportunities.map(d => d.count),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: { color: "#64748b" },
      },
    },
    scales: {
      x: {
        ticks: { color: "#94a3b8" },
        grid: { color: "rgba(148, 163, 184, 0.1)" },
      },
      y: {
        ticks: { color: "#94a3b8" },
        grid: { color: "rgba(148, 163, 184, 0.1)" },
        beginAtZero: true,
      },
    },
  };

  return <Line data={chartData} options={options} height={250} />;
}
