import { useState, useEffect, useRef } from 'react'

export default function HabitView({ habits, completions, streak, onComplete, onManage }) {
  const active = habits.filter((h) => h.is_active)
  const completed = active.filter((h) => completions.has(h.id))
  const uncompleted = active.filter((h) => !completions.has(h.id))
  const total = active.length
  const doneCount = completed.length
  const allDone = total > 0 && doneCount === total
  const progress = total > 0 ? (doneCount / total) * 100 : 0

  const currentHabit = uncompleted[0] || null

  // Animation state: 'in' | 'out' | 'pre-enter'
  const [animPhase, setAnimPhase] = useState('in')
  const [displayedHabit, setDisplayedHabit] = useState(currentHabit)
  const pendingComplete = useRef(null)

  // When the "real" current habit changes (after onComplete resolves),
  // swap displayed habit in with an entrance animation.
  useEffect(() => {
    if (currentHabit?.id !== displayedHabit?.id || (currentHabit === null && displayedHabit !== null)) {
      setAnimPhase('pre-enter')
      // Let the browser paint the off-screen starting position, then animate in.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDisplayedHabit(currentHabit)
          setAnimPhase('in')
        })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentHabit?.id, allDone])

  const handleComplete = async () => {
    if (animPhase !== 'in' || !displayedHabit) return
    const toComplete = displayedHabit
    pendingComplete.current = toComplete.id

    setAnimPhase('out')
    await new Promise((r) => setTimeout(r, 290))
    await onComplete(toComplete.id)
    // currentHabit will change, triggering useEffect above
  }

  const phaseStyle = {
    in: {
      transform: 'translateX(0)',
      opacity: 1,
      transition: 'transform 290ms cubic-bezier(0.4,0,0.2,1), opacity 290ms ease',
    },
    out: {
      transform: 'translateX(-110%)',
      opacity: 0,
      transition: 'transform 290ms cubic-bezier(0.4,0,0.2,1), opacity 290ms ease',
    },
    'pre-enter': {
      transform: 'translateX(110%)',
      opacity: 0,
      transition: 'none',
    },
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  if (total === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
        <div className="text-7xl mb-6 animate-pop-in">📋</div>
        <h1 className="text-2xl font-bold text-white mb-3">No habits yet</h1>
        <p className="text-slate-400 mb-10">Add your first habit to start building streaks.</p>
        <button
          onClick={onManage}
          className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold px-10 py-4 rounded-2xl transition-all text-lg shadow-lg shadow-indigo-500/20"
        >
          Add Habits
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col max-w-md mx-auto px-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between pt-safe mb-6">
        <div>
          <h1 className="text-lg font-bold text-white">Today</h1>
          <p className="text-slate-500 text-sm">{today}</p>
        </div>
        <button
          onClick={onManage}
          aria-label="Manage habits"
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-400 hover:text-white transition-all"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-slate-800 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">🔥</span>
          <div className="min-w-0">
            <p className="text-xl font-bold text-white leading-none">
              {streak}
              <span className="text-slate-400 text-sm font-normal ml-1">
                {streak === 1 ? 'day' : 'days'}
              </span>
            </p>
            <p className="text-slate-500 text-xs mt-0.5">streak</p>
          </div>
        </div>
        <div className="bg-slate-800 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div className="min-w-0">
            <p className="text-xl font-bold text-white leading-none">
              {doneCount}
              <span className="text-slate-400 text-sm font-normal">/{total}</span>
            </p>
            <p className="text-slate-500 text-xs mt-0.5">done today</p>
          </div>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
            style={{ width: `${progress}%`, transition: 'width 500ms cubic-bezier(0.4,0,0.2,1)' }}
          />
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col justify-center pb-safe">
        {allDone ? (
          <AllDone streak={streak} onManage={onManage} />
        ) : (
          <div className="overflow-hidden">
            <div style={phaseStyle[animPhase]}>
              {displayedHabit && (
                <HabitCard
                  habit={displayedHabit}
                  remaining={uncompleted.length}
                  onComplete={handleComplete}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function HabitCard({ habit, remaining, onComplete }) {
  return (
    <div className="bg-slate-800 border border-slate-700/60 rounded-3xl p-7 shadow-2xl">
      <p className="text-slate-500 text-sm mb-3">
        {remaining} {remaining === 1 ? 'habit' : 'habits'} remaining
      </p>
      <h2 className="text-3xl font-bold text-white leading-snug mb-2">{habit.name}</h2>
      {habit.description && (
        <p className="text-slate-400 text-base leading-relaxed mb-6">{habit.description}</p>
      )}

      <button
        onClick={onComplete}
        className="mt-6 w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.97] text-white font-bold text-lg py-5 rounded-2xl transition-all duration-150 shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Complete
      </button>
    </div>
  )
}

function AllDone({ streak, onManage }) {
  return (
    <div className="text-center animate-fade-up">
      <div className="text-7xl mb-5 animate-pop-in">🎉</div>
      <h2 className="text-3xl font-bold text-white mb-2">All done!</h2>
      <p className="text-slate-400 text-lg mb-3">You crushed it today.</p>
      {streak > 0 && (
        <div className="inline-flex items-center gap-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-semibold px-4 py-2 rounded-full text-sm mb-8">
          🔥 {streak} day {streak === 1 ? 'streak' : 'streak'} — keep it going!
        </div>
      )}
      <div className="mt-4">
        <button
          onClick={onManage}
          className="text-slate-500 hover:text-slate-300 transition-colors text-sm"
        >
          Manage habits →
        </button>
      </div>
    </div>
  )
}
