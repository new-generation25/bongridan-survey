import { cn } from '@/lib/utils';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export default function ProgressBar({ currentStep, totalSteps, className }: ProgressBarProps) {
  const percentage = (currentStep / totalSteps) * 100;

  return (
    <div className={cn('w-full', className)}>
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-textSecondary">
          {currentStep} / {totalSteps} 단계
        </span>
        <span className="text-sm font-medium text-primary">
          {Math.round(percentage)}%
        </span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 ease-in-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

