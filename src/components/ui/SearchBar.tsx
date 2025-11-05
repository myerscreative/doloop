'use client';

import { useState } from 'react';
import { Loop } from '@/types/loop';

interface SearchBarProps {
  loops: Loop[];
  onSelect: (loopId: string) => void;
}

export function SearchBar({ loops, onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const results = query.trim()
    ? loops.filter(loop =>
        loop.title.toLowerCase().includes(query.toLowerCase()) ||
        loop.items?.some(item =>
          item.title.toLowerCase().includes(query.toLowerCase())
        )
      )
    : [];

  const handleSelect = (loopId: string) => {
    onSelect(loopId);
    setQuery('');
    setShowResults(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          placeholder="Search loops and tasks..."
          className="w-full px-4 py-4 pl-12 rounded-xl border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900"
          aria-label="Search loops and tasks"
        />
        <svg
          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="2" />
          <path d="M 12 12 L 18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto border border-gray-200">
          {results.map((loop) => (
            <button
              key={loop.id}
              onClick={() => handleSelect(loop.id)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
            >
              <div className="font-medium text-gray-900">{loop.title}</div>
              <div className="text-sm text-gray-600">
                {loop.totalTasks} tasks · {loop.type}
              </div>
            </button>
          ))}
        </div>
      )}

      {showResults && query.trim() && results.length === 0 && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-lg z-50 border border-gray-200 p-4">
          <p className="text-gray-600 text-sm text-center">No loops found</p>
        </div>
      )}
    </div>
  );
}

export default SearchBar;
