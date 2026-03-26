"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const chartData = {
    labels: data.map(d => d.label),
    datasets: [
      {
        label: "Количество",
        data: data.map(d => d.value),
        backgroundColor: "rgba(6, 182, 212, 0.8)",
        borderColor: "rgba(6, 182, 212, 1)",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
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

  return <Bar data={chartData} options={options} height={200} />;
}
