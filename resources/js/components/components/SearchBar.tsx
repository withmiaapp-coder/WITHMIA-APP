import React, { memo } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = memo(({ value, onChange, placeholder = 'Buscar conversaciones...' }) => {
  return (
    <div className="relative mb-3">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
      <input
        type="text"
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 bg-white/30 border border-white/30 rounded-xl text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 backdrop-blur-xl transition-all duration-300"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Buscar conversaciones"
      />
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;
