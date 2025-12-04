import { ChangeEvent } from 'react';
import { cn } from '@/lib/utils';

interface RadioOption {
  label: string;
  value: string;
}

interface RadioGroupProps {
  label?: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  name: string;
  required?: boolean;
  error?: string;
  layout?: 'vertical' | 'horizontal';
}

export default function RadioGroup({
  label,
  options,
  value,
  onChange,
  name,
  required = false,
  error,
  layout = 'vertical',
}: RadioGroupProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-textPrimary mb-3">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}
      <div
        className={cn(
          'flex gap-3',
          layout === 'vertical' ? 'flex-col' : 'flex-wrap'
        )}
      >
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors',
              value === option.value
                ? 'border-primary bg-blue-50'
                : 'border-border hover:border-primary hover:bg-blue-50/50'
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={handleChange}
              className="w-5 h-5 text-primary focus:ring-primary"
            />
            <span className="text-base text-textPrimary">{option.label}</span>
          </label>
        ))}
      </div>
      {error && (
        <p className="mt-2 text-sm text-error">{error}</p>
      )}
    </div>
  );
}

