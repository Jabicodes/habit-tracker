import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import SessionsScreen from './SessionsScreen'

// ── Constants ─────────────────────────────────────────────────────────────────

const FOCUS_DURATION = 25 * 60   // 1500s
const SHORT_BREAK    = 5  * 60   // 300s
const LONG_BREAK     = 15 * 60   // 900s
const SESSION_GOAL   = 6

const ORANGE = '#FF8A65'
const BG     = '#111418'
const CARD   = '#2A2D34'
const MUTED  = '#8E8E93'
const BORDER = 'rgba(255,255,255,0.08)'

// Ring geometry
const RING_SIZE   = 240
const RING_RADIUS = 100
const RING_CX     = RING_SIZE / 2
const RING_CY     = RING_SIZE / 2
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

// ── Audio ─────────────────────────────────────────────────────────────────────

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
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
  } catch (_) {
    // Web Audio API not available
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function totalForType(type) {
  if (type === 'focus')       return FOCUS_DURATION
  if (type === 'short-break') return SHORT_BREAK
  return LONG_BREAK
}

function labelForType(type) {
  if (type === 'focus') return 'Focus Time'
  if (type === 'short-break') return 'Short Break'
  return 'Long Break'
}

function durationMinsForType(type) {
  if (type === 'focus')       return 25
  if (type === 'short-break') return 5
  return 15
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PomodoroTimer({ userId, username, habits, completions, onComplete }) {
  const [sessionType, setSessionType] = useState('focus')
  const [timeLeft,    setTimeLeft]    = useState(FOCUS_DURATION)
  const [isRunning,   setIsRunning]   = useState(false)
  const [focusDone,   setFocusDone]   = useState(0)
  const [sessions,    setSessions]    = useState([])
  const [completing,  setCompleting]  = useState(false)

  // Refs for stable access in timer callbacks
  const sessionTypeRef = useRef('focus')
  const focusDoneRef   = useRef(0)
  const didEndRef      = useRef(false) // prevent double-fire on timer end

  useEffect(() => { sessionTypeRef.current = sessionType }, [sessionType])
  useEffect(() => { focusDoneRef.current = focusDone },     [focusDone])

  // ── Load today's sessions ────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    const fetchSessions = async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { data } = await supabase
        .from('pomodoro_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false })
      if (data) {
        setSessions(data)
        const count = data.filter(s => s.session_type === 'focus' && s.completed).length
        setFocusDone(count)
        focusDoneRef.current = count
      }
    }
    fetchSessions()
  }, [userId])

  // ── Timer tick ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(id)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [isRunning])

  // ── Detect timer reaching zero ───────────────────────────────────────────
  const handleSessionEnd = useCallback(async () => {
    playBeep()
    setIsRunning(false)

    const type  = sessionTypeRef.current
    const count = focusDoneRef.current

    // Persist to Supabase
    if (userId) {
      const { data } = await supabase
        .from('pomodoro_sessions')
        .insert({
          user_id:          userId,
          session_type:     type,
          duration_minutes: durationMinsForType(type),
          completed:        true,
        })
        .select()
      if (data?.[0]) setSessions(prev => [data[0], ...prev])
    }

    // Determine next session
    if (type === 'focus') {
      const newCount = count + 1
      setFocusDone(newCount)
      focusDoneRef.current = newCount
      if (newCount % 4 === 0) {
        sessionTypeRef.current = 'long-break'
        setSessionType('long-break')
        setTimeLeft(LONG_BREAK)
      } else {
        sessionTypeRef.current = 'short-break'
        setSessionType('short-break')
        setTimeLeft(SHORT_BREAK)
      }
    } else {
      sessionTypeRef.current = 'focus'
      setSessionType('focus')
      setTimeLeft(FOCUS_DURATION)
    }
  }, [userId])

  useEffect(() => {
    if (timeLeft === 0 && !didEndRef.current) {
      didEndRef.current = true
      handleSessionEnd()
    } else if (timeLeft > 0) {
      didEndRef.current = false
    }
  }, [timeLeft, handleSessionEnd])

  // ── Controls ─────────────────────────────────────────────────────────────
  const toggleRunning = () => setIsRunning(r => !r)

  const handleReset = () => {
    setIsRunning(false)
    setTimeLeft(totalForType(sessionType))
    didEndRef.current = false
  }

  // ── Ring ─────────────────────────────────────────────────────────────────
  const total    = totalForType(sessionType)
  const progress = timeLeft / total  // 1 = full, 0 = empty
  const dashOffset = CIRCUMFERENCE * (1 - progress)

  // ── Habit helper ─────────────────────────────────────────────────────────
  const firstIncomplete = habits.find(h => !completions.has(h.id))

  const handleCompleteHabit = async () => {
    if (!firstIncomplete || completing) return
    setCompleting(true)
    try {
      await onComplete(firstIncomplete.id)
    } finally {
      setCompleting(false)
    }
  }

  // ── Focus sessions today ─────────────────────────────────────────────────
  const todayFocusCount = sessions.filter(s => s.session_type === 'focus' && s.completed).length

  return (
    <div
      className="min-h-screen overflow-y-auto app-fade-in"
      style={{ backgroundColor: BG, color: '#fff', paddingBottom: 88 }}
    >
      {/* Header */}
      <div className="px-4 pt-safe pb-4">
        <h1 className="font-bold text-white mt-2" style={{ fontSize: 22 }}>
          {getGreeting()}, {username || 'there'}
        </h1>
        <p className="text-xs mt-0.5" style={{ color: MUTED }}>
          Stay focused, stay consistent.
        </p>
      </div>

      <div style={{ borderTop: `1px solid ${BORDER}` }} />

      {/* Session type pills */}
      <div className="flex gap-2 px-4 pt-5">
        {[
          { id: 'focus',       label: 'Focus' },
          { id: 'short-break', label: 'Short Break' },
          { id: 'long-break',  label: 'Long Break' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => {
              if (isRunning) return
              setSessionType(id)
              sessionTypeRef.current = id
              setTimeLeft(totalForType(id))
              didEndRef.current = false
            }}
            className="text-xs font-medium px-3 py-1.5 rounded-full"
            style={{
              background: sessionType === id ? ORANGE : CARD,
              color:      sessionType === id ? '#fff'  : MUTED,
              border:     `1px solid ${sessionType === id ? ORANGE : BORDER}`,
              transition: 'all 0.2s ease',
              minHeight:  32,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Ring */}
      <div className="flex flex-col items-center mt-8">
        <div style={{ position: 'relative', width: RING_SIZE, height: RING_SIZE }}>
          <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
            {/* Track */}
            <circle
              cx={RING_CX}
              cy={RING_CY}
              r={RING_RADIUS}
              fill="none"
              stroke={CARD}
              strokeWidth="10"
            />
            {/* Progress arc */}
            <circle
              cx={RING_CX}
              cy={RING_CY}
              r={RING_RADIUS}
              fill="none"
              stroke={ORANGE}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${RING_CX} ${RING_CY})`}
              className="pomodoro-ring-progress"
            />
          </svg>

          {/* Center label */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="font-bold text-white" style={{ fontSize: 48, lineHeight: 1, letterSpacing: -1 }}>
              {formatTime(timeLeft)}
            </span>
            <span className="text-sm mt-2" style={{ color: MUTED }}>
              {labelForType(sessionType)}
            </span>
          </div>
        </div>

        {/* Start / Pause */}
        <button
          onClick={toggleRunning}
          className="mt-8 font-bold text-white rounded-full"
          style={{
            width: 128,
            height: 44,
            background: ORANGE,
            border: 'none',
            fontSize: 16,
            boxShadow: isRunning ? 'none' : `0 6px 20px rgba(255,138,101,0.4)`,
            transition: 'box-shadow 0.2s ease',
          }}
        >
          {isRunning ? 'Pause' : 'Start'}
        </button>

        {/* Reset */}
        <button
          onClick={handleReset}
          className="mt-3 text-sm"
          style={{ color: MUTED }}
        >
          Reset
        </button>
      </div>

      {/* Today's Progress */}
      <div className="px-4 mt-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-white">Today's Progress</p>
          <p className="text-sm font-semibold" style={{ color: ORANGE }}>
            {todayFocusCount} / {SESSION_GOAL} Sessions
          </p>
        </div>
        <div className="rounded-full overflow-hidden" style={{ height: 6, background: CARD }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min((todayFocusCount / SESSION_GOAL) * 100, 100)}%`,
              background: ORANGE,
            }}
          />
        </div>
        {focusDone > 0 && focusDone % 4 === 0 && (
          <p className="text-xs mt-2" style={{ color: ORANGE }}>
            🎉 Long break earned after {focusDone} sessions!
          </p>
        )}
      </div>

      {/* Daily Habit */}
      {firstIncomplete && (
        <div className="px-4 mt-6">
          <p className="text-sm font-semibold text-white mb-3">Daily Habit</p>
          <div
            className="rounded-xl p-4"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-3">
                <p className="font-semibold text-white text-base truncate">{firstIncomplete.name}</p>
                <p className="text-xs mt-0.5" style={{ color: MUTED }}>
                  {firstIncomplete.description || 'Every day'}
                </p>
              </div>
              <button
                onClick={handleCompleteHabit}
                disabled={completing}
                className="shrink-0 rounded-full font-semibold text-sm text-white px-4"
                style={{
                  height: 36,
                  background: ORANGE,
                  border: 'none',
                  opacity: completing ? 0.6 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {completing ? '…' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sessions history */}
      <SessionsScreen sessions={sessions} />
    </div>
  )
}
