export function Card({ className = '', children, ...props }) {
  return (
    <div
      className={`bg-slate-800 border border-slate-700/60 rounded-2xl ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
