import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

const ORANGE = '#FF8A65'
const CARD   = 'rgba(255,255,255,0.03)'
const BORDER = 'rgba(255,255,255,0.08)'
const MUTED  = '#71717a'

// ── Date helpers ──────────────────────────────────────────────────────────────

function localDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayStr() { return localDateStr(new Date()) }

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return localDateStr(d)
}

// ── SVG weekly trend chart (same style as HabitView) ─────────────────────────

function WeeklyChart({ data }) {
  const W = 300, H = 80, PAD = 8
  const vals = data.map((d) => d.count)
  const max  = Math.max(...vals, 1)
  const pts  = vals.map((v, i) => {
    const x = PAD + (i / (vals.length - 1)) * (W - PAD * 2)
    const y = H - PAD - ((v / max) * (H - PAD * 2))
    return [x, y]
  })

  if (pts.length < 2) return null

  let path = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    const cpx = (x0 + x1) / 2
    path += ` C ${cpx} ${y0}, ${cpx} ${y1}, ${x1} ${y1}`
  }

  const fill = `${path} L ${pts[pts.length - 1][0]} ${H} L ${pts[0][0]} ${H} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id="stat-area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ORANGE} stopOpacity="0.25" />
          <stop offset="100%" stopColor={ORANGE} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#stat-area-grad)" />
      <path d={path} fill="none" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill={ORANGE} />
      ))}
    </svg>
  )
}

// ── Monthly calendar ──────────────────────────────────────────────────────────

function MonthCalendar({ byDate, habitCount }) {
  const now        = new Date()
  const year       = now.getFullYear()
  const month      = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDow   = new Date(year, month, 1).getDay()

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div>
      <p className="text-xs font-semibold text-white mb-3">{monthLabel}</p>
      <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
        {['S','M','T','W','T','F','S'].map((l, i) => (
          <span key={i} className="text-xs" style={{ color: MUTED }}>{l}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const ds    = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const count = byDate[ds] || 0
          const total = habitCount || 1
          const isFuture = ds > todayStr()
          let dot = null
          if (!isFuture && count > 0) {
            const color = count >= total ? '#4ade80' : ORANGE
            dot = <div className="mx-auto mt-0.5 rounded-full" style={{ width: 4, height: 4, background: color }} />
          } else if (!isFuture && count === 0) {
            dot = <div className="mx-auto mt-0.5 rounded-full border" style={{ width: 4, height: 4, borderColor: MUTED + '55' }} />
          }
          const isToday = ds === todayStr()
          return (
            <div key={i} className="flex flex-col items-center py-0.5">
              <span
                className="text-xs leading-none"
                style={{
                  color: isToday ? ORANGE : isFuture ? '#3f3f46' : '#a1a1aa',
                  fontWeight: isToday ? '600' : '400',
                }}
              >
                {day}
              </span>
              {dot}
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-xs" style={{ color: MUTED }}>All done</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: ORANGE }} />
          <span className="text-xs" style={{ color: MUTED }}>Partial</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full border" style={{ borderColor: MUTED + '55' }} />
          <span className="text-xs" style={{ color: MUTED }}>Missed</span>
        </div>
      </div>
    </div>
  )
}

// ── Bento card ────────────────────────────────────────────────────────────────

function BentoCard({ label, value, sub }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: CARD, border: `1px solid ${BORDER}` }}
    >
      <p className="text-xs mb-2" style={{ color: MUTED }}>{label}</p>
      <p className="text-2xl font-bold text-white leading-none">{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: MUTED }}>{sub}</p>}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StatisticsScreen({ habits, completions, userId }) {
  const [rows60, setRows60] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    ;(async () => {
      const since = daysAgo(60)
      const { data } = await supabase
        .from('daily_completions')
        .select('habit_id, completed_date')
        .eq('user_id', userId)
        .gte('completed_date', since)
      setRows60(data || [])
      setLoading(false)
    })()
  }, [userId])

  // Group by date → Set<habitId>
  const byDate = useMemo(() => {
    const map = {}
    rows60.forEach(({ habit_id, completed_date }) => {
      if (!map[completed_date]) map[completed_date] = new Set()
      map[completed_date].add(habit_id)
    })
    // overlay today's live completions
    map[todayStr()] = completions
    return map
  }, [rows60, completions])

  const habitCount = habits.length

  // ── Weekly completions (last 7 days) ──────────────────────────────────────

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const ds    = localDateStr(d)
      const set   = byDate[ds] || new Set()
      const count = set.size
      return {
        ds,
        count,
        label: d.toLocaleString('default', { weekday: 'short' }).slice(0, 2),
      }
    })
  }, [byDate])

  const weeklyTotal = weekDays.reduce((s, d) => s + d.count, 0)
  const weeklyRate  = habitCount > 0
    ? Math.round((weeklyTotal / (habitCount * 7)) * 100)
    : 0

  // ── Streak ────────────────────────────────────────────────────────────────

  const { currentStreak, bestStreak } = useMemo(() => {
    const today   = todayStr()
    const ids     = habits.map((h) => h.id)
    const isPerfect = (ds) => ids.length > 0 && ids.every((id) => (byDate[ds] || new Set()).has(id))

    let current = 0
    const startOffset = isPerfect(today) ? 0 : 1
    for (let i = startOffset; i < 60; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      if (isPerfect(localDateStr(d))) current++
      else break
    }

    let best = current
    let run  = 0
    for (let i = 0; i < 60; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const ds = localDateStr(d)
      if (isPerfect(ds)) { run++; if (run > best) best = run }
      else run = 0
    }

    return { currentStreak: current, bestStreak: best }
  }, [byDate, habits])

  // ── Per-habit completion rates ────────────────────────────────────────────

  const habitStats = useMemo(() => {
    return habits.map((h) => {
      let done = 0
      for (let i = 0; i < 30; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const ds = localDateStr(d)
        if ((byDate[ds] || new Set()).has(h.id)) done++
      }
      return { ...h, rate: Math.round((done / 30) * 100) }
    })
  }, [habits, byDate])

  // ── Calendar count by date ────────────────────────────────────────────────

  const calByDate = useMemo(() => {
    const map = {}
    Object.entries(byDate).forEach(([ds, set]) => {
      map[ds] = set.size
    })
    return map
  }, [byDate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#111418' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: ORANGE, borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen app-fade-in" style={{ background: '#111418', color: '#fff', paddingBottom: 40 }}>

      {/* Header */}
      <div className="px-4 pt-8 pb-6">
        <p className="text-xs font-medium uppercase mb-1" style={{ color: '#52525b', letterSpacing: '0.12em' }}>Analytics</p>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#f4f4f5' }}>Statistics</h1>
      </div>

      {/* Bento cards */}
      <div className="px-4 grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <BentoCard label="Weekly Completions" value={weeklyTotal} sub="last 7 days" />
        <BentoCard
          label="Streak"
          value={`${currentStreak}d`}
          sub={`Best: ${bestStreak}d`}
        />
        <BentoCard label="Weekly Rate" value={`${weeklyRate}%`} sub="habits completed" />
      </div>

      {/* Weekly trend chart */}
      <div className="px-4 mb-6">
        <div
          className="rounded-xl p-4"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-white">Weekly Trend</p>
            <p className="text-xs" style={{ color: MUTED }}>completions / day</p>
          </div>
          <WeeklyChart data={weekDays} />
          <div className="flex justify-between mt-2">
            {weekDays.map((d) => (
              <span key={d.ds} className="text-xs" style={{ color: MUTED, flex: 1, textAlign: 'center' }}>
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly calendar */}
      <div className="px-4 mb-6">
        <div
          className="rounded-xl p-4"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}
        >
          <MonthCalendar byDate={calByDate} habitCount={habitCount} />
        </div>
      </div>

      {/* Habits performance list */}
      {habitStats.length > 0 && (
        <div className="px-4">
          <p className="text-xs font-semibold text-white mb-3">Habits (30-day rate)</p>
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}
          >
            {habitStats.map((h, i) => (
              <div
                key={h.id}
                className="px-4 py-3"
                style={{ borderBottom: i < habitStats.length - 1 ? `1px solid ${BORDER}` : 'none' }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-white truncate flex-1 mr-4">{h.name}</span>
                  <span className="text-sm font-semibold shrink-0" style={{ color: ORANGE }}>{h.rate}%</span>
                </div>
                <div className="rounded-full overflow-hidden" style={{ height: 4, background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${h.rate}%`, background: ORANGE }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
