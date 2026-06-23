import { useState } from 'react'
import { useHabits } from './hooks/useHabits'
import HabitView from './components/HabitView'
import ManageHabits from './components/ManageHabits'
import { Screen } from './components/ui/Screen'

export default function App() {
  const [screen, setScreen] = useState('main') // 'main' | 'manage'

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
  } = useHabits()

  if (error) {
    return (
      <Screen className="items-center justify-center p-8 text-center">
        <div className="text-5xl mb-6">⚠️</div>
        <h1 className="text-xl font-bold text-white mb-3">Connection error</h1>
        <p className="text-slate-400 text-sm max-w-xs">{error}</p>
        <p className="text-slate-600 text-xs mt-4">
          Make sure your .env file has valid Supabase credentials.
        </p>
      </Screen>
    )
  }

  if (loading) {
    return (
      <Screen className="items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-slate-600 text-sm">Loading habits…</p>
        </div>
      </Screen>
    )
  }

  if (screen === 'manage') {
    return (
      <ManageHabits
        habits={habits}
        onAdd={addHabit}
        onUpdate={updateHabit}
        onDelete={deleteHabit}
        onReorder={reorderHabits}
        onBack={() => setScreen('main')}
      />
    )
  }

  return (
    <HabitView
      habits={habits}
      completions={completions}
      streak={streak}
      onComplete={completeHabit}
      onManage={() => setScreen('manage')}
    />
  )
}
