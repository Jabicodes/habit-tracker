import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function ManageHabits({ habits, onAdd, onUpdate, onDelete, onReorder, onBack }) {
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    try {
      await onAdd(newName, newDesc)
      setNewName('')
      setNewDesc('')
      setShowAdd(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = habits.findIndex((h) => h.id === active.id)
    const newIndex = habits.findIndex((h) => h.id === over.id)
    onReorder(arrayMove(habits, oldIndex, newIndex))
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col max-w-md mx-auto px-5">
      {/* ── Header ── */}
      <div className="flex items-center gap-4 pt-safe mb-8">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-400 hover:text-white transition-all"
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Manage Habits</h1>
          <p className="text-slate-500 text-sm">{habits.length} habit{habits.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white transition-all"
          aria-label="Add habit"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-5 h-5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* ── Add form ── */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="bg-slate-800 border border-slate-700/60 rounded-2xl p-5 mb-6 animate-fade-up"
        >
          <h2 className="text-white font-semibold mb-4">New Habit</h2>
          <input
            autoFocus
            type="text"
            placeholder="Habit name *"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full bg-slate-700/60 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
            required
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full bg-slate-700/60 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setShowAdd(false); setNewName(''); setNewDesc('') }}
              className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !newName.trim()}
              className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Adding…' : 'Add Habit'}
            </button>
          </div>
        </form>
      )}

      {/* ── Sortable list ── */}
      {habits.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
          <p className="text-slate-600 text-lg mb-2">No habits yet</p>
          <p className="text-slate-700 text-sm">Tap + to add your first habit.</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={habits.map((h) => h.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-3 pb-safe">
              {habits.map((habit) => (
                <SortableHabitItem
                  key={habit.id}
                  habit={habit}
                  isEditing={editId === habit.id}
                  onStartEdit={() => setEditId(habit.id)}
                  onCancelEdit={() => setEditId(null)}
                  onSave={async (name, description) => {
                    await onUpdate(habit.id, { name, description })
                    setEditId(null)
                  }}
                  onDelete={() => onDelete(habit.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

function SortableHabitItem({ habit, isEditing, onStartEdit, onCancelEdit, onSave, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: habit.id,
  })

  const [editName, setEditName] = useState(habit.name)
  const [editDesc, setEditDesc] = useState(habit.description || '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!editName.trim()) return
    setSaving(true)
    try {
      await onSave(editName.trim(), editDesc.trim())
    } finally {
      setSaving(false)
    }
  }

  const handleStartEdit = () => {
    setEditName(habit.name)
    setEditDesc(habit.description || '')
    setConfirmDelete(false)
    onStartEdit()
  }

  if (isEditing) {
    return (
      <li ref={setNodeRef} style={style}>
        <form
          onSubmit={handleSave}
          className="bg-slate-800 border border-indigo-500/50 rounded-2xl p-5"
        >
          <input
            autoFocus
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full bg-slate-700/60 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
            required
          />
          <input
            type="text"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full bg-slate-700/60 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancelEdit}
              className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-400 hover:text-white transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !editName.trim()}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="bg-slate-800 border border-slate-700/60 rounded-2xl flex items-center gap-3 px-4 py-4 select-none"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-slate-600 hover:text-slate-400 active:text-slate-300 transition-colors cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 shrink-0"
        aria-label="Drag to reorder"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <circle cx="9" cy="7" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="9" cy="17" r="1.5" />
          <circle cx="15" cy="7" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="15" cy="17" r="1.5" />
        </svg>
      </button>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate">{habit.name}</p>
        {habit.description && (
          <p className="text-slate-500 text-sm truncate">{habit.description}</p>
        )}
      </div>

      {/* Actions */}
      {confirmDelete ? (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-slate-400 text-xs">Delete?</span>
          <button
            onClick={() => onDelete()}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors"
          >
            Yes
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors"
          >
            No
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleStartEdit}
            className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-all"
            aria-label="Edit"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
            aria-label="Delete"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>
      )}
    </li>
  )
}
