/**
 * 🔄 API Utilities - Retry automático y manejo de errores
 * 
 * Utilidades para hacer las llamadas API más resilientes a fallos temporales
 */

export interface RetryOptions {
  retries?: number;
  delay?: number;
  backoff?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * fetchWithRetry - Ejecuta una función con retry automático
 * 
 * @example
 * const data = await fetchWithRetry(
 *   () => loadConversationMessages(id),
 *   { retries: 3, delay: 1000, backoff: true }
 * );
 */
export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = 3,
    delay = 1000,
    backoff = true,
    onRetry
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Si es el último intento, lanzar el error
      if (attempt === retries - 1) {
        throw lastError;
      }

      // Calcular delay (exponencial si backoff = true)
      const currentDelay = backoff 
        ? delay * Math.pow(2, attempt)
        : delay;

      console.warn(
        `⚠️ Intento ${attempt + 1}/${retries} falló. Reintentando en ${currentDelay}ms...`,
        lastError.message
      );

      // Callback opcional
      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      // Esperar antes del siguiente intento
      await sleep(currentDelay);
    }
  }

  throw lastError!;
}

/**
 * sleep - Promesa que se resuelve después de X milisegundos
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * isNetworkError - Detecta si un error es de red
 */
export function isNetworkError(error: any): boolean {
  return (
    error instanceof TypeError ||
    error.message?.includes('fetch') ||
    error.message?.includes('network') ||
    error.message?.includes('Network request failed')
  );
}

/**
 * isServerError - Detecta si un error es del servidor (5xx)
 */
export function isServerError(error: any): boolean {
  return (
    error.status >= 500 && error.status < 600
  );
}

/**
 * shouldRetry - Determina si un error debería reintentar
 */
export function shouldRetry(error: any): boolean {
  return isNetworkError(error) || isServerError(error);
}

/**
 * withRetry - Higher Order Function para envolver funciones con retry
 * 
 * @example
 * const loadMessagesWithRetry = withRetry(loadConversationMessages, {
 *   retries: 3,
 *   delay: 1000
 * });
 * 
 * await loadMessagesWithRetry(conversationId);
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return ((...args: any[]) => {
    return fetchWithRetry(() => fn(...args), options);
  }) as T;
}

/**
 * exponentialBackoff - Calcula el delay con backoff exponencial
 */
export function exponentialBackoff(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): number {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Agregar jitter (variación aleatoria) para evitar thundering herd
  const jitter = Math.random() * 0.3 * delay;
  return delay + jitter;
}

/**
 * TimeoutError - Error personalizado para timeouts
 */
export class TimeoutError extends Error {
  constructor(message: string = 'Request timeout') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * withTimeout - Ejecuta una promesa con timeout
 * 
 * @example
 * const data = await withTimeout(
 *   fetch('/api/data'),
 *   5000, // 5 segundos
 *   'La petición tardó demasiado'
 * );
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(errorMessage || `Timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * batchRequests - Agrupa múltiples requests para ejecutarlos en lotes
 * 
 * @example
 * const results = await batchRequests(
 *   conversationIds,
 *   (id) => loadConversationMessages(id),
 *   { batchSize: 5, delayBetweenBatches: 100 }
 * );
 */
export async function batchRequests<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  options: {
    batchSize?: number;
    delayBetweenBatches?: number;
  } = {}
): Promise<R[]> {
  const { batchSize = 5, delayBetweenBatches = 0 } = options;
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);

    // Delay entre batches (excepto en el último)
    if (i + batchSize < items.length && delayBetweenBatches > 0) {
      await sleep(delayBetweenBatches);
    }
  }

  return results;
}

export default {
  fetchWithRetry,
  withRetry,
  withTimeout,
  isNetworkError,
  isServerError,
  shouldRetry,
  exponentialBackoff,
  batchRequests,
  TimeoutError
};
