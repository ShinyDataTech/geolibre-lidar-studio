import React from "react";

interface SliderProps {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
  className = "",
}) => {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{label}</span>
          <span className="font-mono text-cyan-400 font-medium">
            {value}
            {unit}
          </span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
      />
    </div>
  );
};
