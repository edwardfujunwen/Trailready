import { useState } from 'react';
import type { PackingCategory as PackingCategoryType } from '../../types/packing';
import PackingItem from './PackingItem';
import { usePackingStore } from '../../store/usePackingStore';

interface Props {
  category: PackingCategoryType;
}

export default function PackingCategory({ category }: Props) {
  const [expanded, setExpanded] = useState(true);
  const toggleItem = usePackingStore((s) => s.toggleItem);
  const checkedCount = category.items.filter((i) => i.checked).length;
  const totalOz = category.items.reduce((sum, i) => sum + i.weightOz * i.quantity, 0);

  return (
    <div className="border border-stone-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-3 py-2 bg-stone-800/50 hover:bg-stone-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className={`w-3 h-3 text-stone-500 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-semibold text-stone-200">{category.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-500">{(totalOz / 16).toFixed(1)} lb</span>
          <span className="text-xs text-stone-500">{checkedCount}/{category.items.length}</span>
        </div>
      </button>
      {expanded && (
        <div className="divide-y divide-stone-800/50">
          {category.items.map((item) => (
            <PackingItem
              key={item.name}
              item={item}
              categoryName={category.name}
              onToggle={() => toggleItem(category.name, item.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
