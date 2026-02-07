// Sistema de logs de debug controlable
const DEBUG_ENABLED = import.meta.env.VITE_DEBUG_LOGS === 'true';

export const debugLog = {
  // Solo loguea si DEBUG_ENABLED es true
  log: (...args: any[]) => {
    if (DEBUG_ENABLED) console.log(...args);
  },
  warn: (...args: any[]) => {
    if (DEBUG_ENABLED) console.warn(...args);
  },
  error: (...args: any[]) => {
    // Errors only in debug mode to avoid leaking info in production
    if (DEBUG_ENABLED) console.error(...args);
  },
  info: (...args: any[]) => {
    if (DEBUG_ENABLED) console.info(...args);
  },
  // Función para logs de eventos importantes (solo en debug)
  event: (...args: any[]) => {
    if (DEBUG_ENABLED) console.log(...args);
  }
};

export default debugLog;
