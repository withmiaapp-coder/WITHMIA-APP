import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, MessageCircle, User, Clock, ChevronRight, Loader2 } from 'lucide-react';

interface SearchResult {
  conversationId: number;
  contactName: string;
  contactPhone: string;
  messageId?: number;
  messageContent: string;
  messageTimestamp: string;
  matchType: 'contact' | 'message';
  relevanceScore: number;
}

interface SearchGlobalProps {
  conversations: any[];
  onSelectConversation: (conversationId: number, messageId?: number) => void;
  onClose: () => void;
  isOpen: boolean;
}

const SearchGlobal: React.FC<SearchGlobalProps> = ({
  conversations,
  onSelectConversation,
  onClose,
  isOpen
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Auto-focus al abrir
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Búsqueda con debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(() => {
      performSearch(query);
      setIsSearching(false);
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeoutId);
  }, [query, conversations]);

  const performSearch = (searchQuery: string) => {
    const searchTerm = searchQuery.toLowerCase().trim();
    const foundResults: SearchResult[] = [];

    conversations.forEach((conv) => {
      let relevanceScore = 0;

      // 1. Buscar en nombre del contacto
      const contactName = conv.contact?.name?.toLowerCase() || '';
      const contactPhone = conv.contact?.phone_number || conv.contact?.identifier || '';
      
      if (contactName.includes(searchTerm)) {
        relevanceScore += contactName.startsWith(searchTerm) ? 100 : 50;
        foundResults.push({
          conversationId: conv.id,
          contactName: conv.contact?.name || 'Sin nombre',
          contactPhone,
          messageContent: conv.last_message?.content || 'Sin mensajes',
          messageTimestamp: conv.last_message?.timestamp || conv.created_at,
          matchType: 'contact',
          relevanceScore: relevanceScore + 1000 // Prioridad alta para nombres
        });
      }

      // 2. Buscar en teléfono
      if (contactPhone.includes(searchTerm)) {
        foundResults.push({
          conversationId: conv.id,
          contactName: conv.contact?.name || 'Sin nombre',
          contactPhone,
          messageContent: conv.last_message?.content || 'Sin mensajes',
          messageTimestamp: conv.last_message?.timestamp || conv.created_at,
          matchType: 'contact',
          relevanceScore: 900 // Alta prioridad
        });
      }

      // 3. Buscar en mensajes
      if (conv.messages && Array.isArray(conv.messages)) {
        conv.messages.forEach((msg: any) => {
          const messageContent = msg.content?.toLowerCase() || '';
          if (messageContent.includes(searchTerm)) {
            // Calcular relevancia por posición del match
            const matchIndex = messageContent.indexOf(searchTerm);
            const matchRelevance = matchIndex === 0 ? 30 : 20;

            foundResults.push({
              conversationId: conv.id,
              contactName: conv.contact?.name || 'Sin nombre',
              contactPhone,
              messageId: msg.id,
              messageContent: msg.content || '',
              messageTimestamp: msg.created_at || msg.timestamp,
              matchType: 'message',
              relevanceScore: matchRelevance
            });
          }
        });
      }
    });

    // Ordenar por relevancia
    foundResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Limitar a 50 resultados
    setResults(foundResults.slice(0, 50));
    setSelectedIndex(0);
  };

  // Navegación con teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelectResult(results[selectedIndex]);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Auto-scroll al resultado seleccionado
  useEffect(() => {
    if (resultsRef.current && results.length > 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  const handleSelectResult = (result: SearchResult) => {
    onSelectConversation(result.conversationId, result.messageId);
    onClose();
    setQuery('');
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-300 text-gray-900 font-semibold px-0.5 rounded">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    const date = new Date(typeof timestamp === 'number' ? timestamp * 1000 : timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Hace unos minutos';
    if (hours < 24) return `Hace ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Hace ${days}d`;
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const groupedResults = useMemo(() => {
    const groups = {
      contacts: results.filter(r => r.matchType === 'contact'),
      messages: results.filter(r => r.matchType === 'message')
    };
    return groups;
  }, [results]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in slide-in-from-top-4 duration-300">
        {/* Header con input de búsqueda */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar en todas las conversaciones y mensajes..."
                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 animate-spin" />
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/80 rounded-lg transition-colors"
              title="Cerrar (ESC)"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Ayuda de navegación */}
          <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-gray-600 font-mono">↑</kbd>
              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-gray-600 font-mono">↓</kbd>
              <span>Navegar</span>
            </div>
            <div className="flex items-center space-x-1">
              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-gray-600 font-mono">Enter</kbd>
              <span>Abrir</span>
            </div>
            <div className="flex items-center space-x-1">
              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-gray-600 font-mono">ESC</kbd>
              <span>Cerrar</span>
            </div>
          </div>
        </div>

        {/* Resultados */}
        <div className="max-h-[60vh] overflow-y-auto" ref={resultsRef}>
          {!query.trim() ? (
            <div className="p-12 text-center">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Búsqueda Global
              </h3>
              <p className="text-gray-500">
                Busca en todas las conversaciones, contactos y mensajes
              </p>
            </div>
          ) : results.length === 0 && !isSearching ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Sin resultados
              </h3>
              <p className="text-gray-500">
                No se encontraron coincidencias para "{query}"
              </p>
            </div>
          ) : (
            <div>
              {/* Resultados en contactos */}
              {groupedResults.contacts.length > 0 && (
                <div className="border-b border-gray-100">
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Contactos ({groupedResults.contacts.length})
                    </h4>
                  </div>
                  {groupedResults.contacts.map((result, idx) => {
                    const globalIndex = results.indexOf(result);
                    return (
                      <div
                        key={`contact-${result.conversationId}-${idx}`}
                        onClick={() => handleSelectResult(result)}
                        className={`p-4 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 ${
                          selectedIndex === globalIndex
                            ? 'bg-blue-50 border-l-4 border-l-blue-500'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h5 className="font-semibold text-gray-900">
                                {highlightMatch(result.contactName, query)}
                              </h5>
                              <span className="text-sm text-gray-500">
                                {highlightMatch(result.contactPhone, query)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 truncate">
                              {result.messageContent}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {formatTimestamp(result.messageTimestamp)}
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Resultados en mensajes */}
              {groupedResults.messages.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Mensajes ({groupedResults.messages.length})
                    </h4>
                  </div>
                  {groupedResults.messages.map((result, idx) => {
                    const globalIndex = results.indexOf(result);
                    return (
                      <div
                        key={`message-${result.conversationId}-${result.messageId}-${idx}`}
                        onClick={() => handleSelectResult(result)}
                        className={`p-4 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 ${
                          selectedIndex === globalIndex
                            ? 'bg-blue-50 border-l-4 border-l-blue-500'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h5 className="font-medium text-gray-700 text-sm">
                                {result.contactName}
                              </h5>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500">
                                {result.contactPhone}
                              </span>
                            </div>
                            <p className="text-sm text-gray-900 line-clamp-2">
                              {highlightMatch(
                                result.messageContent.substring(0, 150) + 
                                (result.messageContent.length > 150 ? '...' : ''),
                                query
                              )}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {formatTimestamp(result.messageTimestamp)}
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer con estadísticas */}
        {results.length > 0 && (
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <span>
              {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
            </span>
            <span>
              {groupedResults.contacts.length} contacto{groupedResults.contacts.length !== 1 ? 's' : ''} • {' '}
              {groupedResults.messages.length} mensaje{groupedResults.messages.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchGlobal;
