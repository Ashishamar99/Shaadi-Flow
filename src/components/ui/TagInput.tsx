import { useState, useRef, useMemo } from 'react';
import { X, Plus } from 'lucide-react';

const PRESET_TAGS = [
  'Family',
  'Close Family',
  'Extended Family',
  'Friends',
  'Work',
  'Neighbors',
  'College',
  'School',
];

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  extraPresets?: string[];
}

export function TagInput({ value, onChange, label, extraPresets }: TagInputProps) {
  const [input, setInput] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput('');
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const allPresets = useMemo(() => {
    const combined = new Set([...PRESET_TAGS, ...(extraPresets ?? [])]);
    return Array.from(combined).sort();
  }, [extraPresets]);

  const unusedPresets = allPresets.filter(
    (p) => !value.some((v) => v.toLowerCase() === p.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-semibold text-warm-600 pl-1">
          {label}
        </label>
      )}

      <div
        className="flex flex-wrap gap-1.5 p-2 min-h-[42px] rounded-card border border-blush-200 bg-white focus-within:ring-2 focus-within:ring-blush-300 focus-within:border-transparent transition-all cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blush-100 text-blush-600 rounded-pill text-xs font-semibold"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="hover:text-red-500 cursor-pointer"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowPresets(true)}
          onBlur={() => {
            setTimeout(() => setShowPresets(false), 200);
            if (input.trim()) addTag(input);
          }}
          placeholder={value.length === 0 ? 'Add tags...' : ''}
          className="flex-1 min-w-[80px] border-none outline-none bg-transparent text-sm text-warm-700 placeholder:text-warm-300 py-0.5"
        />
      </div>

      {showPresets && unusedPresets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {unusedPresets.map((preset) => (
            <button
              key={preset}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(preset)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blush-50 hover:bg-blush-100 text-warm-400 hover:text-warm-600 rounded-pill text-xs font-medium transition-colors cursor-pointer"
            >
              <Plus size={10} />
              {preset}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
