// Sistema de logs de debug controlable
const DEBUG_ENABLED = import.meta.env.VITE_DEBUG_LOGS === 'true';

export const debugLog = {
  // Solo loguea si DEBUG_ENABLED es true
  log: (...args: unknown[]) => {
    if (DEBUG_ENABLED) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (DEBUG_ENABLED) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    // Always log errors — even in production, errors should be visible for debugging
    console.error(...args);
  },
  info: (...args: unknown[]) => {
    if (DEBUG_ENABLED) console.info(...args);
  },
  // Función para logs de eventos importantes (solo en debug)
  event: (...args: unknown[]) => {
    if (DEBUG_ENABLED) console.log(...args);
  }
};

export default debugLog;
