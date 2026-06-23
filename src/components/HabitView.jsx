import { useState, useEffect, useRef } from 'react'
import { Screen } from './ui/Screen'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { MenuIcon, CheckIcon } from './ui/Icons'
import { ProgressBar } from './ProgressBar'

export default function HabitView({ habits, completions, streak, onComplete, onManage }) {
  const active = habits.filter((h) => h.is_active)
  const completed = active.filter((h) => completions.has(h.id))
  const uncompleted = active.filter((h) => !completions.has(h.id))
  const total = active.length
  const doneCount = completed.length
  const allDone = total > 0 && doneCount === total

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
      <Screen className="items-center justify-center p-6 text-center">
        <div className="text-7xl mb-6 animate-pop-in">📋</div>
        <h1 className="text-2xl font-bold text-white mb-3">No habits yet</h1>
        <p className="text-slate-400 mb-10">Add your first habit to start building streaks.</p>
        <Button size="lg" onClick={onManage} className="rounded-2xl shadow-lg shadow-indigo-500/20">
          Add Habits
        </Button>
      </Screen>
    )
  }

  return (
    <Screen>
      {/* ── Header ── */}
      <div className="flex items-center justify-between pt-safe mb-6">
        <div>
          <h1 className="text-lg font-bold text-white">Today</h1>
          <p className="text-slate-500 text-sm">{today}</p>
        </div>
        <Button variant="panel" size="icon" onClick={onManage} aria-label="Manage habits">
          <MenuIcon />
        </Button>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard emoji="🔥" value={streak} label={streak === 1 ? 'day' : 'days'} sublabel="streak" />
        <StatCard emoji="✅" value={doneCount} label={`/${total}`} sublabel="done today" />
      </div>

      {/* ── Progress bar ── */}
      <ProgressBar value={doneCount} max={total} className="mb-8" />

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
    </Screen>
  )
}

function StatCard({ emoji, value, label, sublabel }) {
  return (
    <Card className="px-4 py-3 flex items-center gap-3 border-slate-700/60">
      <span className="text-2xl">{emoji}</span>
      <div className="min-w-0">
        <p className="text-xl font-bold text-white leading-none">
          {value}
          <span className="text-slate-400 text-sm font-normal ml-1">{label}</span>
        </p>
        <p className="text-slate-500 text-xs mt-0.5">{sublabel}</p>
      </div>
    </Card>
  )
}

function HabitCard({ habit, remaining, onComplete }) {
  return (
    <Card className="rounded-3xl p-7 shadow-2xl">
      <p className="text-slate-500 text-sm mb-3">
        {remaining} {remaining === 1 ? 'habit' : 'habits'} remaining
      </p>
      <h2 className="text-3xl font-bold text-white leading-snug mb-2">{habit.name}</h2>
      {habit.description && (
        <p className="text-slate-400 text-base leading-relaxed mb-6">{habit.description}</p>
      )}
      <Button
        size="lg"
        onClick={onComplete}
        className="mt-6 w-full rounded-2xl shadow-lg shadow-indigo-600/25"
      >
        <CheckIcon />
        Complete
      </Button>
    </Card>
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
        <Button variant="ghost" size="none" onClick={onManage}>
          Manage habits →
        </Button>
      </div>
    </div>
  )
}
