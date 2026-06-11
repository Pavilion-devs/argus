"use client";

import { useEffect, useRef } from "react";

/**
 * Lightweight particle field rendered on a <canvas>. Particles drift slowly and
 * connect with faint lines when close, echoing the constellation-of-evidence
 * feel of the "Alert → Plan" card it overlays. Resizes to its parent and respects DPR.
 */
export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    type P = { x: number; y: number; vx: number; vy: number };
    let particles: P[] = [];

    const seed = (() => {
      let s = 0x2f6e2b1;
      return () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
      };
    })();

    const build = () => {
      const parent = canvas.parentElement;
      width = parent?.clientWidth ?? canvas.clientWidth;
      height = parent?.clientHeight ?? canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(18, Math.floor((width * height) / 9000));
      particles = Array.from({ length: count }, () => ({
        x: seed() * width,
        y: seed() * height,
        vx: (seed() - 0.5) * 0.3,
        vy: (seed() - 0.5) * 0.3,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
      }
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 70) {
            ctx.strokeStyle = `rgba(96, 165, 250, ${0.35 * (1 - dist / 70)})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (const p of particles) {
        ctx.fillStyle = "rgba(219, 234, 254, 0.9)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    build();
    draw();

    const ro = new ResizeObserver(() => build());
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full absolute inset-0 z-20 pointer-events-none opacity-60 transition-opacity duration-700 group-hover:opacity-100"
    />
  );
}
