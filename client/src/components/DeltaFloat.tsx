interface DeltaFloatProps {
  id: number;
  value: number;
}

export function DeltaFloat({ value }: DeltaFloatProps) {
  const positive = value >= 0;
  return (
    <div
      className={`animate-float-up pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 text-2xl font-black drop-shadow-lg ${
        positive ? 'text-emerald-400' : 'text-red-500'
      }`}
    >
      {positive ? '+' : ''}
      {value} Smashes
    </div>
  );
}
