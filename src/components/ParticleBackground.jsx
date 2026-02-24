import { useEffect, useRef } from 'react';

const PARTICLE_COUNT = 25;
const COLORS = [
  'rgba(59, 147, 247, 0.06)',
  'rgba(26, 191, 80, 0.04)',
  'rgba(99, 179, 255, 0.05)',
  'rgba(125, 211, 252, 0.05)',
];

export function ParticleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationId;
    let particles = [];

    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    function initParticles() {
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 100 + 40,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.12,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        });
      }
    }

    function draw() {
      if (!ctx || !canvas.width) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -p.radius) p.x = canvas.width + p.radius;
        if (p.x > canvas.width + p.radius) p.x = -p.radius;
        if (p.y < -p.radius) p.y = canvas.height + p.radius;
        if (p.y > canvas.height + p.radius) p.y = -p.radius;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });

      animationId = requestAnimationFrame(draw);
    }

    setSize();
    window.addEventListener('resize', setSize);
    draw();

    return () => {
      window.removeEventListener('resize', setSize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden
    />
  );
}
