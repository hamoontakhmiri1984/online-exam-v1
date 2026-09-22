type StepIndicatorProps = {
  /** برچسب کوتاه هر مرحله، به ترتیب نمایش */
  steps: string[];
  /** ایندکس مرحله‌ی فعلی (از صفر) */
  currentIndex: number;
};

function StepIndicator({ steps, currentIndex }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2" dir="rtl">
      {steps.map((label, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <span
                className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-medium transition-colors ${
                  isCompleted
                    ? 'bg-brand-600 text-white'
                    : isCurrent
                    ? 'bg-brand-50 text-brand-700 border-2 border-brand-500 dark:bg-brand-950/40 dark:text-brand-300'
                    : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                }`}
              >
                {index + 1}
              </span>
              <span
                className={`text-[11px] whitespace-nowrap ${
                  isCurrent
                    ? 'text-gray-700 dark:text-gray-200 font-medium'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-1.5 rounded-full transition-colors ${
                  isCompleted ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-600'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default StepIndicator;
