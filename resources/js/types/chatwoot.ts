// =============================================================================
// Tipos para las APIs de Chatwoot Enterprise (API contract shapes)
// =============================================================================

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
    action_params: Record<string, unknown>;
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
    action_params: Record<string, unknown>;
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

// =============================================================================
// App-level types (shapes as used in hooks/components, post-transformation)
// =============================================================================

/** Attachment on a message (both incoming API and local) */
export interface MessageAttachment {
  id?: number;
  file_type?: string | number;
  content_type?: string;
  data_url?: string;
  file_name?: string;
  file_size?: number;
  /** Base64 data (used when sending) */
  data?: string;
  /** Filename (used when sending) */
  filename?: string;
}

/** Contact shape as stored in local conversation objects */
export interface ConversationContact {
  id: number;
  name: string;
  email: string;
  phone_number: string | null;
  avatar: string;
  avatarUrl: string | null;
  status: string;
  identifier?: string;
}

/** Assignee on a conversation */
export interface ConversationAssignee {
  id: number;
  name: string;
  email: string;
  avatar_url?: string;
  availability_status?: string;
}

/** Last message summary on a conversation */
export interface ConversationLastMessage {
  content: string;
  timestamp: string | number | undefined;
  sender: 'contact' | 'agent' | string;
  attachments: MessageAttachment[];
}

/** Meta sender info from Chatwoot API */
export interface ChatwootSenderMeta {
  id?: number;
  name?: string;
  email?: string;
  phone_number?: string;
  identifier?: string;
  thumbnail?: string;
  avatar_url?: string;
  availability_status?: string;
}

/** Meta block from Chatwoot API */
export interface ChatwootConversationMeta {
  sender?: ChatwootSenderMeta;
  channel?: string;
  [key: string]: unknown;
}

export type ConversationStatus = 'open' | 'resolved' | 'pending' | 'snoozed';
export type ConversationPriority = 'urgent' | 'high' | 'medium' | 'low' | null;

/** Conversation as stored/used locally in hooks & components */
export interface Conversation {
  id: number;
  contact: ConversationContact;
  last_message: ConversationLastMessage;
  status: ConversationStatus | string;
  priority: ConversationPriority | string;
  labels: string[];
  unread_count: number;
  messages_count?: number;
  inbox_id: number;
  account_id: number;
  assignee_id: number | null;
  assignee: ConversationAssignee | null;
  updated_at: string | number;
  created_at?: string;
  meta?: ChatwootConversationMeta;
  timestamp?: number;
  last_activity_at?: string | number;
  /** Loaded messages (present when conversation is active) */
  messages?: Message[];
  /** Internal: indicates messages are loading */
  _isLoading?: boolean;
  /** Internal: indicates more messages available for pagination */
  _hasMoreMessages?: boolean;
  [key: string]: unknown;
}

/** Message as stored/used locally in hooks & components */
export interface Message {
  id: number | string;
  content: string | null;
  timestamp: string | number;
  created_at: string;
  sender: 'contact' | 'agent' | string;
  message_type: 'incoming' | 'outgoing' | string;
  status: string;
  attachments?: MessageAttachment[];
  sender_name?: string;
  source_id?: string | null;
  isOptimistic?: boolean;
  _isOptimistic?: boolean;
  private?: boolean;
  conversation_id?: number;
  content_type?: string;
  [key: string]: unknown;
}

/** Raw conversation payload from Chatwoot API (before transformation) */
export interface RawChatwootConversation {
  id: number;
  contact_id?: number;
  meta?: ChatwootConversationMeta;
  status: ConversationStatus;
  priority?: string | null;
  labels?: string[];
  unread_count?: number;
  messages_count?: number;
  inbox_id: number;
  account_id: number;
  assignee?: ConversationAssignee | null;
  last_activity_at?: string | number;
  updated_at?: string;
  created_at?: string;
  last_non_activity_message?: RawChatwootMessage;
  messages?: RawChatwootMessage[];
  last_message?: RawChatwootMessage;
  timestamp?: number;
}

/** Raw message payload from Chatwoot API (before transformation) */
export interface RawChatwootMessage {
  id: number;
  content: string | null;
  message_type: number | string; // 0=incoming, 1=outgoing, 2=activity
  created_at: string;
  status?: string;
  attachments?: MessageAttachment[];
  sender?: { id?: number; name?: string; type?: string };
  source_id?: string | null;
  content_type?: string;
}

/** Messages cache entry shape */
export interface MessagesCacheEntry {
  messages: Message[];
  timestamp: number;
  hasMore: boolean;
}

/** Agent as used locally (from list endpoint) */
export interface Agent {
  id: number;
  name: string;
  email: string;
  role?: string;
  avatar_url?: string;
  availability_status?: string;
  confirmed?: boolean;
}

/** Label as used locally (from list endpoint) */
export interface Label {
  id: number;
  title: string;
  description?: string;
  color?: string;
  show_on_sidebar?: boolean;
}

/** Label creation payload */
export interface LabelCreateData {
  title: string;
  description?: string;
  color?: string;
  show_on_sidebar?: boolean;
}

/** Agent creation payload */
export interface AgentCreateData {
  name: string;
  email: string;
  role?: string;
}

/** Status change body */
export interface StatusChangeBody {
  status: ConversationStatus;
  snoozed_until?: number;
}

/** API response wrapper */
export interface ChatwootApiResponse<T = unknown> {
  data?: T;
  payload?: T;
  meta?: {
    total?: number;
    count?: number;
    current_page?: number;
    total_pages?: number;
    total_count?: number;
    has_more?: boolean;
  };
  success?: boolean;
  message?: string;
}

/** Cache shape for teams/agents with dedup support */
export interface DataCache<T> {
  data: T[] | null;
  timestamp: number;
  promise: Promise<T[]> | null;
}

/** Labels global cache shape */
export interface LabelsCache {
  data: Label[];
  timestamp: number;
}