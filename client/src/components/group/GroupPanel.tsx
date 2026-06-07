import { useState, useEffect } from 'react';
import { useTripStore } from '../../store/useTripStore';
import type { CarpoolEntry, TentEntry } from '../../store/useTripStore';

// ── Section header ──────────────────────────────────────────────────────────
function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-800 bg-stone-900/60 flex-shrink-0">
      <span className="text-base">{icon}</span>
      <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300">{title}</h3>
    </div>
  );
}

// ── Group Members ────────────────────────────────────────────────────────────
function MembersSection() {
  const groupMembers = useTripStore((s) => s.groupMembers);
  const setGroupMembers = useTripStore((s) => s.setGroupMembers);
  const [newName, setNewName] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const addMember = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setGroupMembers([...groupMembers, trimmed]);
    setNewName('');
  };

  const removeMember = (idx: number) => {
    setGroupMembers(groupMembers.filter((_, i) => i !== idx));
  };

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditValue(groupMembers[idx]);
  };

  const commitEdit = (idx: number) => {
    const trimmed = editValue.trim();
    if (trimmed) {
      const next = [...groupMembers];
      next[idx] = trimmed;
      setGroupMembers(next);
    }
    setEditingIdx(null);
  };

  return (
    <div className="flex flex-col">
      <SectionHeader title="Group Members" icon="👥" />
      <div className="px-4 py-3 space-y-1.5">
        {groupMembers.length === 0 && (
          <p className="text-xs text-stone-600 italic py-1">No members added yet</p>
        )}
        {groupMembers.map((name, idx) => (
          <div key={idx} className="flex items-center gap-2 group">
            {editingIdx === idx ? (
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => commitEdit(idx)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit(idx);
                  if (e.key === 'Escape') setEditingIdx(null);
                }}
                className="flex-1 bg-stone-800 border border-forest-600 rounded px-2 py-1 text-sm text-stone-100 focus:outline-none"
              />
            ) : (
              <button
                onClick={() => startEdit(idx)}
                className="flex-1 text-left text-sm text-stone-200 px-2 py-1 rounded hover:bg-stone-800 transition-colors truncate"
              >
                {name}
              </button>
            )}
            <button
              onClick={() => removeMember(idx)}
              className="text-stone-600 hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
              title="Remove"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {/* Add person */}
        <div className="flex gap-2 pt-1">
          <input
            type="text"
            placeholder="Add person..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addMember()}
            className="flex-1 bg-stone-800 border border-stone-700 rounded px-2 py-1.5 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-forest-500"
          />
          <button
            onClick={addMember}
            disabled={!newName.trim()}
            className="px-3 py-1.5 bg-forest-700 hover:bg-forest-600 disabled:bg-stone-800 disabled:text-stone-600 text-white text-xs font-semibold rounded transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Carpooling ───────────────────────────────────────────────────────────────
function CarpoolSection() {
  const groupMembers = useTripStore((s) => s.groupMembers);
  const carpool = useTripStore((s) => s.carpool);
  const setCarpool = useTripStore((s) => s.setCarpool);

  // Drivers are members who are marked as driver in carpool
  const driverNames = carpool.map((c) => c.driver);

  const addDriver = (name: string) => {
    if (driverNames.includes(name)) return;
    setCarpool([...carpool, { driver: name, seats: 4, passengers: [] }]);
  };

  const removeDriver = (driver: string) => {
    setCarpool(carpool.filter((c) => c.driver !== driver));
  };

  const updateEntry = (driver: string, patch: Partial<CarpoolEntry>) => {
    setCarpool(
      carpool.map((c) => (c.driver === driver ? { ...c, ...patch } : c))
    );
  };

  const togglePassenger = (driver: string, member: string) => {
    const entry = carpool.find((c) => c.driver === driver);
    if (!entry) return;
    const already = entry.passengers.includes(member);
    const next = already
      ? entry.passengers.filter((p) => p !== member)
      : [...entry.passengers, member];
    updateEntry(driver, { passengers: next });
  };

  // Non-driver members available as passengers
  const nonDrivers = groupMembers.filter((m) => !driverNames.includes(m));

  return (
    <div className="flex flex-col">
      <SectionHeader title="Carpooling" icon="🚗" />
      <div className="px-4 py-3 space-y-4">
        {groupMembers.length === 0 && (
          <p className="text-xs text-stone-600 italic">Add group members above first</p>
        )}

        {/* Existing driver rows */}
        {carpool.map((entry) => {
          const availablePassengers = groupMembers.filter(
            (m) => m !== entry.driver && !driverNames.includes(m)
          );
          return (
            <div key={entry.driver} className="bg-stone-900 rounded-lg border border-stone-800 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-forest-400 uppercase tracking-wider">Driver</span>
                  <span className="text-sm font-medium text-stone-100">{entry.driver}</span>
                </div>
                <button
                  onClick={() => removeDriver(entry.driver)}
                  className="text-stone-600 hover:text-red-400 transition-colors"
                  title="Remove driver"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Seats */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500 w-14">Seats</span>
                <select
                  value={entry.seats}
                  onChange={(e) => updateEntry(entry.driver, { seats: Number(e.target.value) })}
                  className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-xs text-stone-200 focus:outline-none focus:border-forest-500"
                >
                  {[2, 3, 4, 5, 6, 7].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span className="text-xs text-stone-600">
                  ({entry.passengers.length}/{entry.seats - 1} passengers)
                </span>
              </div>

              {/* Passengers */}
              {availablePassengers.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs text-stone-500 block">Passengers</span>
                  <div className="flex flex-wrap gap-1.5">
                    {availablePassengers.map((m) => {
                      const selected = entry.passengers.includes(m);
                      return (
                        <button
                          key={m}
                          onClick={() => togglePassenger(entry.driver, m)}
                          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors border ${
                            selected
                              ? 'bg-forest-700 border-forest-600 text-white'
                              : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-500'
                          }`}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {entry.passengers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-stone-800">
                  {entry.passengers.map((p) => (
                    <span key={p} className="text-xs text-stone-300 bg-stone-800 px-2 py-0.5 rounded">
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Add driver dropdown */}
        {nonDrivers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 flex-shrink-0">Mark as driver:</span>
            <div className="flex flex-wrap gap-1.5">
              {nonDrivers.map((m) => (
                <button
                  key={m}
                  onClick={() => addDriver(m)}
                  className="px-2 py-1 text-xs bg-stone-800 hover:bg-stone-700 border border-stone-700 hover:border-forest-600 text-stone-300 rounded transition-colors"
                >
                  + {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {groupMembers.length > 0 && carpool.length === 0 && (
          <p className="text-xs text-stone-600 italic">Click a member above to mark them as a driver</p>
        )}
      </div>
    </div>
  );
}

// ── Tent Assignments ─────────────────────────────────────────────────────────
function TentsSection() {
  const groupSize = useTripStore((s) => s.groupSize);
  const groupMembers = useTripStore((s) => s.groupMembers);
  const tents = useTripStore((s) => s.tents);
  const setTents = useTripStore((s) => s.setTents);

  const tentCount = Math.max(1, Math.ceil(groupSize / 2));

  // Sync tent list when group size changes
  useEffect(() => {
    const current = tents.length;
    if (current === tentCount) return;
    if (tentCount > current) {
      const added: TentEntry[] = [];
      for (let i = current + 1; i <= tentCount; i++) {
        added.push({ id: i, occupants: [] });
      }
      setTents([...tents, ...added]);
    } else {
      setTents(tents.slice(0, tentCount).map((t, i) => ({ ...t, id: i + 1 })));
    }
  }, [tentCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateTent = (id: number, occupants: string[]) => {
    setTents(tents.map((t) => (t.id === id ? { ...t, occupants } : t)));
  };

  const toggleOccupant = (tentId: number, member: string) => {
    const tent = tents.find((t) => t.id === tentId);
    if (!tent) return;
    const already = tent.occupants.includes(member);
    if (already) {
      updateTent(tentId, tent.occupants.filter((o) => o !== member));
    } else {
      if (tent.occupants.length >= 2) return; // max 2 per tent
      updateTent(tentId, [...tent.occupants, member]);
    }
  };

  // Members already assigned somewhere
  const assignedMembers = (excludeTentId: number) =>
    tents
      .filter((t) => t.id !== excludeTentId)
      .flatMap((t) => t.occupants);

  return (
    <div className="flex flex-col">
      <SectionHeader title="Tent Assignments" icon="⛺" />
      <div className="px-4 py-3 space-y-3">
        {groupMembers.length === 0 && (
          <p className="text-xs text-stone-600 italic">Add group members above to assign tents</p>
        )}

        {tents.map((tent) => {
          const blocked = assignedMembers(tent.id);
          return (
            <div key={tent.id} className="bg-stone-900 rounded-lg border border-stone-800 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                  Tent {tent.id}
                </span>
                <span className="text-xs text-stone-600">{tent.occupants.length}/2</span>
              </div>

              {/* Current occupants */}
              {tent.occupants.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tent.occupants.map((o) => (
                    <button
                      key={o}
                      onClick={() => toggleOccupant(tent.id, o)}
                      className="flex items-center gap-1 px-2 py-0.5 bg-forest-800/60 border border-forest-700 text-forest-300 text-xs rounded group/chip"
                      title="Click to unassign"
                    >
                      {o}
                      <span className="opacity-0 group-hover/chip:opacity-100 text-forest-400">×</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Available members to assign */}
              {tent.occupants.length < 2 && groupMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {groupMembers
                    .filter((m) => !tent.occupants.includes(m) && !blocked.includes(m))
                    .map((m) => (
                      <button
                        key={m}
                        onClick={() => toggleOccupant(tent.id, m)}
                        className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 hover:border-forest-600 text-stone-400 text-xs rounded transition-colors"
                      >
                        + {m}
                      </button>
                    ))}
                </div>
              )}

              {tent.occupants.length === 0 && groupMembers.length === 0 && (
                <p className="text-xs text-stone-700 italic">Empty</p>
              )}
            </div>
          );
        })}

        <p className="text-xs text-stone-700 pt-1">
          {tentCount} tent{tentCount !== 1 ? 's' : ''} for {groupSize} {groupSize !== 1 ? 'people' : 'person'} (2 per tent)
        </p>
      </div>
    </div>
  );
}

// ── Main GroupPanel ──────────────────────────────────────────────────────────
export default function GroupPanel() {
  const groupSize = useTripStore((s) => s.groupSize);

  if (groupSize <= 1) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="space-y-2">
          <div className="text-3xl">👥</div>
          <p className="text-sm text-stone-500">Set group size to 2+ in your trip settings to use group logistics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto divide-y divide-stone-800">
      <MembersSection />
      <CarpoolSection />
      <TentsSection />
    </div>
  );
}
