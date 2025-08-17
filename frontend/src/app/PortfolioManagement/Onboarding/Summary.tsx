"use client";
import React from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend } from "chart.js";
Chart.register(ArcElement, Tooltip, Legend);

interface SummaryProps {
  plan: {
    riskLevel: string;
    buckets: Array<{
      class: string;
      pct: number;
      range: [number, number];
      riskCategory: string;
      notes: string;
    }>;
  };
}

export default function Summary({ plan }: SummaryProps) {
  const chartData = {
    labels: plan.buckets.map(b => b.class),
    datasets: [
      {
        data: plan.buckets.map(b => b.pct),
        backgroundColor: [
          "#3b82f6", // blue
          "#10b981", // green
          "#f59e42", // orange
          "#fbbf24", // yellow
          "#6366f1", // indigo
          "#ef4444", // red
          "#a3e635", // lime
        ],
        borderWidth: 2,
        borderColor: "#fff",
      },
    ],
  };
  const chartOptions = {
    plugins: {
      legend: {
        display: true,
        position: "bottom" as const,
        labels: {
          font: { size: 14 },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.label}: ${context.parsed}%`;
          },
        },
      },
    },
    cutout: "70%",
    responsive: true,
    maintainAspectRatio: false,
  };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-green-100 p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-8 flex flex-col items-center">
        <h2 className="text-2xl font-bold text-blue-700 mb-2 text-center">Portfolio Summary</h2>
        <div className="flex flex-col items-center mb-6">
          <span className="inline-block rounded-full bg-blue-100 px-4 py-2 text-blue-700 font-bold text-lg shadow-sm mb-2">
            Risk Level: <span className="text-blue-800">{plan.riskLevel}</span>
          </span>
        </div>
        <div className="w-full flex flex-col items-center mb-8">
          <div className="w-full max-w-xs h-64">
            <Doughnut data={chartData} options={chartOptions} />
          </div>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="min-w-[500px] w-full text-left border border-gray-200 rounded-xl shadow-lg mt-4">
            <thead className="bg-blue-50 sticky top-0 z-10">
              <tr>
                <th className="py-3 px-3 border-b font-semibold text-gray-700">Asset Class</th>
                <th className="py-3 px-3 border-b font-semibold text-gray-700">% Allocation</th>
                <th className="py-3 px-3 border-b font-semibold text-gray-700">Range</th>
                <th className="py-3 px-3 border-b font-semibold text-gray-700">Risk Category</th>
                <th className="py-3 px-3 border-b font-semibold text-gray-700">Notes</th>
              </tr>
            </thead>
            <tbody>
              {plan.buckets.map((b: any, idx: number) => (
                <tr key={b.class} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="py-3 px-3 border-b text-gray-900 font-medium">{b.class}</td>
                  <td className="py-3 px-3 border-b text-blue-700 font-semibold">{b.pct}%</td>
                  <td className="py-3 px-3 border-b text-gray-700">{b.range[0]}% – {b.range[1]}%</td>
                  <td className="py-3 px-3 border-b text-green-700 font-semibold">{b.riskCategory}</td>
                  <td className="py-3 px-3 border-b text-gray-600 italic">{b.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row gap-4 mt-8 justify-center">
          <button className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition" onClick={() => alert('Plan saved! (placeholder)')}>
            Save Plan
          </button>
          <button className="px-6 py-3 rounded-lg bg-green-500 text-white font-semibold shadow hover:bg-green-600 transition" onClick={() => alert('Navigate to Add Holdings (placeholder)')}>
            Add Holdings
          </button>
          <button className="px-6 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold shadow hover:bg-gray-300 transition" onClick={() => alert('Navigate to Dashboard (placeholder)')}>
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
