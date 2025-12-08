/**
 * SECURITY UTILITIES - WITHMIA Dashboard
 * Herramientas de seguridad para proteger la aplicación
 * 
 * NOTA: Instalar dependencias:
 * npm install crypto-js
 * npm install --save-dev @types/crypto-js
 */

// @ts-ignore - CryptoJS se instalará después
import CryptoJS from 'crypto-js';

// ====================================================================================
// 1. SECURE STORAGE - Encriptación de datos en localStorage/sessionStorage
// ====================================================================================

const STORAGE_SECRET_KEY = (typeof window !== 'undefined' && (window as any).ENV?.VITE_STORAGE_SECRET) || 'withmia-secure-2025';

export const secureStorage = {
  /**
   * Guarda datos de forma encriptada en sessionStorage
   */
  set: (key: string, value: any): void => {
    try {
      const stringValue = JSON.stringify(value);
      const encrypted = CryptoJS.AES.encrypt(stringValue, STORAGE_SECRET_KEY).toString();
      sessionStorage.setItem(key, encrypted);
    } catch (error) {
      console.error('Error al guardar en secureStorage:', error);
    }
  },

  /**
   * Obtiene y desencripta datos de sessionStorage
   */
  get: <T>(key: string): T | null => {
    try {
      const encrypted = sessionStorage.getItem(key);
      if (!encrypted) return null;

      const decrypted = CryptoJS.AES.decrypt(encrypted, STORAGE_SECRET_KEY);
      const stringValue = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!stringValue) return null;
      
      return JSON.parse(stringValue) as T;
    } catch (error) {
      console.error('Error al leer de secureStorage:', error);
      return null;
    }
  },

  /**
   * Elimina un item de sessionStorage
   */
  remove: (key: string): void => {
    sessionStorage.removeItem(key);
  },

  /**
   * Limpia todo el sessionStorage
   */
  clear: (): void => {
    sessionStorage.clear();
  }
};

// ====================================================================================
// 2. CSRF TOKEN MANAGEMENT - Manejo seguro de tokens CSRF
// ====================================================================================

export class CsrfTokenManager {
  private static instance: CsrfTokenManager;
  private token: string | null = null;
  private tokenExpiry: number = 0;

  private constructor() {
    this.initializeToken();
  }

  static getInstance(): CsrfTokenManager {
    if (!CsrfTokenManager.instance) {
      CsrfTokenManager.instance = new CsrfTokenManager();
    }
    return CsrfTokenManager.instance;
  }

  /**
   * Inicializa el token CSRF desde el DOM
   */
  private initializeToken(): void {
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    
    if (!csrfMeta) {
      console.error('❌ CRÍTICO: CSRF token no encontrado en el DOM');
      return;
    }

    const tokenValue = csrfMeta.getAttribute('content');
    
    if (!tokenValue || tokenValue.trim() === '') {
      console.error('❌ CRÍTICO: CSRF token está vacío');
      return;
    }

    this.token = tokenValue;
    // Token expira en 2 horas
    this.tokenExpiry = Date.now() + (2 * 60 * 60 * 1000);
  }

  /**
   * Obtiene el token CSRF actual
   */
  getToken(): string {
    if (!this.token) {
      throw new Error('CSRF token no disponible. La aplicación no puede proceder de forma segura.');
    }

    // Verificar si el token expiró
    if (Date.now() > this.tokenExpiry) {
      console.warn('⚠️ CSRF token expirado, recargando página...');
      window.location.reload();
      throw new Error('CSRF token expirado');
    }

    return this.token;
  }

  /**
   * Refresca el token CSRF
   */
  refreshToken(): void {
    this.initializeToken();
  }

  /**
   * Verifica si el token es válido
   */
  isValid(): boolean {
    return this.token !== null && Date.now() < this.tokenExpiry;
  }
}

// ====================================================================================
// 3. XSS PROTECTION - Sanitización de contenido de usuario
// ====================================================================================

/**
 * Escapa caracteres HTML para prevenir XSS
 */
export const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
};

/**
 * Sanitiza texto eliminando scripts y HTML peligroso
 */
export const sanitizeText = (text: string): string => {
  // Eliminar cualquier etiqueta script
  let sanitized = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Eliminar event handlers inline
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Eliminar javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Escapar HTML
  return escapeHtml(sanitized);
};

/**
 * Obtiene texto sanitizado listo para renderizar
 * Uso: <span>{getSafeText(userInput)}</span>
 */
export const getSafeText = (text: string): string => {
  return sanitizeText(text);
};

// ====================================================================================
// 4. INPUT VALIDATION - Validación de entradas
// ====================================================================================

export const validators = {
  /**
   * Valida un email
   */
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },

  /**
   * Valida un slug de compañía
   */
  isValidCompanySlug: (slug: string): boolean => {
    const slugRegex = /^[a-z0-9-]{3,50}$/;
    return slugRegex.test(slug);
  },

  /**
   * Valida un nombre (sin caracteres especiales peligrosos)
   */
  isValidName: (name: string): boolean => {
    // Permitir letras, espacios, acentos, guiones
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s-]{1,100}$/;
    return nameRegex.test(name);
  },

  /**
   * Valida un número positivo
   */
  isPositiveNumber: (value: any): boolean => {
    const num = Number(value);
    return !isNaN(num) && num >= 0 && isFinite(num);
  },

  /**
   * Valida que un string no contenga código malicioso
   */
  isSafeString: (text: string): boolean => {
    // Detectar patrones sospechosos
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /eval\(/i,
      /expression\(/i
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(text));
  }
};

// ====================================================================================
// 5. RATE LIMITING - Control de frecuencia de llamadas
// ====================================================================================

interface RateLimitConfig {
  maxCalls: number;      // Número máximo de llamadas
  timeWindow: number;    // Ventana de tiempo en milisegundos
  blockDuration: number; // Duración del bloqueo en milisegundos
}

class RateLimiter {
  private calls: Map<string, number[]> = new Map();
  private blocked: Map<string, number> = new Map();

  /**
   * Verifica si una operación está permitida bajo rate limiting
   */
  isAllowed(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();

    // Verificar si está bloqueado
    const blockUntil = this.blocked.get(key);
    if (blockUntil && now < blockUntil) {
      console.warn(`⚠️ Rate limit: ${key} bloqueado hasta ${new Date(blockUntil).toLocaleTimeString()}`);
      return false;
    }

    // Obtener historial de llamadas
    const callHistory = this.calls.get(key) || [];
    
    // Filtrar llamadas dentro de la ventana de tiempo
    const recentCalls = callHistory.filter(time => now - time < config.timeWindow);

    // Verificar si se excedió el límite
    if (recentCalls.length >= config.maxCalls) {
      // Bloquear temporalmente
      this.blocked.set(key, now + config.blockDuration);
      console.error(`❌ Rate limit excedido para ${key}. Bloqueado por ${config.blockDuration / 1000}s`);
      return false;
    }

    // Registrar nueva llamada
    recentCalls.push(now);
    this.calls.set(key, recentCalls);

    return true;
  }

  /**
   * Limpia el historial de una clave
   */
  reset(key: string): void {
    this.calls.delete(key);
    this.blocked.delete(key);
  }

  /**
   * Limpia todo el historial
   */
  resetAll(): void {
    this.calls.clear();
    this.blocked.clear();
  }
}

export const rateLimiter = new RateLimiter();

// ====================================================================================
// 6. SECURE API FETCH - Wrapper seguro para llamadas API
// ====================================================================================

export interface SecureApiOptions extends RequestInit {
  requireCsrf?: boolean;
  rateLimitKey?: string;
  rateLimitConfig?: RateLimitConfig;
  timeout?: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public type?: 'network' | 'auth' | 'server' | 'timeout' | 'rate-limit' | 'unknown'
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Fetch wrapper con seguridad integrada
 */
export const secureFetch = async (
  url: string,
  options: SecureApiOptions = {}
): Promise<Response> => {
  const {
    requireCsrf = true,
    rateLimitKey,
    rateLimitConfig,
    timeout = 5000,
    headers = {},
    ...fetchOptions
  } = options;

  // 1. Rate Limiting
  if (rateLimitKey && rateLimitConfig) {
    if (!rateLimiter.isAllowed(rateLimitKey, rateLimitConfig)) {
      throw new ApiError(
        'Demasiadas solicitudes. Por favor espera unos segundos.',
        429,
        'rate-limit'
      );
    }
  }

  // 2. CSRF Token
  const secureHeaders: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>)
  };

  if (requireCsrf && (fetchOptions.method === 'POST' || fetchOptions.method === 'PUT' || fetchOptions.method === 'DELETE')) {
    try {
      const csrfManager = CsrfTokenManager.getInstance();
      secureHeaders['X-CSRF-TOKEN'] = csrfManager.getToken();
    } catch (error) {
      throw new ApiError(
        'No se pudo obtener el token de seguridad. Por favor recarga la página.',
        401,
        'auth'
      );
    }
  }

  // 3. Timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // 4. Realizar petición
    const response = await fetch(url, {
      ...fetchOptions,
      headers: secureHeaders,
      signal: controller.signal,
      credentials: 'include' // Incluir cookies
    });

    clearTimeout(timeoutId);

    // 5. Manejar errores HTTP
    if (!response.ok) {
      let errorType: ApiError['type'] = 'unknown';
      let errorMessage = 'Error en la solicitud';

      switch (response.status) {
        case 401:
        case 403:
          errorType = 'auth';
          errorMessage = 'Sesión expirada. Por favor inicia sesión nuevamente.';
          break;
        case 429:
          errorType = 'rate-limit';
          errorMessage = 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.';
          break;
        case 500:
        case 502:
        case 503:
          errorType = 'server';
          errorMessage = 'Error del servidor. Intenta de nuevo más tarde.';
          break;
      }

      throw new ApiError(errorMessage, response.status, errorType);
    }

    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);

    // Manejar timeout
    if (error.name === 'AbortError') {
      throw new ApiError(
        'La solicitud tardó demasiado. Verifica tu conexión.',
        408,
        'timeout'
      );
    }

    // Manejar error de red
    if (!navigator.onLine) {
      throw new ApiError(
        'Sin conexión a internet. Verifica tu red.',
        0,
        'network'
      );
    }

    // Re-lanzar errores de API
    if (error instanceof ApiError) {
      throw error;
    }

    // Error desconocido
    throw new ApiError(
      'Error inesperado. Por favor intenta de nuevo.',
      0,
      'unknown'
    );
  }
};

// ====================================================================================
// 7. HOOKS DE REACT PARA SEGURIDAD (sin dependencias de React)
// ====================================================================================

// Nota: Los hooks requieren React. Si usas React, descomenta estas importaciones:
// import { useState, useEffect, useCallback } from 'react';

/**
 * Función helper para usar CSRF token (sin hooks)
 */
export const getCsrfToken = (): string => {
  const manager = CsrfTokenManager.getInstance();
  return manager.getToken();
};

/**
 * Función helper para verificar rate limit
 */
export const checkRateLimit = (
  key: string,
  config: RateLimitConfig = {
    maxCalls: 5,
    timeWindow: 60000,
    blockDuration: 30000
  }
): boolean => {
  return rateLimiter.isAllowed(key, config);
};

// ====================================================================================
// EXPORTACIONES
// ====================================================================================

export default {
  secureStorage,
  CsrfTokenManager,
  sanitizeText,
  escapeHtml,
  getSafeText,
  validators,
  rateLimiter,
  secureFetch,
  ApiError,
  getCsrfToken,
  checkRateLimit
};
