import React from 'react';

interface Circle {
  id: number;
  size: number;
  x: number; // percentage
  y: number; // percentage
  duration: number; // animation duration in seconds
  delay: number; // animation delay in seconds
  opacity: number;
}

export const FloatingCircles: React.FC = () => {
  // Generate circles with opacity based on distance from center
  const circles: Circle[] = [
    // Near edges (higher opacity)
    { id: 1, size: 80, x: 10, y: 15, duration: 5, delay: 0, opacity: 0.25 },
    { id: 2, size: 60, x: 85, y: 10, duration: 6, delay: 2, opacity: 0.22 },
    { id: 3, size: 100, x: 15, y: 75, duration: 5.5, delay: 4, opacity: 0.27 },
    { id: 4, size: 70, x: 90, y: 70, duration: 6.5, delay: 1, opacity: 0.24 },

    // Mid-distance (medium opacity)
    { id: 5, size: 90, x: 30, y: 40, duration: 6, delay: 3, opacity: 0.18 },
    { id: 6, size: 65, x: 70, y: 35, duration: 5.5, delay: 5, opacity: 0.16 },
    { id: 7, size: 75, x: 25, y: 60, duration: 6.5, delay: 2, opacity: 0.18 },
    { id: 8, size: 55, x: 75, y: 55, duration: 5, delay: 4, opacity: 0.16 },

    // Near center (lower opacity)
    { id: 9, size: 50, x: 45, y: 45, duration: 7, delay: 1, opacity: 0.12 },
    { id: 10, size: 40, x: 55, y: 50, duration: 6.5, delay: 3, opacity: 0.12 },

    // Additional edge circles
    { id: 11, size: 45, x: 5, y: 50, duration: 5.5, delay: 6, opacity: 0.22 },
    { id: 12, size: 85, x: 95, y: 45, duration: 6, delay: 2, opacity: 0.24 },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <style>{`
        @keyframes float {
          0% {
            transform: translate(0, 0);
          }
          20% {
            transform: translate(40px, -45px);
          }
          40% {
            transform: translate(-25px, -35px);
          }
          60% {
            transform: translate(-45px, 25px);
          }
          80% {
            transform: translate(30px, 40px);
          }
          100% {
            transform: translate(0, 0);
          }
        }
      `}</style>
      {circles.map((circle) => (
        <div
          key={circle.id}
          style={{
            position: 'absolute',
            left: `${circle.x}%`,
            top: `${circle.y}%`,
            width: `${circle.size}px`,
            height: `${circle.size}px`,
            borderRadius: '50%',
            background: `
              radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.3) 20%, rgba(255, 255, 255, 0.1) 40%, transparent 70%),
              radial-gradient(circle at 70% 70%, rgba(255, 255, 255, 0.1), transparent 50%)
            `,
            border: '1.5px solid rgba(255, 255, 255, 0.4)',
            opacity: circle.opacity,
            animation: `float ${circle.duration}s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite`,
            animationDelay: `${circle.delay}s`,
            boxShadow: `
              inset -5px -5px 15px rgba(255, 255, 255, 0.2),
              inset 5px 5px 10px rgba(0, 0, 0, 0.1),
              0 5px 15px rgba(0, 0, 0, 0.1)
            `,
          }}
        />
      ))}
    </div>
  );
};
