import crypto from 'crypto';

/**
 * Normaliza y extrae el contenido textual de estructuras complejas de mensajes.
 */
export const normalizeMessageContent = (content) => {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map(item => {
        if (typeof item === 'object' && item !== null) {
          const textValue = item.text;
          if (typeof textValue === 'string') return textValue;
          if (typeof textValue === 'object' && typeof textValue?.value === 'string') return textValue.value;
        }
        return '';
      })
      .filter(Boolean)
      .join(' ')
      .trim();
  }
  if (typeof content === 'object' && content !== null) {
    const textValue = content.text;
    if (typeof textValue === 'string') return textValue.trim();
    if (typeof textValue === 'object' && typeof textValue?.value === 'string') return textValue.value.trim();
  }
  return String(content || '').trim();
};

/**
 * Genera un Hash SHA-256 de un texto normalizado para indexación y caché.
 */
export const buildTextKey = (text) => {
  if (typeof text !== 'string' || !text.trim()) return null;
  const cleanText = text.split(/\s+/).join(' ');
  return crypto.createHash('sha256').update(cleanText, 'utf-8').digest('hex');
};

export const getLatestUserMessage = (messages) => {
  if (!Array.isArray(messages)) return '';
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === 'user') {
      const content = normalizeMessageContent(messages[i].content);
      if (content) return content;
    }
  }
  return '';
};

export const pickFirstValue = (source, keys) => {
  if (typeof source !== 'object' || source === null) return null;
  for (const key of keys) {
    if (key in source) return source[key];
  }
  return null;
};