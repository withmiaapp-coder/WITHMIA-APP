/**
 * Utility functions for conversation display formatting.
 * Extracted from ConversationsInterface.tsx.
 */

/**
 * Format the last message preview for the conversation sidebar.
 * Cleans markdown, detects media types, truncates long URLs.
 */
export const formatLastMessagePreview = (message: string | null | undefined, attachments?: any[]): string => {
  // If no content but has attachments, show file type
  if ((!message || message.trim() === '') && attachments && attachments.length > 0) {
    const attachment = attachments[0];
    const fileType = attachment.file_type || attachment.content_type || '';
    const fileName = attachment.data_url?.split('/').pop() || attachment.file_name || 'archivo';
    
    if (fileType.startsWith('image/')) return '📷 Imagen';
    if (fileType.startsWith('video/')) return '🎥 Video';
    if (fileType.startsWith('audio/')) return '🎵 Audio';
    if (fileType.includes('pdf')) return '📄 PDF';
    if (fileType.includes('document') || fileType.includes('word')) return '📄 Documento';
    if (fileType.includes('sheet') || fileType.includes('excel')) return '📊 Hoja de cálculo';
    
    return `📎 ${fileName}`;
  }
  
  if (!message) return "";
  
  let cleanMessage = message;
  
  // Remove quotes/replies (> text)
  cleanMessage = cleanMessage.replace(/^>\s*[^:]+:\s*/gm, "");
  
  // Remove markdown bold (**text** or __text__)
  cleanMessage = cleanMessage.replace(/\*\*([^*]+)\*\*/g, "$1");
  cleanMessage = cleanMessage.replace(/__([^_]+)__/g, "$1");
  
  // Remove markdown italic (*text* or _text_)
  cleanMessage = cleanMessage.replace(/\*([^*]+)\*/g, "$1");
  cleanMessage = cleanMessage.replace(/_([^_]+)_/g, "$1");
  
  // Remove multiple line breaks
  cleanMessage = cleanMessage.replace(/\n+/g, " ").trim();
  
  // Image URL detection
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp)$/i;
  if (imageExtensions.test(cleanMessage) || 
      cleanMessage.includes("active_storage") || 
      cleanMessage.includes("chatwoot-admin")) {
    return "📷 Imagen";
  }
  
  // Long generic URL
  if (cleanMessage.startsWith("http") && cleanMessage.length > 50) {
    return "🔗 Enlace";
  }
  
  // Multimedia files
  if (/\.(mp3|wav|ogg|oga|opus|m4a|aac|amr|3gp)$/i.test(cleanMessage)) return "🎵 Audio";
  if (/\.(mp4|mov|avi|webm|mkv)$/i.test(cleanMessage)) return "🎥 Video";
  if (/\.(pdf|doc|docx|xls|xlsx)$/i.test(cleanMessage)) return "📄 Documento";
  
  return cleanMessage;
};

/**
 * Format avatar display — extract initials from name if avatar is a URL.
 */
export const formatAvatar = (avatar: string | null | undefined, name: string | null | undefined): string => {
  if (avatar && (avatar.startsWith('http') || avatar.includes('/'))) {
    return name?.charAt(0).toUpperCase() || 'U';
  }
  return avatar || name?.charAt(0).toUpperCase() || 'U';
};

/**
 * Get proxied avatar URL for Chatwoot Railway avatars.
 */
export const getAvatarProxyUrl = (avatarUrl: string | null | undefined, contactName?: string): string | null => {
  if (!avatarUrl) return null;
  if (avatarUrl.includes('chatwoot') && avatarUrl.includes('railway.app')) {
    const nameParam = contactName ? `&name=${encodeURIComponent(contactName)}` : '';
    return `/img-proxy?url=${encodeURIComponent(avatarUrl)}${nameParam}`;
  }
  return avatarUrl;
};
