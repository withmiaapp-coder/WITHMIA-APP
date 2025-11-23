// Tipos para las APIs de Chatwoot Enterprise

export interface ChatwootContact {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  status: 'online' | 'offline';
  created_at: string;
  updated_at: string;
}

export interface ChatwootMessage {
  id: number;
  content: string;
  message_type: 'incoming' | 'outgoing';
  content_type: 'text' | 'image' | 'file' | 'audio';
  timestamp: string;
  sender: {
    id: number;
    name: string;
    type: 'contact' | 'agent';
  };
  conversation_id: number;
  status?: 'sent' | 'delivered' | 'read';
}

export interface ChatwootConversation {
  id: number;
  contact: ChatwootContact;
  inbox_id: number;
  status: 'open' | 'resolved' | 'pending';
  assignee?: {
    id: number;
    name: string;
    email: string;
  };
  messages: ChatwootMessage[];
  labels: string[];
  priority: 'urgent' | 'high' | 'medium' | 'low';
  unread_count: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface ChatwootAgent {
  id: number;
  name: string;
  email: string;
  role: 'administrator' | 'agent';
  status: 'online' | 'offline' | 'busy';
  avatar?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatwootTeam {
  id: number;
  name: string;
  description?: string;
  members: ChatwootAgent[];
  created_at: string;
  updated_at: string;
}

export interface ChatwootLabel {
  id: number;
  title: string;
  description?: string;
  color: string;
  show_on_sidebar: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatwootInbox {
  id: number;
  name: string;
  channel_type: 'Channel::WebWidget' | 'Channel::Email' | 'Channel::WhatsApp' | 'Channel::FacebookPage';
  greeting_enabled: boolean;
  greeting_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatwootMacro {
  id: number;
  name: string;
  actions: Array<{
    action_name: string;
    action_params: Record<string, any>;
  }>;
  visibility: 'personal' | 'global';
  created_at: string;
  updated_at: string;
}

export interface ChatwootAutomationRule {
  id: number;
  name: string;
  description?: string;
  event_name: string;
  conditions: Array<{
    attribute_key: string;
    filter_operator: string;
    values: string[];
  }>;
  actions: Array<{
    action_name: string;
    action_params: Record<string, any>;
  }>;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatwootWebhook {
  id: number;
  account_id: number;
  inbox_id?: number;
  url: string;
  webhook_type: 'account' | 'inbox';
  subscriptions: string[];
  created_at: string;
  updated_at: string;
}

export interface EnterpriseDashboardStats {
  conversations: {
    total: number;
    open: number;
    resolved: number;
    pending: number;
  };
  agents: {
    total: number;
    online: number;
    busy: number;
    offline: number;
  };
  messages: {
    total: number;
    incoming: number;
    outgoing: number;
  };
  response_time: {
    average: number;
    first_response: number;
    resolution: number;
  };
  satisfaction: {
    rating: number;
    total_responses: number;
  };
}