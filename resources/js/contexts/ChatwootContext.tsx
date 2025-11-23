import React, { createContext, useContext } from 'react';
import { useConversations } from '../hooks/useChatwoot';

const ChatwootContext = createContext<ReturnType<typeof useConversations> | null>(null);

export const ChatwootProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const chatwootData = useConversations();
  
  return (
    <ChatwootContext.Provider value={chatwootData}>
      {children}
    </ChatwootContext.Provider>
  );
};

export const useChatwootContext = () => {
  const context = useContext(ChatwootContext);
  if (!context) {
    throw new Error('useChatwootContext must be used within ChatwootProvider');
  }
  return context;
};
