import { db } from './db';

export async function createCategory(label: string, colour: string): Promise<void> {
  const existing = await db.categories.toArray();
  const maxSortOrder = existing.reduce((max, c) => Math.max(max, c.sortOrder), -1);

  await db.categories.add({
    id: crypto.randomUUID(),
    label,
    colour,
    sortOrder: maxSortOrder + 1,
  });
}

export async function renameCategory(id: string, label: string): Promise<void> {
  await db.categories.update(id, { label });
}

export async function recolourCategory(id: string, colour: string): Promise<void> {
  await db.categories.update(id, { colour });
}

/** Swaps the sortOrder of a category with its neighbour in the given direction. */
export async function moveCategory(id: string, direction: 'up' | 'down'): Promise<void> {
  const categories = await db.categories.orderBy('sortOrder').toArray();
  const index = categories.findIndex((c) => c.id === id);
  if (index === -1) return;

  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= categories.length) return;

  const current = categories[index];
  const neighbour = categories[swapIndex];

  await db.transaction('rw', db.categories, async () => {
    await db.categories.update(current.id, { sortOrder: neighbour.sortOrder });
    await db.categories.update(neighbour.id, { sortOrder: current.sortOrder });
  });
}
