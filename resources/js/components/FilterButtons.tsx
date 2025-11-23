import React, { memo } from 'react';

interface FilterButtonsProps {
  selectedFilter: string;
  filters: Array<{ id: string; label: string; count: number }>;
  onFilterChange: (filterId: string) => void;
}

const FilterButtons: React.FC<FilterButtonsProps> = memo(({ selectedFilter, filters, onFilterChange }) => {
  return (
    <div className="flex space-x-2">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onFilterChange(filter.id)}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-300 ${
            selectedFilter === filter.id
              ? 'bg-blue-500/20 text-blue-700 border border-blue-400/30'
              : 'bg-white/10 text-gray-600 hover:bg-white/20'
          }`}
          aria-pressed={selectedFilter === filter.id}
          aria-label={`Filtrar por ${filter.label}`}
        >
          {filter.label} ({filter.count})
        </button>
      ))}
    </div>
  );
});

FilterButtons.displayName = 'FilterButtons';

export default FilterButtons;
