import { ChangeEvent, useId } from 'react';
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
  name?: string;
}

export default function CheckboxGroup({
  label,
  options,
  values,
  onChange,
  required = false,
  error,
  layout = 'vertical',
  name,
}: CheckboxGroupProps) {
  const groupId = useId();
  const groupName = name || `checkbox-group-${groupId}`;
  
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
        <label className="block text-lg font-bold text-textPrimary mb-3" id={`${groupId}-label`}>
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}
      <div
        className={cn(
          'flex gap-3',
          layout === 'vertical' ? 'flex-col' : 'flex-wrap'
        )}
        role="group"
        aria-labelledby={label ? `${groupId}-label` : undefined}
      >
        {options.map((option) => {
          const optionId = `${groupId}-${option.value}`;
          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className={cn(
                'flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors',
                values.includes(option.value)
                  ? 'border-primary bg-blue-50'
                  : 'border-border hover:border-primary hover:bg-blue-50/50'
              )}
            >
              <input
                type="checkbox"
                id={optionId}
                name={groupName}
                value={option.value}
                checked={values.includes(option.value)}
                onChange={handleChange}
                className="w-5 h-5 text-primary rounded focus:ring-primary"
              />
              <span className="text-sm text-textPrimary">{option.label}</span>
            </label>
          );
        })}
      </div>
      {error && (
        <p className="mt-2 text-sm text-error">{error}</p>
      )}
    </div>
  );
}

