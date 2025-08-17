import React from "react";

interface ProgressBarProps {
  current: number;
  total: number;
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const percent = Math.round((current / total) * 100);
  return (
    <div className="w-full mb-6">
      <div className="flex justify-between text-sm text-gray-500 mb-1">
        <span>Step {current} of {total}</span>
        <span>{percent}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full">
        <div
          className="h-2 bg-gradient-to-r from-green-400 to-blue-500 rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
