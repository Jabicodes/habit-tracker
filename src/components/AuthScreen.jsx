import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { CheckIcon } from './ui/Icons'

const toEmail = (username) => `${username.toLowerCase().trim()}@habittracker.com`

function toFriendly(err) {
  const code = err?.code ?? ''
  const msg  = (err?.message ?? '').toLowerCase()

  if (code === 'user_already_exists' || msg.includes('already registered') || msg.includes('user already')) {
    return { text: 'Username already taken, please choose another.', type: 'error' }
  }
  if (code === 'email_not_confirmed' || msg.includes('not confirmed') || msg.includes('email_not_confirmed')) {
    return {
      text:
        'Email confirmation is still enabled on your Supabase project.\n' +
        'To fix: Authentication → Settings → uncheck "Enable email confirmations" → Save.',
      type: 'warning',
    }
  }
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
    return { text: 'Username or password is incorrect.', type: 'error' }
  }
  if (msg.includes('password should be at least') || msg.includes('weak_password')) {
    return { text: 'Password must be at least 6 characters.', type: 'error' }
  }
  if (msg.includes('invalid format') || msg.includes('unable to validate email')) {
    return { text: 'Username contains unsupported characters. Use letters, numbers, . _ or - only.', type: 'error' }
  }
  return { text: err?.message || 'Something went wrong. Please try again.', type: 'error' }
}

export default function AuthScreen() {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const switchMode = (next) => {
    setMode(next)
    setMessage(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)

    const email = toEmail(username)
    console.log('[AuthScreen] sending email to Supabase:', email)

    setLoading(true)
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password })

        if (error) {
          setMessage(toFriendly(error))
          return
        }

        if (data.user?.identities?.length === 0) {
          setMessage({ text: 'Username already taken, please choose another.', type: 'error' })
          return
        }

        if (!data.session) {
          setMessage({
            text:
              'Account created! However, email confirmation is still enabled.\n' +
              'To log in: Supabase → Authentication → Settings → uncheck "Enable email confirmations" → Save, then sign in.',
            type: 'warning',
          })
          return
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          setMessage(toFriendly(error))
          return
        }
      }
    } catch (err) {
      setMessage(toFriendly(err))
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = !loading && username.trim().length > 0 && password.length > 0

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 relative overflow-hidden"
      style={{ backgroundColor: '#0A0A0A' }}
    >
      {/* Animated background line */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M 1440 0 C 1000 300 400 600 0 900"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1"
          fill="none"
          className="auth-bg-line"
        />
        <circle cx="1232" cy="135" r="3"   fill="white" className="auth-bg-dot" style={{ animationDelay: '0s' }} />
        <circle cx="1010" cy="270" r="2.5" fill="white" className="auth-bg-dot" style={{ animationDelay: '0.8s' }} />
        <circle cx="781"  cy="405" r="3"   fill="white" className="auth-bg-dot" style={{ animationDelay: '1.6s' }} />
        <circle cx="553"  cy="540" r="2.5" fill="white" className="auth-bg-dot" style={{ animationDelay: '2.4s' }} />
        <circle cx="332"  cy="675" r="3"   fill="white" className="auth-bg-dot" style={{ animationDelay: '3.2s' }} />
        <circle cx="126"  cy="810" r="2.5" fill="white" className="auth-bg-dot" style={{ animationDelay: '4s' }} />
      </svg>

      {/* Logo */}
      <div className="mb-10 text-center relative z-10">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{
            background: '#FF8A65',
            boxShadow: '0 8px 24px rgba(255,138,101,0.35)',
          }}
        >
          <CheckIcon className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white">Habit Tracker</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Build your daily streaks</p>
      </div>

      {/* Card */}
      <div
        className="auth-screen w-full max-w-sm relative z-10"
        style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '32px',
        }}
      >
        <h2 className="font-bold text-white mb-6" style={{ fontSize: '24px' }}>
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              className="auth-input w-full"
            />
            {mode === 'signup' && (
              <p className="text-xs mt-1.5 px-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Letters, numbers, . _ and - only · automatically lowercased
              </p>
            )}
          </div>

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            className="auth-input w-full"
          />

          {message && (
            <div
              className={[
                'text-sm rounded-xl px-3 py-2.5 whitespace-pre-line leading-relaxed',
                message.type === 'warning'
                  ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                  : 'text-red-400 bg-red-500/10 border border-red-500/20',
              ].join(' ')}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="auth-submit-btn w-full mt-1 font-bold text-white"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}
          </button>
        </form>

        <div className="mt-5 text-center">
          {mode === 'login' ? (
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              No account?{' '}
              <button
                onClick={() => switchMode('signup')}
                className="font-medium transition-colors"
                style={{ color: '#FF8A65' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#FF6B35')}
                onMouseLeave={e => (e.currentTarget.style.color = '#FF8A65')}
              >
                Sign up
              </button>
            </p>
          ) : (
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Already have an account?{' '}
              <button
                onClick={() => switchMode('login')}
                className="font-medium transition-colors"
                style={{ color: '#FF8A65' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#FF6B35')}
                onMouseLeave={e => (e.currentTarget.style.color = '#FF8A65')}
              >
                Log in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
