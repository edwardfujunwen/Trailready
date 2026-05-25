import type { PackingList } from '../types/packing';
import type { TripContext } from './types';

export async function generatePackingList(ctx: TripContext): Promise<PackingList> {
  const res = await fetch('/api/packing/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ctx),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate packing list');
  }
  return res.json();
}
