import { ReactNode, useEffect, useRef, useState } from 'react';

interface LazyLoadSectionProps {
  children: ReactNode;
  className?: string;
}

export const LazyLoadSection = ({ children, className = '' }: LazyLoadSectionProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '100px', // Empieza a cargar cuando esté a 100px de la vista
        threshold: 0
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className={className}>
      {isVisible ? children : <div className="min-h-[300px]" />}
    </section>
  );
};