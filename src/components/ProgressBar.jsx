export function ProgressBar({ value, max, className = '' }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className={className}>
      <div className="flex justify-between text-xs text-slate-500 mb-1.5">
        <span>Progress</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
          style={{ width: `${pct}%`, transition: 'width 500ms cubic-bezier(0.4,0,0.2,1)' }}
        />
      </div>
    </div>
  )
}
