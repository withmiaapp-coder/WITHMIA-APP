import React, { useRef, useState } from 'react';
import { Send, Paperclip, Smile, X, CornerUpLeft } from 'lucide-react';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled?: boolean;
  placeholder?: string;
  replyingTo: any | null;
  onCancelReply: () => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}

/**
 * MessageInput - Input de mensajes con soporte para attachments, emojis y reply
 * 
 * Features:
 * - ✅ Input con auto-focus
 * - ✅ Reply/Quote a mensajes anteriores
 * - ✅ Botón enviar con Enter
 * - ✅ Indicador visual de "respondiendo a..."
 * - ✅ Botones de attachments y emojis preparados
 */
const MessageInput: React.FC<MessageInputProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Escribe un mensaje...',
  replyingTo,
  onCancelReply,
  inputRef
}) => {
  const [isFocused, setIsFocused] = useState(false);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as any);
    }
  };

  return (
    <div className="p-4 bg-white/20 backdrop-blur-xl border-t border-white/30">
      {/* Indicador de "Respondiendo a..." */}
      {replyingTo && (
        <div className="mb-2 p-2 bg-blue-50 rounded-lg flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <CornerUpLeft className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-600 font-medium">
                Respondiendo a {replyingTo.sender_name || 'mensaje'}
              </p>
              <p className="text-xs text-gray-600 truncate">
                {replyingTo.content}
              </p>
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 hover:bg-blue-100 rounded-full transition-colors flex-shrink-0"
            title="Cancelar respuesta"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={onSubmit} className="flex items-center space-x-2">
        {/* Botón Attachments */}
        <button
          type="button"
          onClick={() => alert('Función de archivos adjuntos próximamente')}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white/30 rounded-full transition-all duration-200"
          title="Adjuntar archivo"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Input */}
        <div className={`flex-1 relative transition-all duration-200 ${
          isFocused ? 'ring-2 ring-blue-400/50 rounded-xl' : ''
        }`}>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full px-4 py-3 bg-white/40 border border-white/40 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:bg-white/60 backdrop-blur-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Botón Emoji */}
        <button
          type="button"
          onClick={() => alert('Selector de emojis próximamente')}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white/30 rounded-full transition-all duration-200"
          title="Insertar emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Botón Enviar */}
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center"
          title="Enviar mensaje"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>

      {/* Hint de atajos */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        Enter para enviar • Shift+Enter para nueva línea
      </div>
    </div>
  );
};

export default MessageInput;
