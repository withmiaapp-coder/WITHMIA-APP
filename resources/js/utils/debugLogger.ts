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
    // Los errores siempre se muestran
    console.error(...args);
  },
  info: (...args: any[]) => {
    if (DEBUG_ENABLED) console.info(...args);
  },
  // Función para logs de eventos importantes (siempre se muestran)
  event: (...args: any[]) => {
    console.log(...args);
  }
};

export default debugLog;
