import { useEffect, useState } from 'react';

interface TransitionScreenProps {
  targetUrl: string;
  delay?: number;
}

export default function TransitionScreen({ targetUrl, delay = 1500 }: TransitionScreenProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = targetUrl;
    }, delay);

    return () => clearTimeout(timer);
  }, [targetUrl, delay]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
      <div className="flex flex-col items-center">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-32 h-32 object-contain"
        >
          <source src="/logo-animated.webm" type="video/webm" />
          <img src="/logo-withmia.webp?v=2025-withmia" alt="WITHMIA" className="w-32 h-32" />
        </video>
      </div>
    </div>
  );
}

// Función helper para mostrar la transición y redirigir
export function showTransitionAndRedirect(targetUrl: string, delay: number = 1500) {
  // Crear el contenedor si no existe
  let container = document.getElementById('transition-screen-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'transition-screen-container';
    document.body.appendChild(container);
  }

  // Crear el overlay con el video
  container.innerHTML = `
    <div style="
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: black;
    ">
      <video autoplay loop muted playsinline style="width: 128px; height: 128px; object-fit: contain;">
        <source src="/logo-animated.webm" type="video/webm" />
        <img src="/logo-withmia.webp?v=2025-withmia" alt="WITHMIA" style="width: 128px; height: 128px;" />
      </video>
    </div>
  `;

  // Redirigir después del delay
  setTimeout(() => {
    window.location.href = targetUrl;
  }, delay);
}
