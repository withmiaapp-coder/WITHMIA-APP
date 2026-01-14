/**
 * Utilidades para manejo de mensajes de chat
 */

/**
 * Detecta si un mensaje es solo una reacción (emoji único)
 * Las reacciones de WhatsApp llegan como mensajes separados con solo un emoji
 * 
 * @param content - Contenido del mensaje
 * @returns true si el mensaje es solo un emoji (reacción)
 */
export const isReactionMessage = (content: string | null | undefined): boolean => {
  if (!content) return false;
  const trimmed = content.trim();
  
  // Regex para detectar si es solo uno o dos emojis (reacciones típicas)
  // Cubre emojis Unicode incluyendo modificadores de skin tone
  const emojiOnlyRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)(?:\p{Emoji_Modifier})?(?:\u200D(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)(?:\p{Emoji_Modifier})?)*$/u;
  
  // Solo filtrar si es un emoji único o dos (reacciones típicas como 🙏, 👍, ❤️, 😂)
  const isOnlyEmoji = emojiOnlyRegex.test(trimmed);
  const isShort = trimmed.length <= 8; // Los emojis pueden ocupar varios caracteres Unicode
  
  return isOnlyEmoji && isShort;
};
