import { ChangeEvent } from 'react';
import { cn } from '@/lib/utils';

interface CheckboxOption {
  label: string;
  value: string;
}

interface CheckboxGroupProps {
  label?: string;
  options: CheckboxOption[];
  values: string[];
  onChange: (values: string[]) => void;
  required?: boolean;
  error?: string;
  layout?: 'vertical' | 'horizontal';
}

export default function CheckboxGroup({
  label,
  options,
  values,
  onChange,
  required = false,
  error,
  layout = 'vertical',
}: CheckboxGroupProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    if (checked) {
      onChange([...values, value]);
    } else {
      onChange(values.filter((v) => v !== value));
    }
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
              values.includes(option.value)
                ? 'border-primary bg-blue-50'
                : 'border-border hover:border-primary hover:bg-blue-50/50'
            )}
          >
            <input
              type="checkbox"
              value={option.value}
              checked={values.includes(option.value)}
              onChange={handleChange}
              className="w-5 h-5 text-primary rounded focus:ring-primary"
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

