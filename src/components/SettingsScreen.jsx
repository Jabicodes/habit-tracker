import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const ORANGE  = '#FF8A65'
const CARD    = 'rgba(255,255,255,0.03)'
const BORDER  = 'rgba(255,255,255,0.08)'
const MUTED   = '#71717a'
const LS_KEY  = 'focuszen_timer_settings'
const DEFAULTS = { focusMins: 25, shortBreakMins: 5, longBreakMins: 15, sessionTarget: 4 }

function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch (_) {}
  return { ...DEFAULTS }
}

// ── Slider ────────────────────────────────────────────────────────────────────

function Slider({ label, value, min, max, unit, onChange }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-white">{label}</span>
        <span className="text-sm font-semibold" style={{ color: ORANGE }}>
          {value} {unit}
        </span>
      </div>
      <div style={{ position: 'relative', height: 6 }}>
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        />
        <div
          className="absolute top-0 left-0 h-full rounded-full"
          style={{ width: `${pct}%`, background: ORANGE, transition: 'width 0.1s ease' }}
        />
        <input
          type="range"
          min={min} max={max} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ height: '100%', margin: 0 }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs" style={{ color: MUTED }}>{min}{unit}</span>
        <span className="text-xs" style={{ color: MUTED }}>{max}{unit}</span>
      </div>
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ label, sub, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm text-white">{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: MUTED }}>{sub}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className="shrink-0 ml-4 rounded-full transition-all duration-200"
        style={{
          width: 44, height: 26, position: 'relative',
          background: checked ? ORANGE : 'rgba(255,255,255,0.12)',
          border: 'none', cursor: 'pointer',
        }}
      >
        <div
          className="absolute top-1 rounded-full transition-all duration-200"
          style={{
            width: 18, height: 18,
            background: '#fff',
            left: checked ? 22 : 4,
          }}
        />
      </button>
    </div>
  )
}

// ── Change Password modal ─────────────────────────────────────────────────────

function ChangePasswordModal({ onClose }) {
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState(null)

  const handleSave = async () => {
    if (!password) { setMsg({ error: true, text: 'Enter a new password.' }); return }
    if (password !== confirm) { setMsg({ error: true, text: 'Passwords do not match.' }); return }
    if (password.length < 8) { setMsg({ error: true, text: 'Minimum 8 characters.' }); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) { setMsg({ error: true, text: error.message }); return }
    setMsg({ error: false, text: 'Password updated!' })
    setTimeout(onClose, 1200)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: '#1c1f26', border: `1px solid ${BORDER}` }}
      >
        <h2 className="text-base font-semibold text-white mb-4">Change Password</h2>
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl text-sm text-white mb-3"
          style={{
            background: CARD, border: `1px solid ${BORDER}`,
            padding: '11px 14px', outline: 'none',
          }}
        />
        <input
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-xl text-sm text-white mb-4"
          style={{
            background: CARD, border: `1px solid ${BORDER}`,
            padding: '11px 14px', outline: 'none',
          }}
        />
        {msg && (
          <p className="text-xs mb-3" style={{ color: msg.error ? '#f87171' : '#4ade80' }}>
            {msg.text}
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl text-sm py-2.5"
            style={{ background: 'rgba(255,255,255,0.06)', color: MUTED, border: 'none', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl text-sm py-2.5 font-semibold text-white"
            style={{ background: ORANGE, border: 'none', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SettingsScreen({ username, onSignOut, userId }) {
  const saved = loadSettings()

  const [focusMins,       setFocusMins]       = useState(saved.focusMins)
  const [shortBreakMins,  setShortBreakMins]  = useState(saved.shortBreakMins)
  const [longBreakMins,   setLongBreakMins]   = useState(saved.longBreakMins)
  const [sessionTarget,   setSessionTarget]   = useState(saved.sessionTarget)
  const [soundAlerts,     setSoundAlerts]     = useState(true)
  const [dailyReminder,   setDailyReminder]   = useState(false)
  const [reminderTime,    setReminderTime]    = useState('09:00')
  const [saveFlash,       setSaveFlash]       = useState(false)
  const [showPwModal,     setShowPwModal]     = useState(false)

  useEffect(() => {
    try {
      const meta = JSON.parse(localStorage.getItem('focuszen_notif_settings') || '{}')
      if (meta.soundAlerts   !== undefined) setSoundAlerts(meta.soundAlerts)
      if (meta.dailyReminder !== undefined) setDailyReminder(meta.dailyReminder)
      if (meta.reminderTime)               setReminderTime(meta.reminderTime)
    } catch (_) {}
  }, [])

  const handleSave = () => {
    localStorage.setItem(LS_KEY, JSON.stringify({ focusMins, shortBreakMins, longBreakMins, sessionTarget }))
    localStorage.setItem('focuszen_notif_settings', JSON.stringify({ soundAlerts, dailyReminder, reminderTime }))
    setSaveFlash(true)
    setTimeout(() => setSaveFlash(false), 1600)
  }

  const handleReset = () => {
    const ok = window.confirm('Reset timer settings to defaults? This only clears your local settings — your habits and session history are not affected.')
    if (!ok) return
    localStorage.removeItem(LS_KEY)
    setFocusMins(DEFAULTS.focusMins)
    setShortBreakMins(DEFAULTS.shortBreakMins)
    setLongBreakMins(DEFAULTS.longBreakMins)
    setSessionTarget(DEFAULTS.sessionTarget)
  }

  const displayName = (username || '').replace(/@/g, '') || 'there'

  return (
    <div className="min-h-screen app-fade-in" style={{ background: '#111418', color: '#fff', paddingBottom: 40 }}>

      {/* Header */}
      <div className="px-4 pt-8 pb-6">
        <p className="text-xs font-medium uppercase mb-1" style={{ color: '#52525b', letterSpacing: '0.12em' }}>Configure</p>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#f4f4f5' }}>Settings</h1>
      </div>

      {/* Profile card */}
      <div className="px-4 mb-6">
        <div
          className="rounded-xl p-4 flex items-center gap-4"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}
        >
          <div
            className="shrink-0 rounded-full flex items-center justify-center text-base font-bold"
            style={{ width: 48, height: 48, background: ORANGE + '22', color: ORANGE }}
          >
            {displayName[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{displayName}</p>
            <p className="text-xs mt-0.5 truncate" style={{ color: MUTED }}>
              {username?.includes('@') ? username : ''}
            </p>
          </div>
          <button
            onClick={() => setShowPwModal(true)}
            className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#a1a1aa', border: 'none', cursor: 'pointer' }}
          >
            Change Password
          </button>
        </div>
      </div>

      {/* Timer settings */}
      <div className="px-4 mb-6">
        <p className="text-xs font-semibold text-white mb-3">Timer Settings</p>
        <div
          className="rounded-xl p-4"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}
        >
          <Slider label="Focus Duration" value={focusMins} min={15} max={60} unit="min" onChange={setFocusMins} />
          <Slider label="Short Break" value={shortBreakMins} min={1} max={15} unit="min" onChange={setShortBreakMins} />
          <Slider label="Long Break" value={longBreakMins} min={10} max={30} unit="min" onChange={setLongBreakMins} />
          <Slider label="Session Target" value={sessionTarget} min={2} max={6} unit="sessions" onChange={setSessionTarget} />

          <button
            onClick={handleSave}
            className="w-full rounded-xl text-sm font-semibold text-white py-3 mt-1 transition-all duration-200"
            style={{
              background: saveFlash ? '#4ade80' : ORANGE,
              border: 'none', cursor: 'pointer',
            }}
          >
            {saveFlash ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="px-4 mb-6">
        <p className="text-xs font-semibold text-white mb-3">Notifications</p>
        <div
          className="rounded-xl px-4"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}
        >
          <Toggle
            label="Sound Alerts"
            sub="Beep when a session ends"
            checked={soundAlerts}
            onChange={setSoundAlerts}
          />
          <div style={{ borderTop: `1px solid ${BORDER}` }}>
            <Toggle
              label="Daily Reminder"
              sub="Get reminded to focus each day"
              checked={dailyReminder}
              onChange={setDailyReminder}
            />
          </div>
          {dailyReminder && (
            <div className="pb-3">
              <p className="text-xs mb-2" style={{ color: MUTED }}>Reminder time</p>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="rounded-lg text-sm text-white px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, outline: 'none' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Account */}
      <div className="px-4 mb-6">
        <p className="text-xs font-semibold text-white mb-3">Account</p>
        <div
          className="rounded-xl px-4"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}
        >
          <button
            onClick={onSignOut}
            className="w-full text-left text-sm py-3"
            style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="px-4">
        <p className="text-xs font-semibold mb-3" style={{ color: '#f87171' }}>Danger Zone</p>
        <div
          className="rounded-xl px-4"
          style={{ background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.2)' }}
        >
          <button
            onClick={handleReset}
            className="w-full text-left text-sm py-3"
            style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Reset Timer Settings to Defaults
          </button>
        </div>
        <p className="text-xs mt-2 px-1" style={{ color: '#3f3f46' }}>
          Resets slider values only. Your habits and session history are never affected.
        </p>
      </div>

      {showPwModal && <ChangePasswordModal onClose={() => setShowPwModal(false)} />}
    </div>
  )
}
