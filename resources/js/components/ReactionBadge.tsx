import React from 'react';
import { groupReactionsByEmoji, MessageReaction } from '../utils/messageUtils';

interface ReactionBadgeProps {
  reactions: MessageReaction[];
  isOwnMessage?: boolean;
}

/**
 * Componente que muestra las reacciones de un mensaje como badges
 * Similar a cómo WhatsApp muestra las reacciones
 */
const ReactionBadge: React.FC<ReactionBadgeProps> = ({ reactions, isOwnMessage = false }) => {
  if (!reactions || reactions.length === 0) return null;

  const groupedReactions = groupReactionsByEmoji(reactions);

  return (
    <div 
      className={`flex items-center gap-1 mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
    >
      <div 
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600"
        style={{ fontSize: '0.75rem' }}
      >
        {groupedReactions.map(({ emoji, count, senders }, index) => (
          <span 
            key={`${emoji}-${index}`}
            className="flex items-center"
            title={senders.length > 0 ? senders.join(', ') : undefined}
          >
            <span className="text-base leading-none">{emoji}</span>
            {count > 1 && (
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-0.5">
                {count}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
};

export default ReactionBadge;
