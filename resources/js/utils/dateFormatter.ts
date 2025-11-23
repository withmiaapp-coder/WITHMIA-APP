// ============================================================================
// UTILIDAD: Formateo de fechas optimizado con memoización
// ============================================================================

const dateCache = new Map<string, string>();
const CACHE_MAX_SIZE = 1000;

export const formatTimestamp = (timestamp: string | number): string => {
  if (!timestamp) return 'Sin fecha';

  // Usar cache para evitar recalcular fechas repetidas
  const cacheKey = String(timestamp);
  if (dateCache.has(cacheKey)) {
    return dateCache.get(cacheKey)!;
  }

  let date: Date;

  if (typeof timestamp === 'number') {
    date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
  } else if (!isNaN(Number(timestamp))) {
    const numTimestamp = Number(timestamp);
    date = new Date(numTimestamp < 10000000000 ? numTimestamp * 1000 : numTimestamp);
  } else {
    date = new Date(timestamp);
  }

  if (isNaN(date.getTime())) {
    return 'Fecha inválida';
  }

  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const timeString = `${hours}:${minutes}`;

  let result: string;

  if (diffInHours < 24 && date.getDate() === now.getDate()) {
    result = timeString;
  } else if (diffInHours < 48 && date.getDate() === now.getDate() - 1) {
    result = `Ayer ${timeString}`;
  } else if (diffInHours < 168) {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    result = `${days[date.getDay()]} ${timeString}`;
  } else {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    result = `${day}/${month}/${year} ${timeString}`;
  }

  // Guardar en cache con límite
  if (dateCache.size >= CACHE_MAX_SIZE) {
    const firstKey = dateCache.keys().next().value;
    if (firstKey) {
      dateCache.delete(firstKey);
    }
  }
  dateCache.set(cacheKey, result);

  return result;
};

// Limpiar cache periódicamente (opcional)
export const clearDateCache = () => {
  dateCache.clear();
};
