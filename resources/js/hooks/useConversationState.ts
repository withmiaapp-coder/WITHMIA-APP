import { useReducer, Dispatch } from 'react';

// ============================================================================
// TYPES - Tipos del estado y acciones
// ============================================================================

export interface ConversationState {
  // UI State
  ui: {
    searchTerm: string;
    selectedFilter: 'all' | 'mine' | 'assigned';
    leftPanelWidth: number;
    isResizing: boolean;
    isRightPanelVisible: boolean;
    isSettingsOpen: boolean;
    isTyping: boolean;
    realtimeEnabled: boolean;
  };
  
  // Data State
  data: {
    activeConversation: any | null;
    conversations: any[];
    userInboxId: number | null;
    currentPage: number;
    totalConversations: number;
    hasMorePages: boolean;
  };
  
  // Form State
  form: {
    newMessage: string;
    replyingTo: any | null;
    attachments: File[];
  };
  
  // Modals State
  modals: {
    editContact: boolean;
    editingContact: any | null;
    editName: string;
    editEmail: string;
  };
  
  // Loading States
  loading: {
    conversations: boolean;
    messages: boolean;
    sending: boolean;
  };
  
  // Error States
  errors: {
    conversations: string | null;
    messages: string | null;
    sending: string | null;
  };
}

// Action Types
export type ConversationAction =
  // UI Actions
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'SET_SELECTED_FILTER'; payload: 'all' | 'mine' | 'assigned' }
  | { type: 'SET_LEFT_PANEL_WIDTH'; payload: number }
  | { type: 'SET_IS_RESIZING'; payload: boolean }
  | { type: 'TOGGLE_RIGHT_PANEL' }
  | { type: 'TOGGLE_SETTINGS' }
  | { type: 'SET_IS_TYPING'; payload: boolean }
  | { type: 'SET_REALTIME_ENABLED'; payload: boolean }
  
  // Data Actions
  | { type: 'SET_CONVERSATIONS'; payload: any[] }
  | { type: 'SET_ACTIVE_CONVERSATION'; payload: any | null }
  | { type: 'SET_USER_INBOX_ID'; payload: number | null }
  | { type: 'SET_PAGINATION'; payload: { currentPage: number; totalConversations: number; hasMorePages: boolean } }
  | { type: 'UPDATE_CONVERSATION'; payload: { id: number; updates: Partial<any> } }
  
  // Form Actions
  | { type: 'SET_NEW_MESSAGE'; payload: string }
  | { type: 'SET_REPLYING_TO'; payload: any | null }
  | { type: 'ADD_ATTACHMENT'; payload: File }
  | { type: 'REMOVE_ATTACHMENT'; payload: number }
  | { type: 'CLEAR_FORM' }
  
  // Modal Actions
  | { type: 'OPEN_EDIT_CONTACT'; payload: any }
  | { type: 'CLOSE_EDIT_CONTACT' }
  | { type: 'SET_EDIT_NAME'; payload: string }
  | { type: 'SET_EDIT_EMAIL'; payload: string }
  
  // Loading Actions
  | { type: 'SET_LOADING'; payload: { key: keyof ConversationState['loading']; value: boolean } }
  
  // Error Actions
  | { type: 'SET_ERROR'; payload: { key: keyof ConversationState['errors']; value: string | null } }
  | { type: 'CLEAR_ALL_ERRORS' };

// ============================================================================
// INITIAL STATE
// ============================================================================

export const initialState: ConversationState = {
  ui: {
    searchTerm: '',
    selectedFilter: 'all',
    leftPanelWidth: typeof window !== 'undefined' 
      ? parseFloat(localStorage.getItem('conversationsPanelWidth') || '33')
      : 33,
    isResizing: false,
    isRightPanelVisible: false,
    isSettingsOpen: false,
    isTyping: false,
    realtimeEnabled: true,
  },
  
  data: {
    activeConversation: null,
    conversations: [],
    userInboxId: null,
    currentPage: 1,
    totalConversations: 0,
    hasMorePages: true,
  },
  
  form: {
    newMessage: '',
    replyingTo: null,
    attachments: [],
  },
  
  modals: {
    editContact: false,
    editingContact: null,
    editName: '',
    editEmail: '',
  },
  
  loading: {
    conversations: false,
    messages: false,
    sending: false,
  },
  
  errors: {
    conversations: null,
    messages: null,
    sending: null,
  },
};

// ============================================================================
// REDUCER - Lógica de actualización del estado
// ============================================================================

export function conversationReducer(
  state: ConversationState,
  action: ConversationAction
): ConversationState {
  switch (action.type) {
    // ========== UI Actions ==========
    case 'SET_SEARCH_TERM':
      return {
        ...state,
        ui: { ...state.ui, searchTerm: action.payload }
      };
    
    case 'SET_SELECTED_FILTER':
      return {
        ...state,
        ui: { ...state.ui, selectedFilter: action.payload }
      };
    
    case 'SET_LEFT_PANEL_WIDTH':
      // Guardar en localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('conversationsPanelWidth', action.payload.toString());
      }
      return {
        ...state,
        ui: { ...state.ui, leftPanelWidth: action.payload }
      };
    
    case 'SET_IS_RESIZING':
      return {
        ...state,
        ui: { ...state.ui, isResizing: action.payload }
      };
    
    case 'TOGGLE_RIGHT_PANEL':
      return {
        ...state,
        ui: { ...state.ui, isRightPanelVisible: !state.ui.isRightPanelVisible }
      };
    
    case 'TOGGLE_SETTINGS':
      return {
        ...state,
        ui: { ...state.ui, isSettingsOpen: !state.ui.isSettingsOpen }
      };
    
    case 'SET_IS_TYPING':
      return {
        ...state,
        ui: { ...state.ui, isTyping: action.payload }
      };
    
    case 'SET_REALTIME_ENABLED':
      return {
        ...state,
        ui: { ...state.ui, realtimeEnabled: action.payload }
      };
    
    // ========== Data Actions ==========
    case 'SET_CONVERSATIONS':
      return {
        ...state,
        data: { ...state.data, conversations: action.payload }
      };
    
    case 'SET_ACTIVE_CONVERSATION':
      return {
        ...state,
        data: { ...state.data, activeConversation: action.payload }
      };
    
    case 'SET_USER_INBOX_ID':
      return {
        ...state,
        data: { ...state.data, userInboxId: action.payload }
      };
    
    case 'SET_PAGINATION':
      return {
        ...state,
        data: {
          ...state.data,
          currentPage: action.payload.currentPage,
          totalConversations: action.payload.totalConversations,
          hasMorePages: action.payload.hasMorePages
        }
      };
    
    case 'UPDATE_CONVERSATION':
      return {
        ...state,
        data: {
          ...state.data,
          conversations: state.data.conversations.map(conv =>
            conv.id === action.payload.id
              ? { ...conv, ...action.payload.updates }
              : conv
          )
        }
      };
    
    // ========== Form Actions ==========
    case 'SET_NEW_MESSAGE':
      return {
        ...state,
        form: { ...state.form, newMessage: action.payload }
      };
    
    case 'SET_REPLYING_TO':
      return {
        ...state,
        form: { ...state.form, replyingTo: action.payload }
      };
    
    case 'ADD_ATTACHMENT':
      return {
        ...state,
        form: {
          ...state.form,
          attachments: [...state.form.attachments, action.payload]
        }
      };
    
    case 'REMOVE_ATTACHMENT':
      return {
        ...state,
        form: {
          ...state.form,
          attachments: state.form.attachments.filter((_, i) => i !== action.payload)
        }
      };
    
    case 'CLEAR_FORM':
      return {
        ...state,
        form: {
          newMessage: '',
          replyingTo: null,
          attachments: []
        }
      };
    
    // ========== Modal Actions ==========
    case 'OPEN_EDIT_CONTACT':
      return {
        ...state,
        modals: {
          editContact: true,
          editingContact: action.payload,
          editName: action.payload?.contact?.name || '',
          editEmail: action.payload?.contact?.email || ''
        }
      };
    
    case 'CLOSE_EDIT_CONTACT':
      return {
        ...state,
        modals: {
          editContact: false,
          editingContact: null,
          editName: '',
          editEmail: ''
        }
      };
    
    case 'SET_EDIT_NAME':
      return {
        ...state,
        modals: { ...state.modals, editName: action.payload }
      };
    
    case 'SET_EDIT_EMAIL':
      return {
        ...state,
        modals: { ...state.modals, editEmail: action.payload }
      };
    
    // ========== Loading Actions ==========
    case 'SET_LOADING':
      return {
        ...state,
        loading: { ...state.loading, [action.payload.key]: action.payload.value }
      };
    
    // ========== Error Actions ==========
    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.payload.key]: action.payload.value }
      };
    
    case 'CLEAR_ALL_ERRORS':
      return {
        ...state,
        errors: {
          conversations: null,
          messages: null,
          sending: null
        }
      };
    
    default:
      return state;
  }
}

// ============================================================================
// CUSTOM HOOK - useConversationState
// ============================================================================

/**
 * useConversationState - Hook personalizado que encapsula el reducer
 * 
 * @returns [state, dispatch, actions] - Estado, dispatcher y acciones helper
 * 
 * @example
 * const [state, dispatch, actions] = useConversationState();
 * 
 * // Usar actions helpers (recomendado)
 * actions.setSearchTerm('Juan');
 * 
 * // O dispatch directo
 * dispatch({ type: 'SET_SEARCH_TERM', payload: 'Juan' });
 */
export function useConversationState() {
  const [state, dispatch] = useReducer(conversationReducer, initialState);
  
  // Action creators - Helper functions para dispatch más fácil
  const actions = {
    // UI
    setSearchTerm: (term: string) => dispatch({ type: 'SET_SEARCH_TERM', payload: term }),
    setSelectedFilter: (filter: 'all' | 'mine' | 'assigned') => 
      dispatch({ type: 'SET_SELECTED_FILTER', payload: filter }),
    setLeftPanelWidth: (width: number) => 
      dispatch({ type: 'SET_LEFT_PANEL_WIDTH', payload: width }),
    setIsResizing: (isResizing: boolean) => 
      dispatch({ type: 'SET_IS_RESIZING', payload: isResizing }),
    toggleRightPanel: () => dispatch({ type: 'TOGGLE_RIGHT_PANEL' }),
    toggleSettings: () => dispatch({ type: 'TOGGLE_SETTINGS' }),
    setIsTyping: (isTyping: boolean) => 
      dispatch({ type: 'SET_IS_TYPING', payload: isTyping }),
    setRealtimeEnabled: (enabled: boolean) => 
      dispatch({ type: 'SET_REALTIME_ENABLED', payload: enabled }),
    
    // Data
    setConversations: (conversations: any[]) => 
      dispatch({ type: 'SET_CONVERSATIONS', payload: conversations }),
    setActiveConversation: (conversation: any | null) => 
      dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conversation }),
    setUserInboxId: (id: number | null) => 
      dispatch({ type: 'SET_USER_INBOX_ID', payload: id }),
    setPagination: (pagination: { currentPage: number; totalConversations: number; hasMorePages: boolean }) => 
      dispatch({ type: 'SET_PAGINATION', payload: pagination }),
    updateConversation: (id: number, updates: Partial<any>) => 
      dispatch({ type: 'UPDATE_CONVERSATION', payload: { id, updates } }),
    
    // Form
    setNewMessage: (message: string) => 
      dispatch({ type: 'SET_NEW_MESSAGE', payload: message }),
    setReplyingTo: (message: any | null) => 
      dispatch({ type: 'SET_REPLYING_TO', payload: message }),
    addAttachment: (file: File) => 
      dispatch({ type: 'ADD_ATTACHMENT', payload: file }),
    removeAttachment: (index: number) => 
      dispatch({ type: 'REMOVE_ATTACHMENT', payload: index }),
    clearForm: () => dispatch({ type: 'CLEAR_FORM' }),
    
    // Modals
    openEditContact: (contact: any) => 
      dispatch({ type: 'OPEN_EDIT_CONTACT', payload: contact }),
    closeEditContact: () => dispatch({ type: 'CLOSE_EDIT_CONTACT' }),
    setEditName: (name: string) => 
      dispatch({ type: 'SET_EDIT_NAME', payload: name }),
    setEditEmail: (email: string) => 
      dispatch({ type: 'SET_EDIT_EMAIL', payload: email }),
    
    // Loading
    setLoading: (key: keyof ConversationState['loading'], value: boolean) => 
      dispatch({ type: 'SET_LOADING', payload: { key, value } }),
    
    // Errors
    setError: (key: keyof ConversationState['errors'], value: string | null) => 
      dispatch({ type: 'SET_ERROR', payload: { key, value } }),
    clearAllErrors: () => dispatch({ type: 'CLEAR_ALL_ERRORS' }),
  };
  
  return [state, dispatch, actions] as const;
}

export default useConversationState;
