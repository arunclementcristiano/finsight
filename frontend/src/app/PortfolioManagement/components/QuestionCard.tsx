import React from "react";

interface QuestionCardProps {
  questionText: string;
  options: string[];
  selected: string | string[];
  onChange: (value: string | string[]) => void;
  multiSelect?: boolean;
}

export default function QuestionCard({ questionText, options, selected, onChange, multiSelect }: QuestionCardProps) {
  const isSelected = (option: string) => {
    if (multiSelect && Array.isArray(selected)) {
      return selected.includes(option);
    }
    return selected === option;
  };

  const handleClick = (option: string) => {
    if (multiSelect && Array.isArray(selected)) {
      if (selected.includes(option)) {
        onChange(selected.filter((o: string) => o !== option));
      } else {
        onChange([...selected, option]);
      }
    } else {
      onChange(option);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-4 text-lg font-semibold text-gray-800">{questionText}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map(option => (
          <button
            key={option}
            className={`rounded-xl p-4 border-2 transition-colors font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 ${isSelected(option) ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-700 hover:border-blue-300"}`}
            onClick={() => handleClick(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
