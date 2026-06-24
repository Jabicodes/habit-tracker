import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { CheckIcon } from './ui/Icons'

// Strip everything that's not valid in an email local-part, then lowercase.
// This handles spaces, accented chars, @, +, etc. before they reach Supabase.
const sanitize = (raw) =>
  raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')   // strip everything invalid in an email local-part
    .replace(/\.{2,}/g, '.')         // collapse consecutive dots (e.g. "a..b" → "a.b")
    .replace(/^[._-]+|[._-]+$/g, '') // strip leading/trailing dots, underscores, dashes

const toEmail = (username) => `${sanitize(username)}@habittracker.com`

// Supabase AuthError has both .message (string) and .code (string) fields.
// Check both so we aren't brittle against message wording changes.
function toFriendly(err) {
  const code = err?.code ?? ''
  const msg  = (err?.message ?? '').toLowerCase()

  if (code === 'user_already_exists' || msg.includes('already registered')) {
    return { text: 'That username is already taken. Try a different one.', type: 'error' }
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
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null) // { text, type: 'error'|'warning' }

  const switchMode = (next) => {
    setMode(next)
    setMessage(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)

    // Sanitize first so Supabase always receives a valid email local-part
    const clean = sanitize(username)
    if (!clean) {
      setMessage({ text: 'Username can only contain letters, numbers, . _ and -.', type: 'error' })
      return
    }

    const email = `${clean}@habittracker.com`

    setLoading(true)
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password })

        if (error) {
          setMessage(toFriendly(error))
          return
        }

        if (!data.session) {
          // User was created but email confirmation is still required —
          // there is no inbox to confirm, so the user is stuck until it's disabled.
          setMessage({
            text:
              'Account created! However, email confirmation is still enabled.\n' +
              'To log in: Supabase → Authentication → Settings → uncheck "Enable email confirmations" → Save, then sign in.',
            type: 'warning',
          })
          return
        }

        // session exists → useAuth's onAuthStateChange fires, app navigates automatically

      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
          setMessage(toFriendly(error))
          return
        }

        // no error → session is live, useAuth fires, app navigates automatically
      }
    } catch (err) {
      setMessage(toFriendly(err))
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = !loading && sanitize(username).length > 0 && password.length > 0

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-5">
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-600/30">
          <CheckIcon className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white">Habit Tracker</h1>
        <p className="text-slate-500 text-sm mt-1">Build your daily streaks</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-slate-800 border border-slate-700/60 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-6">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
            />
            {mode === 'signup' && (
              <p className="text-slate-600 text-xs mt-1.5 px-1">
                Letters, numbers, . _ and - only · automatically lowercased
              </p>
            )}
          </div>

          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
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

          <Button
            type="submit"
            className="w-full mt-1 rounded-xl"
            disabled={!canSubmit}
          >
            {loading
              ? 'Please wait…'
              : mode === 'login'
              ? 'Log in'
              : 'Sign up'}
          </Button>
        </form>

        <div className="mt-5 text-center">
          {mode === 'login' ? (
            <p className="text-slate-500 text-sm">
              No account?{' '}
              <button
                onClick={() => switchMode('signup')}
                className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p className="text-slate-500 text-sm">
              Already have an account?{' '}
              <button
                onClick={() => switchMode('login')}
                className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
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
