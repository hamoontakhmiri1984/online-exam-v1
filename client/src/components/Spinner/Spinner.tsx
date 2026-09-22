function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <div className="h-10 w-10 rounded-full border-4 border-gray-200 border-t-brand-600 animate-spin dark:border-gray-700 dark:border-t-brand-500" />
      <span className="text-sm text-gray-400 dark:text-gray-500">
        در حال بارگذاری...
      </span>
    </div>
  );
}

export default Spinner;
