import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ── Constants ─────────────────────────────────────────────────────────────────

const ORANGE = '#FF8A65'
const BG     = '#111418'
const CARD   = '#2A2D34'
const MUTED  = '#8E8E93'
const BORDER = 'rgba(255,255,255,0.08)'

const RING_SIZE   = 240
const RING_RADIUS = 100
const RING_CX     = 120
const RING_CY     = 120
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

const LS_KEY   = 'focuszen_timer_settings'
const DEFAULTS = { focusMins: 25, shortBreakMins: 5, longBreakMins: 15, sessionTarget: 4 }

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch (_) {}
  return { ...DEFAULTS }
}

function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function playBeep() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 740
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 1.2)
  } catch (_) {}
}

function totalForType(type, cfg) {
  if (type === 'focus')       return cfg.focusMins * 60
  if (type === 'short-break') return cfg.shortBreakMins * 60
  return cfg.longBreakMins * 60
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SessionsScreen({ habits, completions, userId, username }) {
  const cfg = loadSettings()

  const [sessionType, setSessionType] = useState('focus')
  const [timeLeft,    setTimeLeft]    = useState(cfg.focusMins * 60)
  const [isRunning,   setIsRunning]   = useState(false)
  const [focusDone,   setFocusDone]   = useState(0)
  const [selectedHabitId, setSelectedHabitId] = useState('')

  const sessionTypeRef = useRef('focus')
  const focusDoneRef   = useRef(0)
  const didEndRef      = useRef(false)

  useEffect(() => { sessionTypeRef.current = sessionType }, [sessionType])
  useEffect(() => { focusDoneRef.current = focusDone },     [focusDone])

  const active = (habits || []).filter((h) => h.is_active)

  // Default selected habit to first incomplete
  useEffect(() => {
    const firstIncomplete = active.find((h) => !completions.has(h.id))
    if (firstIncomplete && !selectedHabitId) {
      setSelectedHabitId(firstIncomplete.id)
    } else if (active.length > 0 && !selectedHabitId) {
      setSelectedHabitId(active[0].id)
    }
  }, [active.length]) // eslint-disable-line

  // Load today's completed focus sessions count
  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const { data } = await supabase
        .from('pomodoro_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('session_type', 'focus')
        .eq('completed', true)
        .gte('created_at', start.toISOString())
      if (data) {
        setFocusDone(data.length)
        focusDoneRef.current = data.length
      }
    })()
  }, [userId])

  // Timer tick
  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(id); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [isRunning])

  // Session end handler
  const handleSessionEnd = useCallback(async () => {
    playBeep()
    setIsRunning(false)

    const type  = sessionTypeRef.current
    const count = focusDoneRef.current
    const c     = loadSettings() // re-read in case settings changed

    if (userId && type === 'focus') {
      await supabase.from('pomodoro_sessions').insert({
        user_id:          userId,
        habit_id:         selectedHabitId || null,
        session_type:     'focus',
        duration_minutes: c.focusMins,
        completed:        true,
      })
    }

    if (type === 'focus') {
      const newCount = count + 1
      setFocusDone(newCount)
      focusDoneRef.current = newCount
      const nextType = newCount % c.sessionTarget === 0 ? 'long-break' : 'short-break'
      sessionTypeRef.current = nextType
      setSessionType(nextType)
      setTimeLeft(totalForType(nextType, c))
    } else {
      sessionTypeRef.current = 'focus'
      setSessionType('focus')
      setTimeLeft(c.focusMins * 60)
    }
  }, [userId, selectedHabitId])

  useEffect(() => {
    if (timeLeft === 0 && !didEndRef.current) {
      didEndRef.current = true
      handleSessionEnd()
    } else if (timeLeft > 0) {
      didEndRef.current = false
    }
  }, [timeLeft, handleSessionEnd])

  const handleReset = () => {
    setIsRunning(false)
    const c = loadSettings()
    setTimeLeft(totalForType(sessionType, c))
    didEndRef.current = false
  }

  if (!habits) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center bg-transparent">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF8A65]" />
        <p className="text-zinc-500 text-xs mt-3 tracking-wide">Loading your habits...</p>
      </div>
    )
  }

  const currentCfg = loadSettings()
  const total      = totalForType(sessionType, currentCfg)
  const progress   = total > 0 ? timeLeft / total : 1
  const dashOffset = CIRCUMFERENCE * (1 - progress)
  const isBreak    = sessionType !== 'focus'
  const target     = currentCfg.sessionTarget

  const displayName = (username || '').replace(/@/g, '') || 'there'

  return (
    <div
      className="min-h-screen app-fade-in"
      style={{ backgroundColor: BG, color: '#fff', paddingBottom: 40 }}
    >
      {/* ── Header ── */}
      <div className="px-4 pt-8 pb-6">
        <p
          className="text-xs font-medium uppercase mb-1"
          style={{ color: '#52525b', letterSpacing: '0.12em' }}
        >
          {getGreeting()}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#f4f4f5' }}>
          {displayName}
        </h1>
        <p className="text-sm mt-1" style={{ color: '#71717a' }}>
          Stay focused, stay consistent.
        </p>
      </div>

      {/* ── Circular progress ring ── */}
      <div className="flex flex-col items-center px-4">
        <div style={{ position: 'relative', width: RING_SIZE, height: RING_SIZE }}>
          <svg
            width={RING_SIZE}
            height={RING_SIZE}
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          >
            {/* Background track */}
            <circle
              cx={RING_CX} cy={RING_CY} r={RING_RADIUS}
              fill="none" stroke={CARD} strokeWidth="10"
            />
            {/* Active progress arc */}
            <circle
              cx={RING_CX} cy={RING_CY} r={RING_RADIUS}
              fill="none" stroke={ORANGE} strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${RING_CX} ${RING_CY})`}
              style={{ transition: 'stroke-dashoffset 0.9s linear' }}
            />
          </svg>

          {/* Center display */}
          <div
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span
              className="font-bold text-white"
              style={{ fontSize: 48, lineHeight: 1, letterSpacing: -1 }}
            >
              {formatTime(timeLeft)}
            </span>
            <span className="text-sm mt-2" style={{ color: MUTED }}>
              {isBreak ? 'Break Time' : 'Focus Time'}
            </span>
          </div>
        </div>

        {/* ── Controls ── */}
        <button
          onClick={() => setIsRunning((r) => !r)}
          className="mt-8 font-bold text-white"
          style={{
            width: 120, height: 44, borderRadius: 9999,
            background: ORANGE, border: 'none', fontSize: 16,
            boxShadow: isRunning ? 'none' : '0 6px 20px rgba(255,138,101,0.4)',
            transition: 'box-shadow 0.2s ease',
            cursor: 'pointer',
          }}
        >
          {isRunning ? 'Pause' : 'Start'}
        </button>

        <button
          onClick={handleReset}
          className="mt-3 text-sm"
          style={{ color: MUTED, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Reset
        </button>
      </div>

      {/* ── Today's Progress ── */}
      <div className="px-4 mt-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-white">Today's Progress</p>
          <p className="text-sm font-semibold" style={{ color: ORANGE }}>
            {focusDone} / {target} Sessions
          </p>
        </div>
        <div
          className="rounded-full overflow-hidden"
          style={{ height: 6, background: CARD }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min((focusDone / target) * 100, 100)}%`,
              background: ORANGE,
            }}
          />
        </div>
        {focusDone >= target && (
          <p className="text-xs mt-2" style={{ color: ORANGE }}>
            🎉 Daily goal reached!
          </p>
        )}
      </div>

      {/* ── Current Habit dropdown ── */}
      {active.length > 0 && (
        <div className="px-4 mt-6">
          <p className="text-sm font-semibold text-white mb-3">Current Habit</p>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedHabitId}
              onChange={(e) => setSelectedHabitId(e.target.value)}
              className="w-full rounded-xl text-sm text-white appearance-none"
              style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                padding: '12px 40px 12px 16px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {active.length === 0
                ? <option value="" style={{ background: CARD }}>No active habits today</option>
                : active.map((h) => (
                    <option key={h.id} value={h.id} style={{ background: CARD }}>
                      {h.name}{completions.has(h.id) ? ' ✓' : ''}
                    </option>
                  ))
              }
            </select>
            {/* Dropdown arrow */}
            <svg
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}
