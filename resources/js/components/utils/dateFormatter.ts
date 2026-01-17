// ============================================================================
// UTILIDAD: Formateo de fechas optimizado con memoización
// Zona horaria: America/Santiago (Chile)
// ============================================================================

const dateCache = new Map<string, string>();
const CACHE_MAX_SIZE = 1000;

// Zona horaria de Chile
const TIMEZONE = 'America/Santiago';

/**
 * Obtener la hora en zona horaria de Chile
 */
const getChileTime = (date: Date): { hours: string; minutes: string; day: number; month: number; year: number; dayOfWeek: number } => {
  // Usar Intl.DateTimeFormat para obtener la hora en Chile
  const formatter = new Intl.DateTimeFormat('es-CL', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    weekday: 'short',
    hour12: false
  });
  
  const parts = formatter.formatToParts(date);
  const getValue = (type: string) => parts.find(p => p.type === type)?.value || '';
  
  return {
    hours: getValue('hour').padStart(2, '0'),
    minutes: getValue('minute').padStart(2, '0'),
    day: parseInt(getValue('day'), 10),
    month: parseInt(getValue('month'), 10),
    year: parseInt(getValue('year'), 10),
    dayOfWeek: date.getDay() // Esto usa UTC pero lo ajustamos abajo
  };
};

/**
 * Obtener el día de la semana en Chile
 */
const getChileDayOfWeek = (date: Date): number => {
  const chileDate = new Date(date.toLocaleString('en-US', { timeZone: TIMEZONE }));
  return chileDate.getDay();
};

/**
 * Verificar si dos fechas son el mismo día en Chile
 */
const isSameDayInChile = (date1: Date, date2: Date): boolean => {
  const chile1 = getChileTime(date1);
  const chile2 = getChileTime(date2);
  return chile1.day === chile2.day && chile1.month === chile2.month && chile1.year === chile2.year;
};

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

  // Obtener hora en zona horaria de Chile
  const chileTime = getChileTime(date);
  const timeString = `${chileTime.hours}:${chileTime.minutes}`;

  let result: string;

  // Verificar si es hoy en Chile
  if (isSameDayInChile(date, now)) {
    result = timeString;
  } else if (diffInHours < 48) {
    // Verificar si es ayer
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (isSameDayInChile(date, yesterday)) {
      result = `Ayer ${timeString}`;
    } else {
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      result = `${days[getChileDayOfWeek(date)]} ${timeString}`;
    }
  } else if (diffInHours < 168) {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    result = `${days[getChileDayOfWeek(date)]} ${timeString}`;
  } else {
    const day = chileTime.day.toString().padStart(2, '0');
    const month = chileTime.month.toString().padStart(2, '0');
    result = `${day}/${month}/${chileTime.year} ${timeString}`;
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
