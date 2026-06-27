import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useHabits } from './hooks/useHabits'
import AuthScreen from './components/AuthScreen'
import HabitView from './components/HabitView'
import ManageHabits from './components/ManageHabits'
import SessionsScreen from './components/SessionsScreen'
import StatisticsScreen from './components/StatisticsScreen'
import SettingsScreen from './components/SettingsScreen'
import { Screen } from './components/ui/Screen'

const ORANGE = '#FF8A65'

// ── Sidebar icons (Lucide-style inline SVGs) ─────────────────────────────────

function DashboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function SessionsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5" />
      <path d="M9 3h6" />
      <path d="M12 3v2" />
    </svg>
  )
}

function HabitsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

function StatisticsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6"  y1="20" x2="6"  y2="14" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function LogOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

// ── Mobile bottom nav ─────────────────────────────────────────────────────────

const MOBILE_TABS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: 'sessions',
    label: 'Sessions',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 2.5" />
        <path d="M9 3h6" />
        <path d="M12 3v2" />
      </svg>
    ),
  },
  {
    id: 'habits',
    label: 'Habits',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    id: 'statistics',
    label: 'Stats',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6"  y1="20" x2="6"  y2="14" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
]

function MobileBottomNav({ activeNav, onNavChange }) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 p-4 bg-transparent">
      <div className="bg-[#121214]/90 backdrop-blur-md border border-zinc-800/50 rounded-2xl max-w-md mx-auto px-4 py-2 flex justify-around items-center shadow-2xl">
        {MOBILE_TABS.map(({ id, label, icon }) => {
          const isActive = activeNav === id
          return (
            <button
              key={id}
              onClick={() => onNavChange(id)}
              className={[
                'flex flex-col items-center justify-center py-1.5 px-2',
                'active:scale-95 transition-transform duration-100',
                isActive ? 'text-[#FF8A65]' : 'text-zinc-500 hover:text-zinc-300',
              ].join(' ')}
            >
              {icon}
              <span className="text-[10px] font-semibold tracking-wider uppercase mt-1">
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Desktop sidebar ───────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',  Icon: DashboardIcon  },
  { id: 'sessions',   label: 'Sessions',   Icon: SessionsIcon   },
  { id: 'habits',     label: 'Habits',     Icon: HabitsIcon     },
  { id: 'statistics', label: 'Statistics', Icon: StatisticsIcon },
  { id: 'settings',   label: 'Settings',   Icon: SettingsIcon   },
]

function Sidebar({ activeNav, onNavChange, onSignOut }) {
  return (
    <aside
      className="hidden md:flex w-64 h-screen flex-col shrink-0"
      style={{ background: '#09090b', borderRight: '1px solid rgba(39,39,42,0.4)' }}
    >
      {/* Brand */}
      <div className="px-6 pt-7 pb-8">
        <span className="font-medium text-xl tracking-wide text-neutral-200">Keystone</span>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-0.5 px-3">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = activeNav === id
          return (
            <button
              key={id}
              onClick={() => onNavChange(id)}
              className={[
                'flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg text-sm',
                'transition-all duration-300',
                isActive
                  ? 'text-white border-l-2 border-orange-500'
                  : 'text-zinc-400 hover:text-white border-l-2 border-transparent',
              ].join(' ')}
              style={isActive ? { background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)' } : {}}
            >
              <Icon />
              {label}
            </button>
          )
        })}
      </nav>

      {/* Log out — pushed to bottom */}
      <div className="mt-auto px-3 pb-7">
        <button
          onClick={onSignOut}
          className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg text-sm text-zinc-500 hover:text-red-400 transition-all duration-300 border-l-2 border-transparent"
        >
          <LogOutIcon />
          Log out
        </button>
      </div>
    </aside>
  )
}

// ── Root component ────────────────────────────────────────────────────────────

export default function App() {
  const { session, user, loading: authLoading, signOut } = useAuth()
  const [activeNav, setActiveNav] = useState('dashboard')

  const {
    habits,
    completions,
    streak,
    loading,
    error,
    completeHabit,
    addHabit,
    updateHabit,
    deleteHabit,
    reorderHabits,
  } = useHabits(user?.id)

  // ── Full-screen states (no sidebar) ────────────────────────────────────────

  if (authLoading) {
    return (
      <Screen className="items-center justify-center">
        <div
          className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: ORANGE, borderTopColor: 'transparent' }}
        />
      </Screen>
    )
  }

  if (!session) {
    return <AuthScreen />
  }

  if (error) {
    return (
      <Screen className="items-center justify-center p-8 text-center">
        <div className="text-5xl mb-6">⚠️</div>
        <h1 className="text-xl font-bold text-white mb-3">Connection error</h1>
        <p className="text-sm max-w-xs" style={{ color: '#8E8E93' }}>{error}</p>
        <p className="text-xs mt-4" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Make sure your .env file has valid Supabase credentials.
        </p>
      </Screen>
    )
  }

  if (loading) {
    return (
      <Screen className="items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: ORANGE, borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: '#8E8E93' }}>Loading habits…</p>
        </div>
      </Screen>
    )
  }

  const username = (user.email.split('@')[0] || 'jb').toUpperCase()

  // ── Desktop two-column layout ───────────────────────────────────────────────

  return (
    <>
      {/* On desktop, the sidebar replaces HabitView's mobile bottom nav */}
      <style>{`
        @media (min-width: 768px) {
          .fixed.bottom-0.left-0.right-0 { display: none !important; }
        }
      `}</style>

      <div className="flex h-screen overflow-hidden" style={{ background: '#020205' }}>

        {/* Left: fixed sidebar */}
        <Sidebar
          activeNav={activeNav}
          onNavChange={setActiveNav}
          onSignOut={signOut}
        />

        {/* Right: main content arena */}
        <main className="flex-1 h-screen overflow-y-auto pb-24 md:pb-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black">

          {activeNav === 'habits' ? (
            <ManageHabits
              habits={habits}
              onAdd={addHabit}
              onUpdate={updateHabit}
              onDelete={deleteHabit}
              onReorder={reorderHabits}
              onBack={() => setActiveNav('dashboard')}
              username={username}
              onSignOut={signOut}
            />
          ) : activeNav === 'sessions' ? (
            <SessionsScreen
              habits={habits}
              completions={completions}
              userId={user?.id}
              username={username}
            />
          ) : activeNav === 'statistics' ? (
            <StatisticsScreen
              habits={habits}
              completions={completions}
              userId={user?.id}
            />
          ) : activeNav === 'settings' ? (
            <SettingsScreen
              username={username}
              onSignOut={signOut}
              userId={user?.id}
            />
          ) : (
            <HabitView
              habits={habits}
              completions={completions}
              streak={streak}
              onComplete={completeHabit}
              onManage={() => setActiveNav('habits')}
              username={username}
              userId={user?.id}
              onSignOut={signOut}
            />
          )}
        </main>

        <MobileBottomNav activeNav={activeNav} onNavChange={setActiveNav} />

      </div>
    </>
  )
}
