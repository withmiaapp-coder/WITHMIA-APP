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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{
      background: 'radial-gradient(76vw 76vw at 12% 18%, rgba(230,184,255,.1) 0%, rgba(230,184,255,.05) 50%, rgba(230,184,255,0) 70%), radial-gradient(40vw 40vw at 8% 65%, rgba(125,77,255,.35) 0%, rgba(125,77,255,0) 55%), radial-gradient(40vw 40vw at 85% 82%, rgba(59,195,255,.3) 0%, rgba(59,195,255,0) 55%), radial-gradient(35vw 35vw at 85% 8%, rgba(230,184,255,.18) 0%, rgba(230,184,255,0) 55%), radial-gradient(28vw 28vw at 72% 15%, rgba(244,226,166,.44) 0%, rgba(244,226,166,0) 60%), radial-gradient(22vw 22vw at 28% 88%, rgba(217,178,76,.28) 0%, rgba(217,178,76,0) 60%)'
    }}>
      <div className="flex flex-col items-center">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-40 h-40 object-contain"
        >
          <source src="/logo-animated.webm" type="video/webm" />
          <img src="/logo-withmia.webp?v=2025-withmia" alt="WITHMIA" className="w-40 h-40" />
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

  // Crear el overlay con el video y el fondo del login
  container.innerHTML = `
    <div style="
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(76vw 76vw at 12% 18%, rgba(230,184,255,.1) 0%, rgba(230,184,255,.05) 50%, rgba(230,184,255,0) 70%), radial-gradient(40vw 40vw at 8% 65%, rgba(125,77,255,.35) 0%, rgba(125,77,255,0) 55%), radial-gradient(40vw 40vw at 85% 82%, rgba(59,195,255,.3) 0%, rgba(59,195,255,0) 55%), radial-gradient(35vw 35vw at 85% 8%, rgba(230,184,255,.18) 0%, rgba(230,184,255,0) 55%), radial-gradient(28vw 28vw at 72% 15%, rgba(244,226,166,.44) 0%, rgba(244,226,166,0) 60%), radial-gradient(22vw 22vw at 28% 88%, rgba(217,178,76,.28) 0%, rgba(217,178,76,0) 60%);
    ">
      <video autoplay loop muted playsinline style="width: 160px; height: 160px; object-fit: contain;">
        <source src="/logo-animated.webm" type="video/webm" />
        <img src="/logo-withmia.webp?v=2025-withmia" alt="WITHMIA" style="width: 160px; height: 160px;" />
      </video>
    </div>
  `;

  // Redirigir después del delay
  setTimeout(() => {
    window.location.href = targetUrl;
  }, delay);
}
