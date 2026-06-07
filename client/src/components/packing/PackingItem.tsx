import { useState } from 'react';
import type { PackingItem as PackingItemType } from '../../types/packing';

interface Props {
  item: PackingItemType;
  categoryName: string;
  onToggle: () => void;
}

const priorityColors = {
  essential: 'bg-red-900 text-red-300',
  recommended: 'bg-amber-900 text-amber-300',
  optional: 'bg-stone-800 text-stone-500',
};

function GearThumbnail({ itemName }: { itemName: string }) {
  const [imgError, setImgError] = useState(false);
  const query = encodeURIComponent(`${itemName} outdoor gear`);
  const src = `https://source.unsplash.com/48x48/?${query}`;

  if (imgError) {
    return (
      <span className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-xl rounded-md bg-stone-800 border border-stone-700">
        ⛺
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={itemName}
      width={48}
      height={48}
      className="flex-shrink-0 w-12 h-12 rounded-md object-cover border border-stone-700"
      onError={() => setImgError(true)}
    />
  );
}

export default function PackingItem({ item, onToggle }: Props) {
  const reiUrl = `https://www.rei.com/search?q=${encodeURIComponent(item.reiSearchTerm)}`;
  const backcountryUrl = `https://www.backcountry.com/search#q=${encodeURIComponent(item.reiSearchTerm)}`;

  return (
    <div className={`flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-stone-800/50 transition-colors group ${item.checked ? 'opacity-50' : ''}`}>
      <button onClick={onToggle} className="mt-0.5 flex-shrink-0">
        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${item.checked ? 'bg-forest-600 border-forest-600' : 'border-stone-600 hover:border-forest-500'}`}>
          {item.checked && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium text-stone-200 ${item.checked ? 'line-through' : ''}`}>
            {item.quantity > 1 && <span className="text-stone-400 mr-1">×{item.quantity}</span>}
            {item.name}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${priorityColors[item.priority]}`}>
            {item.priority}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-stone-600">{item.weightOz} oz</span>
          {item.notes && <span className="text-xs text-stone-500 italic truncate">{item.notes}</span>}
        </div>
        {item.reiSearchTerm && (
          <div className="flex items-start gap-2 mt-1.5">
            <GearThumbnail itemName={item.name} />
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <span className="text-[10px] text-stone-600">Buy:</span>
              <a
                href={reiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-900/60 text-green-400 hover:bg-green-900 transition-colors"
              >
                REI ↗
              </a>
              <a
                href={backcountryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-400 hover:bg-blue-900 transition-colors"
              >
                Backcountry ↗
              </a>
              {item.priceRangeUsd && (
                <span className="text-[10px] text-stone-600">{item.priceRangeUsd}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
