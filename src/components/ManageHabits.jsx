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
import { Screen } from './ui/Screen'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { ChevronLeftIcon, PlusIcon, PencilIcon, TrashIcon, DragHandleIcon, LogOutIcon } from './ui/Icons'

export default function ManageHabits({ habits, onAdd, onUpdate, onDelete, onReorder, onBack, username, onSignOut }) {
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
    <Screen>
      {/* ── Header ── */}
      <div className="flex items-center gap-4 pt-safe mb-8">
        <Button variant="panel" size="icon" onClick={onBack} aria-label="Back">
          <ChevronLeftIcon />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Manage Habits</h1>
          <p className="text-slate-500 text-sm">{habits.length} habit{habits.length !== 1 ? 's' : ''}</p>
        </div>
        <Button
          variant="panel-accent"
          size="icon"
          onClick={() => setShowAdd((v) => !v)}
          aria-label="Add habit"
        >
          <PlusIcon />
        </Button>
      </div>

      {/* ── Add form ── */}
      {showAdd && (
        <form onSubmit={handleAdd} className="mb-6 animate-fade-up">
          <Card className="p-5">
            <h2 className="text-white font-semibold mb-4">New Habit</h2>
            <Input
              autoFocus
              type="text"
              placeholder="Habit name *"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mb-3"
              required
            />
            <Input
              type="text"
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="mb-4"
            />
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => { setShowAdd(false); setNewName(''); setNewDesc('') }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={saving || !newName.trim()}
              >
                {saving ? 'Adding…' : 'Add Habit'}
              </Button>
            </div>
          </Card>
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

      {/* ── Sign out ── */}
      <div className="mt-6 pt-4 border-t border-slate-800 pb-safe flex items-center justify-between">
        <p className="text-slate-600 text-xs truncate flex-1">@{username}</p>
        <button
          onClick={onSignOut}
          className="flex items-center gap-1.5 text-slate-600 hover:text-slate-400 transition-colors text-xs ml-4 shrink-0"
        >
          <LogOutIcon />
          Sign out
        </button>
      </div>
    </Screen>
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
        <form onSubmit={handleSave}>
          <Card className="p-5 border-indigo-500/50">
            <Input
              autoFocus
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="mb-3"
              required
            />
            <Input
              type="text"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Description (optional)"
              className="mb-4"
            />
            <div className="flex gap-3">
              <Button type="button" variant="secondary" className="flex-1 py-2.5" onClick={onCancelEdit}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 py-2.5" disabled={saving || !editName.trim()}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </Card>
        </form>
      </li>
    )
  }

  return (
    <li ref={setNodeRef} style={style}>
      <Card className="flex items-center gap-3 px-4 py-4 select-none">
        {/* Drag handle — kept as plain button for dnd-kit listener spread */}
        <button
          {...attributes}
          {...listeners}
          className="text-slate-600 hover:text-slate-400 active:text-slate-300 transition-colors cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 shrink-0"
          aria-label="Drag to reorder"
        >
          <DragHandleIcon />
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
            <Button variant="confirm" size="sm" onClick={() => onDelete()}>Yes</Button>
            <Button variant="dismiss" size="sm" onClick={() => setConfirmDelete(false)}>No</Button>
          </div>
        ) : (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleStartEdit}
              className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-all"
              aria-label="Edit"
            >
              <PencilIcon />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
              aria-label="Delete"
            >
              <TrashIcon />
            </button>
          </div>
        )}
      </Card>
    </li>
  )
}
