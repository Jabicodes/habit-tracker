import { useState, useEffect, lazy, Suspense } from 'react'
import { supabase } from '../lib/supabase'

const PomodoroTimer = lazy(() => import('./PomodoroTimer'))

// ── Constants ────────────────────────────────────────────────────────────────

const ORANGE = '#FF8A65'
const BG     = '#111418'
const CARD   = '#2A2D34'
const MUTED  = '#8E8E93'
const BORDER = 'rgba(255,255,255,0.08)'

// ── Date helpers (always local timezone) ─────────────────────────────────────

function localDateStr(d) {
  const yyyy = d.getFullYear()
  const mm   = String(d.getMonth() + 1).padStart(2, '0')
  const dd   = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const todayStr = () => localDateStr(new Date())

function getWeekDays(todayString) {
  const [y, m, d] = todayString.split('-').map(Number)
  const todayDate = new Date(y, m - 1, d)
  const daysFromMonday = (todayDate.getDay() + 6) % 7
  const monday = new Date(todayDate)
  monday.setDate(d - daysFromMonday)
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    return day
  })
}

const WEEK_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function formatFocusTime(minutes) {
  if (!minutes) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// ── Root component ───────────────────────────────────────────────────────────

export default function HabitView({
  habits,
  completions,
  onComplete,
  onManage,
  username,
  userId,
  onSignOut,
}) {
  const active    = habits.filter((h) => h.is_active)
  const total     = active.length
  const doneCount = active.filter((h) => completions.has(h.id)).length

  const [activeTab,   setActiveTab]   = useState('home')
  const [weekData,    setWeekData]    = useState({})
  const [byDate,      setByDate]      = useState({})
  const [localStreak, setLocalStreak] = useState(0)
  const [selectedDay, setSelectedDay] = useState(null)
  const [pomStats,    setPomStats]    = useState({ minutes: 0, sessions: 0 })

  const today           = todayStr()
  const weekDays        = getWeekDays(today)
  const viewDay         = selectedDay || today
  const isViewingPast   = viewDay !== today
  const viewCompletions = isViewingPast ? (byDate[viewDay] || new Set()) : completions

  // ── Fetch completion history ──────────────────────────────────────────────
  useEffect(() => {
    if (!userId || !habits.length) {
      setLocalStreak(0)
      setWeekData({})
      setByDate({})
      return
    }
    const activeHabits = habits.filter((h) => h.is_active)

    const fetchData = async () => {
      const since = new Date()
      since.setDate(since.getDate() - 90)

      const { data } = await supabase
        .from('daily_completions')
        .select('habit_id, completed_date')
        .eq('user_id', userId)
        .gte('completed_date', since.toISOString().split('T')[0])

      const rawDb = {}
      ;(data || []).forEach((c) => {
        rawDb[c.completed_date] = rawDb[c.completed_date] || new Set()
        rawDb[c.completed_date].add(c.habit_id)
      })

      setByDate({ ...rawDb, [today]: completions })

      const ids         = activeHabits.map((h) => h.id)
      const setForDay   = (ds) => ds === today ? completions : (rawDb[ds] || new Set())
      const isDayDone   = (ds) => ids.length > 0 && ids.every((id) => setForDay(ds).has(id))
      const isAnyDone   = (ds) => ids.some((id) => setForDay(ds).has(id))

      const weekResult = {}
      getWeekDays(today).forEach((date) => {
        const ds = localDateStr(date)
        if (ds > today)          weekResult[ds] = 'future'
        else if (ds === today)   weekResult[ds] = 'today'
        else if (isDayDone(ds))  weekResult[ds] = 'complete'
        else if (isAnyDone(ds))  weekResult[ds] = 'partial'
        else                     weekResult[ds] = 'missed'
      })
      setWeekData(weekResult)

      let count = 0
      const start = isDayDone(today) ? 0 : 1
      for (let i = start; i < 90; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const ds = localDateStr(d)
        if (isDayDone(ds)) count++
        else break
      }
      setLocalStreak(count)
    }

    fetchData()
  }, [userId, habits, completions])

  // ── Fetch pomodoro focus stats (this week) ────────────────────────────────
  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const since = new Date()
      since.setDate(since.getDate() - 7)
      const { data } = await supabase
        .from('pomodoro_sessions')
        .select('duration_minutes')
        .eq('user_id', userId)
        .eq('session_type', 'focus')
        .eq('completed', true)
        .gte('created_at', since.toISOString())
      if (data) {
        const mins = data.reduce((s, r) => s + (r.duration_minutes || 0), 0)
        setPomStats({ minutes: mins, sessions: data.length })
      }
    })()
  }, [userId])

  const handleDaySelect = (ds) => {
    setSelectedDay(ds === today ? null : ds)
    if (activeTab !== 'home') setActiveTab('home')
  }

  // Weekly habit completion ratio across all past days this week
  const weeklyRatio = (() => {
    if (total === 0) return 0
    const past = weekDays.filter((d) => localDateStr(d) <= today)
    if (!past.length) return 0
    const done = past.reduce((s, d) => s + (byDate[localDateStr(d)]?.size || 0), 0)
    return Math.round((done / (past.length * total)) * 100)
  })()

  return (
    <div className="min-h-screen app-fade-in" style={{ backgroundColor: BG, color: '#fff' }}>

      {activeTab === 'sessions' ? (
        <Suspense fallback={<LoadingSpinner />}>
          <PomodoroTimer
            userId={userId}
            username={username}
            habits={active}
            completions={completions}
            onComplete={onComplete}
          />
        </Suspense>
      ) : (
        <div style={{ paddingBottom: 88 }}>
          {activeTab === 'home' && (
            <DashboardHome
              username={username}
              doneCount={doneCount}
              total={total}
              localStreak={localStreak}
              pomStats={pomStats}
              weeklyRatio={weeklyRatio}
              weekDays={weekDays}
              byDate={byDate}
              today={today}
              active={active}
              completions={completions}
              onComplete={onComplete}
              onManage={onManage}
            />
          )}
          {activeTab === 'stats' && (
            <StatsTab streak={localStreak} doneCount={doneCount} total={total} />
          )}
          {activeTab === 'profile' && (
            <ProfileTab username={username || 'there'} onSignOut={onSignOut} onManage={onManage} />
          )}
        </div>
      )}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

// ── Dashboard Home ───────────────────────────────────────────────────────────

function DashboardHome({
  username, doneCount, total, localStreak, pomStats, weeklyRatio,
  weekDays, byDate, today, active, completions, onComplete, onManage,
}) {
  return (
    <div className="px-6 pt-4">

      {/* ── Bento metric cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <MetricCard
          label="Focus Time"
          value={formatFocusTime(pomStats.minutes)}
          badge={`${pomStats.sessions} sessions`}
        />
        <MetricCard
          label="Sessions"
          value={String(pomStats.sessions)}
          badge="This week"
        />
        <MetricCard
          label="Focus Ratio"
          value={`${weeklyRatio}%`}
          badge="Weekly avg"
        />
      </div>

      {/* ── Analytics + habits split ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        <div className="lg:col-span-3">
          <WeeklyChartCard
            weekDays={weekDays}
            byDate={byDate}
            total={total}
            today={today}
          />
        </div>
        <div className="lg:col-span-2">
          <HabitsPanel
            active={active}
            completions={completions}
            onComplete={onComplete}
            doneCount={doneCount}
            total={total}
            onManage={onManage}
          />
        </div>
      </div>

    </div>
  )
}

// ── Bento metric card ────────────────────────────────────────────────────────

function MetricCard({ label, value, badge }) {
  return (
    <div
      className="rounded-2xl p-5 border transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-700/50"
      style={{
        background: 'rgba(18,18,20,0.6)',
        borderColor: 'rgba(39,39,42,0.3)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <p
        className="text-xs font-medium uppercase mb-3"
        style={{ color: '#71717a', letterSpacing: '0.08em' }}
      >
        {label}
      </p>
      <p
        className="text-2xl font-semibold tracking-tight mb-3"
        style={{ color: '#f4f4f5' }}
      >
        {value}
      </p>
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
        style={{ background: 'rgba(249,115,22,0.1)', color: '#fb923c' }}
      >
        {badge}
      </span>
    </div>
  )
}

// ── Weekly trend chart ───────────────────────────────────────────────────────

function WeeklyChartCard({ weekDays, byDate, total, today }) {
  return (
    <div
      className="rounded-2xl border transition-all duration-300 hover:border-zinc-700/50"
      style={{
        background: 'rgba(18,18,20,0.6)',
        borderColor: 'rgba(39,39,42,0.3)',
        backdropFilter: 'blur(12px)',
        padding: '24px',
      }}
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-sm font-medium" style={{ color: '#f4f4f5' }}>
            Weekly Overview
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#71717a' }}>
            Habit completion rate
          </p>
        </div>
        <span className="text-xs" style={{ color: '#52525b' }}>This week</span>
      </div>
      <div style={{ height: 110 }}>
        <WeeklyChartSVG
          weekDays={weekDays}
          byDate={byDate}
          total={total}
          today={today}
        />
      </div>
    </div>
  )
}

function WeeklyChartSVG({ weekDays, byDate, total, today }) {
  const VW = 380, VH = 100
  const PL = 8, PR = 8, PT = 8, PB = 26
  const PW = VW - PL - PR
  const PH = VH - PT - PB
  const xStep = PW / 6

  const toX = (i) => PL + i * xStep
  const toY = (pct) => PT + PH - (Math.max(0, Math.min(100, pct)) / 100) * PH

  const pts = weekDays.map((date, i) => {
    const ds       = localDateStr(date)
    const isFuture = ds > today
    const pct      = isFuture
      ? null
      : total > 0 ? ((byDate[ds]?.size || 0) / total) * 100 : 0
    return {
      x: toX(i),
      y: pct !== null ? toY(pct) : null,
      label: WEEK_LETTERS[i],
      isToday: ds === today,
      isFuture,
    }
  })

  const valid = pts.filter((p) => p.y !== null)

  let linePath = ''
  let areaPath = ''

  if (valid.length > 0) {
    linePath = `M ${valid[0].x} ${valid[0].y}`
    for (let i = 1; i < valid.length; i++) {
      const p0 = valid[i - 1]
      const p1 = valid[i]
      // Cubic bezier — control points pulled inward for a gentle S-curve
      const cp1x = p0.x + (p1.x - p0.x) * 0.4
      const cp2x = p1.x - (p1.x - p0.x) * 0.4
      linePath += ` C ${cp1x} ${p0.y} ${cp2x} ${p1.y} ${p1.x} ${p1.y}`
    }
    const botY = PT + PH
    areaPath = `${linePath} L ${valid[valid.length - 1].x} ${botY} L ${valid[0].x} ${botY} Z`
  }

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%">
      <defs>
        <linearGradient id="wkAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#f97316" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Subtle horizontal grid */}
      {[0, 50, 100].map((pct) => (
        <line
          key={pct}
          x1={PL} y1={toY(pct)} x2={VW - PR} y2={toY(pct)}
          stroke="rgba(255,255,255,0.04)" strokeWidth="1"
        />
      ))}

      {/* Gradient area under the line */}
      {areaPath && <path d={areaPath} fill="url(#wkAreaGrad)" />}

      {/* Orange drop-shadow glow (wide, transparent stroke behind the line) */}
      {linePath && (
        <path
          d={linePath} fill="none"
          stroke="#f97316" strokeWidth="6" strokeOpacity="0.12"
          strokeLinecap="round"
        />
      )}

      {/* Main trend line */}
      {linePath && (
        <path
          d={linePath} fill="none"
          stroke="#f97316" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        />
      )}

      {/* Data-point dots */}
      {valid.map((p, i) => (
        <g key={i}>
          {p.isToday && (
            <circle cx={p.x} cy={p.y} r="7" fill="#f97316" fillOpacity="0.14" />
          )}
          <circle
            cx={p.x} cy={p.y} r="3.5"
            fill="#f97316" stroke="rgba(17,17,20,0.8)" strokeWidth="1.5"
          />
        </g>
      ))}

      {/* Day-letter labels along x-axis */}
      {pts.map((p, i) => (
        <text
          key={i}
          x={p.x} y={VH - 4}
          textAnchor="middle" fontSize="9"
          fontFamily="-apple-system, system-ui, sans-serif"
          fill={
            p.isToday  ? '#f97316' :
            p.isFuture ? 'rgba(255,255,255,0.12)' :
                         'rgba(255,255,255,0.28)'
          }
        >
          {p.label}
        </text>
      ))}
    </svg>
  )
}

// ── Colorful index dots ──────────────────────────────────────────────────────

const DOT_PALETTE = ['#FF8A65', '#4ade80', '#60a5fa', '#f472b6', '#a78bfa', '#fbbf24', '#34d399', '#fb923c']

// ── Habits panel (right column) ──────────────────────────────────────────────

function HabitsPanel({ active, completions, onComplete, doneCount, total, onManage }) {
  const [completing, setCompleting] = useState(null)

  const handleComplete = async (habitId) => {
    if (!onComplete || completing === habitId) return
    setCompleting(habitId)
    try { await onComplete(habitId) }
    finally { setCompleting(null) }
  }

  const allDone = active.length > 0 && active.every((h) => completions.has(h.id))

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        background: 'rgba(18,18,20,0.6)',
        borderColor: 'rgba(39,39,42,0.3)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Panel header */}
      <div
        className="px-5 pt-5 pb-4"
        style={{ borderBottom: '1px solid rgba(39,39,42,0.3)' }}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium" style={{ color: '#f4f4f5' }}>
            Today's Habits
          </p>
          <span className="text-xs" style={{ color: '#71717a' }}>
            {doneCount} / {total}
          </span>
        </div>
        {/* Slim progress bar */}
        <div
          className="mt-3 rounded-full overflow-hidden"
          style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: total > 0 ? `${(doneCount / total) * 100}%` : '0%',
              background: ORANGE,
            }}
          />
        </div>
      </div>

      {/* All-done state */}
      {allDone && (
        <div
          className="mx-4 my-3 px-4 py-2.5 rounded-xl flex items-center gap-2"
          style={{ background: 'rgba(255,138,101,0.07)', border: '1px solid rgba(255,138,101,0.15)' }}
        >
          <span style={{ fontSize: 14 }}>🎉</span>
          <p className="text-xs font-medium" style={{ color: ORANGE }}>All done — great work!</p>
        </div>
      )}

      {/* Empty state */}
      {active.length === 0 && (
        <div className="px-5 py-8 text-center">
          <p className="text-sm" style={{ color: '#52525b' }}>No habits yet</p>
          <button
            onClick={onManage}
            className="mt-3 text-xs font-medium"
            style={{ color: ORANGE }}
          >
            Add one →
          </button>
        </div>
      )}

      {/* Habit rows */}
      {active.map((habit, idx) => {
        const done = completions.has(habit.id)
        const busy = completing === habit.id
        return (
          <div
            key={habit.id}
            className="flex items-center gap-3 px-5 py-3.5 transition-colors duration-150"
            style={{
              borderTop: idx > 0 ? '1px solid rgba(39,39,42,0.3)' : 'none',
            }}
          >
            {/* Colorful index dot */}
            <div
              className="shrink-0 w-2 h-2 rounded-full"
              style={{ background: DOT_PALETTE[idx % DOT_PALETTE.length], opacity: done ? 0.4 : 1 }}
            />

            {/* Habit name */}
            <div className="flex-1 min-w-0">
              <p
                className="text-sm leading-snug truncate"
                style={{
                  color: done ? '#52525b' : '#e4e4e7',
                  textDecoration: done ? 'line-through' : 'none',
                }}
              >
                {habit.name}
              </p>
              <p className="text-xs mt-0.5 truncate" style={{ color: '#52525b' }}>
                {habit.description || 'Every day'}
              </p>
            </div>

            {/* Right: "Done" label or complete button */}
            {done ? (
              <span className="text-xs shrink-0" style={{ color: '#52525b' }}>Done</span>
            ) : (
              <button
                onClick={() => handleComplete(habit.id)}
                disabled={busy}
                className="shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-150 hover:border-orange-400"
                style={{
                  borderColor: busy ? ORANGE : 'rgba(63,63,70,0.9)',
                  background:  busy ? `${ORANGE}18` : 'transparent',
                }}
                aria-label="Mark complete"
              >
                {busy && (
                  <div
                    className="w-2 h-2 rounded-full border border-t-transparent animate-spin"
                    style={{ borderColor: ORANGE, borderTopColor: 'transparent' }}
                  />
                )}
              </button>
            )}
          </div>
        )
      })}

      {/* Panel footer */}
      {active.length > 0 && (
        <div
          className="px-5 py-3"
          style={{ borderTop: '1px solid rgba(39,39,42,0.3)' }}
        >
          <button
            onClick={onManage}
            className="text-xs transition-colors duration-200 hover:text-zinc-400"
            style={{ color: '#3f3f46' }}
          >
            Manage habits →
          </button>
        </div>
      )}
    </div>
  )
}

// ── Stats tab ────────────────────────────────────────────────────────────────

function StatsTab({ streak, doneCount, total }) {
  return (
    <div className="px-4 pt-6">
      <p className="font-bold text-white text-lg mb-4">Your stats</p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard label="Current streak" value={`${streak} days`} emoji="🔥" />
        <StatCard label="Done today"     value={`${doneCount} / ${total}`} emoji="✅" />
      </div>
      <Divider />
      <p className="text-xs text-center mt-8" style={{ color: 'rgba(255,255,255,0.15)' }}>
        More stats coming soon
      </p>
    </div>
  )
}

function StatCard({ label, value, emoji }) {
  return (
    <div
      className="rounded-xl px-4 py-5"
      style={{ background: CARD, border: `1px solid ${BORDER}` }}
    >
      <span className="text-2xl">{emoji}</span>
      <p className="text-xl font-bold text-white mt-2">{value}</p>
      <p className="text-xs mt-1" style={{ color: MUTED }}>{label}</p>
    </div>
  )
}

// ── Profile tab ──────────────────────────────────────────────────────────────

function ProfileTab({ username, onSignOut, onManage }) {
  return (
    <div className="px-4 pt-6 flex flex-col gap-3">
      <div
        className="rounded-xl px-5 py-4 flex items-center gap-3"
        style={{ background: CARD, border: `1px solid ${BORDER}` }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0"
          style={{ background: ORANGE }}
        >
          {username[0].toUpperCase()}
        </div>
        <div>
          <p className="text-xs mb-0.5" style={{ color: MUTED }}>Signed in as</p>
          <p className="font-bold text-white">{username}</p>
        </div>
      </div>

      <button
        onClick={onManage}
        className="w-full py-3.5 rounded-xl font-semibold text-base text-white"
        style={{ minHeight: 44, background: CARD, border: `1px solid ${BORDER}` }}
      >
        Manage Habits
      </button>

      <button
        onClick={onSignOut}
        className="w-full py-3.5 rounded-xl font-semibold text-base"
        style={{
          minHeight: 44,
          color: '#ef4444',
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.15)',
        }}
      >
        Sign out
      </button>
    </div>
  )
}

// ── Bottom nav ───────────────────────────────────────────────────────────────

function BottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'home',     label: 'Home',     Icon: HomeIcon   },
    { id: 'sessions', label: 'Sessions', Icon: TimerIcon  },
    { id: 'stats',    label: 'Stats',    Icon: ChartIcon  },
    { id: 'profile',  label: 'Profile',  Icon: PersonIcon },
  ]

  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex items-stretch"
      style={{
        background: BG,
        borderTop: `1px solid ${BORDER}`,
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
    >
      {tabs.map(({ id, label, Icon }) => {
        const isActive = activeTab === id
        return (
          <button
            key={id}
            className="flex-1 flex flex-col items-center justify-center gap-1"
            style={{ minHeight: 56, paddingTop: 10 }}
            onClick={() => onTabChange(id)}
          >
            <Icon color={isActive ? ORANGE : MUTED} />
            <span className="text-xs font-medium" style={{ color: isActive ? ORANGE : MUTED }}>
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Shared UI ────────────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex-1 flex items-center justify-center" style={{ paddingBottom: 72 }}>
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: ORANGE, borderTopColor: 'transparent' }}
      />
    </div>
  )
}

function Divider() {
  return <div style={{ borderTop: `1px solid ${BORDER}` }} />
}

function MiniCheck() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// ── Nav icons ────────────────────────────────────────────────────────────────

function HomeIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  )
}

function TimerIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5" />
      <path d="M9 3h6" />
      <path d="M12 3v2" />
    </svg>
  )
}

function ChartIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4"  />
      <line x1="6"  y1="20" x2="6"  y2="14" />
    </svg>
  )
}

function PersonIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
