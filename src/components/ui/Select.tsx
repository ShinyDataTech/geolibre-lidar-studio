import React from "react";

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  className = "",
  ...props
}) => {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && <label className="text-xs text-slate-400 block font-medium">{label}</label>}
      <select
        value={value}
        onChange={onChange}
        className="w-full bg-slate-900 border border-slate-750 hover:border-slate-600 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-200">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
