const variants = {
  // Filled indigo — primary CTAs and form submit buttons
  primary:       'bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl',
  // Bordered — cancel / secondary actions
  secondary:     'border border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 font-medium rounded-xl',
  // Dark panel — header icon buttons with background
  panel:         'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl',
  // Indigo panel — header icon buttons (add button)
  'panel-accent':'bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl',
  // Text-only — ghost links
  ghost:         'text-slate-500 hover:text-slate-300 text-sm',
  // Confirm destructive action
  confirm:       'bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg',
  // Dismiss confirm prompt
  dismiss:       'bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg',
}

const sizes = {
  sm:   'px-3 py-1.5 text-xs',
  md:   'py-3 px-4 text-sm',
  lg:   'py-5 px-10 text-lg font-bold',
  icon: 'p-2.5',
  none: '',
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center gap-2 transition-all duration-150',
        'active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className,
      ].join(' ')}
      {...props}
    />
  )
}
