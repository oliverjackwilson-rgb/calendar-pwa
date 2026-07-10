import { useState } from 'react';
import { createCategory, moveCategory, recolourCategory, renameCategory, useCategories } from '../db';

export function CategoryManager() {
  const categories = useCategories();
  const [newLabel, setNewLabel] = useState('');
  const [newColour, setNewColour] = useState('#4f46e5');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  function startEdit(id: string, label: string) {
    setEditingId(id);
    setEditingLabel(label);
  }

  function commitEdit() {
    const label = editingLabel.trim();
    if (editingId && label) {
      renameCategory(editingId, label).catch(console.error);
    }
    setEditingId(null);
  }

  function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    const label = newLabel.trim();
    if (!label) return;
    createCategory(label, newColour).catch(console.error);
    setNewLabel('');
  }

  const list = categories ?? [];

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Categories</h2>

      <ul className="flex flex-col gap-2">
        {list.map((category, index) => (
          <li
            key={category.id}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-2 py-1 dark:border-gray-800"
          >
            <input
              type="color"
              value={category.colour}
              onChange={(e) => recolourCategory(category.id, e.target.value).catch(console.error)}
              aria-label={`Colour for ${category.label}`}
              className="h-11 w-11 shrink-0 rounded border-0 bg-transparent p-0"
            />
            {editingId === category.id ? (
              <input
                type="text"
                value={editingLabel}
                onChange={(e) => setEditingLabel(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                autoFocus
                className="min-h-11 flex-1 rounded border border-gray-300 px-2 text-base dark:border-gray-700 dark:bg-gray-900"
              />
            ) : (
              <button
                type="button"
                onClick={() => startEdit(category.id, category.label)}
                className="min-h-11 flex-1 text-left text-base text-gray-900 dark:text-gray-100"
              >
                {category.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => moveCategory(category.id, 'up').catch(console.error)}
              disabled={index === 0}
              aria-label={`Move ${category.label} up`}
              className="flex min-h-11 min-w-11 items-center justify-center text-gray-400 disabled:opacity-30"
            >
              ▲
            </button>
            <button
              type="button"
              onClick={() => moveCategory(category.id, 'down').catch(console.error)}
              disabled={index === list.length - 1}
              aria-label={`Move ${category.label} down`}
              className="flex min-h-11 min-w-11 items-center justify-center text-gray-400 disabled:opacity-30"
            >
              ▼
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdd} className="flex items-center gap-2">
        <input
          type="color"
          value={newColour}
          onChange={(e) => setNewColour(e.target.value)}
          aria-label="New category colour"
          className="h-11 w-11 shrink-0 rounded border-0 bg-transparent p-0"
        />
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="New category"
          className="min-h-11 flex-1 rounded-lg border border-gray-300 px-3 text-base dark:border-gray-700 dark:bg-gray-900"
        />
        <button
          type="submit"
          className="min-h-11 shrink-0 rounded-full bg-indigo-600 px-3 text-sm font-medium text-white"
        >
          Add
        </button>
      </form>
    </div>
  );
}
