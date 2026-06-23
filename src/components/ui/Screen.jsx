export function Screen({ className = '', children }) {
  return (
    <div className={`min-h-screen bg-slate-950 flex flex-col max-w-md mx-auto px-5 ${className}`}>
      {children}
    </div>
  )
}
