import { useState, type ReactNode } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab?: string;
  onChange?: (tabId: string) => void;
  children?: ReactNode;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  const [internal, setInternal] = useState(tabs[0]?.id ?? '');
  const current = activeTab ?? internal;

  const handleChange = (id: string) => {
    setInternal(id);
    onChange?.(id);
  };

  return (
    <div className="flex gap-1 bg-blush-50 rounded-pill p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleChange(tab.id)}
          className={`
            flex items-center gap-2 px-5 py-2 rounded-pill text-sm font-semibold
            transition-all duration-200 cursor-pointer
            ${
              current === tab.id
                ? 'bg-white text-warm-700 shadow-card'
                : 'text-warm-400 hover:text-warm-600'
            }
          `}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
