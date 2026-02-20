/**
 * Daily Inspirational Quotes — Dynamic System
 * 
 * Fetches quotes from the backend API (OpenAI-powered).
 * The API generates quotes about notable people born/died on today's date.
 * Each API call returns a different person, so every page load is unique.
 * 
 * Uses sessionStorage to keep the same quote during a browser session,
 * and refreshes on new sessions/tabs.
 */

export interface DailyQuote {
  quote: string;
  author: string;
  context: string;
  who?: string;
}

const STORAGE_KEY = 'withmia_daily_quote';
const STORAGE_DATE_KEY = 'withmia_daily_quote_date';

/** Fallback quotes in case the API is unavailable */
const FALLBACKS: DailyQuote[] = [
  {
    quote: 'La verdadera sabiduría está en reconocer la propia ignorancia.',
    author: 'Sócrates',
    context: 'Reflexión atemporal',
    who: 'Filósofo griego (470-399 a.C.). Padre de la filosofía occidental. Su método de preguntas (mayéutica) sentó las bases del pensamiento crítico.',
  },
  {
    quote: 'La imaginación es más importante que el conocimiento.',
    author: 'Albert Einstein',
    context: 'Reflexión atemporal',
    who: 'Físico teórico alemán (1879-1955). Premio Nobel de Física 1921. Desarrolló la teoría de la relatividad, transformando nuestra comprensión del universo.',
  },
  {
    quote: 'Pienso, luego existo.',
    author: 'René Descartes',
    context: 'Reflexión atemporal',
    who: 'Filósofo, matemático y científico francés (1596-1650). Padre de la filosofía moderna y la geometría analítica.',
  },
  {
    quote: 'La educación es el arma más poderosa para cambiar el mundo.',
    author: 'Nelson Mandela',
    context: 'Reflexión atemporal',
    who: 'Líder sudafricano (1918-2013). Luchó contra el apartheid, 27 años preso, primer presidente negro de Sudáfrica. Nobel de la Paz 1993.',
  },
  {
    quote: 'El que no arriesga no gana.',
    author: 'Simón Bolívar',
    context: 'Reflexión atemporal',
    who: 'Líder militar y político venezolano (1783-1830). Libertador de cinco naciones sudamericanas.',
  },
];

/**
 * Get the daily quote for today.
 * For backward compatibility, this synchronous version returns a cached quote
 * or a random fallback. Use fetchDailyQuote() for the async API-powered version.
 */
export function getDailyQuote(_date?: Date): DailyQuote {
  // Try to get the cached quote from sessionStorage
  try {
    const today = new Date().toISOString().slice(0, 10);
    const storedDate = sessionStorage.getItem(STORAGE_DATE_KEY);
    const stored = sessionStorage.getItem(STORAGE_KEY);

    if (storedDate === today && stored) {
      return JSON.parse(stored);
    }
  } catch {
    // sessionStorage not available (SSR, etc.)
  }

  // Return a fallback while the async fetch completes
  return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
}

/**
 * Fetch a fresh daily quote from the API.
 * Each call to the API returns a different notable person born/died today.
 * Caches in sessionStorage so within the same session you see the same quote.
 * Opening a new tab = new person.
 */
export async function fetchDailyQuote(): Promise<DailyQuote> {
  const today = new Date().toISOString().slice(0, 10);

  // Check sessionStorage first — same tab keeps same quote
  try {
    const storedDate = sessionStorage.getItem(STORAGE_DATE_KEY);
    const stored = sessionStorage.getItem(STORAGE_KEY);

    if (storedDate === today && stored) {
      return JSON.parse(stored);
    }
  } catch {
    // sessionStorage not available
  }

  // Fetch from API
  try {
    const res = await fetch('/api/daily-quote', {
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'same-origin',
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data: DailyQuote = await res.json();

    // Validate
    if (data.quote && data.author) {
      // Cache in sessionStorage
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        sessionStorage.setItem(STORAGE_DATE_KEY, today);
      } catch {
        // Ignore storage errors
      }
      return data;
    }
  } catch (err) {
    console.warn('Daily quote API unavailable, using fallback', err);
  }

  // Fallback
  const fallback = FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
  return fallback;
}

export default FALLBACKS;
