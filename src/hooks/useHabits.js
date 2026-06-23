import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const todayStr = () => new Date().toISOString().split('T')[0]

export function useHabits() {
  const [habits, setHabits] = useState([])
  const [completions, setCompletions] = useState(new Set())
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ------------------------------------------------------------------
  // Streak calculation (client-side, last 90 days)
  // A day is "perfect" when every active habit was completed.
  // If today is not yet perfect, start the streak count from yesterday.
  // ------------------------------------------------------------------
  const calcStreak = useCallback(async (activeHabits, todayCompletions) => {
    if (!activeHabits.length) return 0

    const ids = activeHabits.map((h) => h.id)

    const since = new Date()
    since.setDate(since.getDate() - 90)

    const { data } = await supabase
      .from('daily_completions')
      .select('habit_id, completed_date')
      .gte('completed_date', since.toISOString().split('T')[0])

    const byDate = {}
    ;(data || []).forEach((c) => {
      byDate[c.completed_date] = byDate[c.completed_date] || new Set()
      byDate[c.completed_date].add(c.habit_id)
    })
    byDate[todayStr()] = todayCompletions

    const isPerfect = (date) =>
      ids.length > 0 && ids.every((id) => (byDate[date] || new Set()).has(id))

    const base = new Date()
    base.setHours(0, 0, 0, 0)

    // If today not finished yet, start from yesterday
    let count = 0
    let startOffset = isPerfect(todayStr()) ? 0 : 1

    for (let i = startOffset; i < 90; i++) {
      const d = new Date(base)
      d.setDate(base.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      if (isPerfect(ds)) {
        count++
      } else {
        break
      }
    }

    return count
  }, [])

  // ------------------------------------------------------------------
  // Load everything
  // ------------------------------------------------------------------
  const loadAll = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [{ data: habitsData, error: habitsErr }, { data: compData, error: compErr }] =
        await Promise.all([
          supabase.from('habits').select('*').eq('is_active', true).order('order_index'),
          supabase
            .from('daily_completions')
            .select('habit_id')
            .eq('completed_date', todayStr()),
        ])

      if (habitsErr) throw habitsErr
      if (compErr) throw compErr

      const habitsArr = habitsData || []
      const compSet = new Set((compData || []).map((c) => c.habit_id))

      setHabits(habitsArr)
      setCompletions(compSet)
      setStreak(await calcStreak(habitsArr, compSet))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [calcStreak])

  // Initial load + midnight auto-reset
  useEffect(() => {
    loadAll()

    const now = new Date()
    const midnight = new Date(now)
    midnight.setDate(midnight.getDate() + 1)
    midnight.setHours(0, 0, 0, 0)
    const msUntil = midnight - now

    const t = setTimeout(loadAll, msUntil)
    return () => clearTimeout(t)
  }, [loadAll])

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------
  const completeHabit = async (habitId) => {
    const { error: err } = await supabase
      .from('daily_completions')
      .upsert({ habit_id: habitId, completed_date: todayStr() })

    if (err) throw err

    const next = new Set([...completions, habitId])
    setCompletions(next)
    setStreak(await calcStreak(habits, next))
  }

  const addHabit = async (name, description = '') => {
    const maxOrder = habits.length ? Math.max(...habits.map((h) => h.order_index)) : -1

    const { data, error: err } = await supabase
      .from('habits')
      .insert({ name: name.trim(), description: description.trim(), order_index: maxOrder + 1 })
      .select()
      .single()

    if (err) throw err
    setHabits((prev) => [...prev, data])
  }

  const updateHabit = async (id, updates) => {
    const { error: err } = await supabase.from('habits').update(updates).eq('id', id)
    if (err) throw err
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, ...updates } : h)))
  }

  const deleteHabit = async (id) => {
    const { error: err } = await supabase
      .from('habits')
      .update({ is_active: false })
      .eq('id', id)
    if (err) throw err
    setHabits((prev) => prev.filter((h) => h.id !== id))
  }

  const reorderHabits = async (reordered) => {
    setHabits(reordered) // optimistic
    try {
      await Promise.all(
        reordered.map((h, i) =>
          supabase.from('habits').update({ order_index: i }).eq('id', h.id)
        )
      )
    } catch (err) {
      await loadAll() // revert
      throw err
    }
  }

  return {
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
  }
}
