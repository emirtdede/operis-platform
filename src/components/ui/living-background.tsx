"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
}

export function LivingBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Respect reduced motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize, { passive: true });

    // Particle constellation configuration
    const particleCount = Math.min(Math.floor((width * height) / 28000), 45);
    const particles: Particle[] = [];
    const mouse = { x: -1000, y: -1000, active: false };

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * (prefersReducedMotion ? 0 : 0.45),
        vy: (Math.random() - 0.5) * (prefersReducedMotion ? 0 : 0.45),
        radius: Math.random() * 1.5 + 1,
        baseAlpha: Math.random() * 0.4 + 0.2,
      });
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave, { passive: true });

    // Render loop
    const render = () => {
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // Detect theme for particle colors
      const isDark =
        document.documentElement.getAttribute("data-theme") !== "light";
      const particleColor = isDark
        ? "rgba(56, 189, 248,"
        : "rgba(37, 99, 235,";
      const lineColor = isDark
        ? "rgba(129, 140, 248,"
        : "rgba(59, 130, 246,";

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!p) continue;

        if (!prefersReducedMotion) {
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0) p.x = width;
          else if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          else if (p.y > height) p.y = 0;

          // Mouse gentle repulsion/reaction
          if (mouse.active) {
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 120 && dist > 0) {
              const force = (120 - dist) / 120;
              p.x -= (dx / dist) * force * 1.2;
              p.y -= (dy / dist) * force * 1.2;
            }
          }
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${particleColor} ${p.baseAlpha})`;
        ctx.fill();

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          if (!p2) continue;
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 130) {
            const lineAlpha = (1 - dist / 130) * 0.18;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `${lineColor} ${lineAlpha})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      {/* Layer 1: Ambient Aurora Mesh Glows */}
      <div className="absolute -top-[25%] left-[10%] h-[550px] w-[550px] rounded-full bg-gradient-to-br from-[var(--aurora-1)] to-[var(--aurora-2)] blur-[120px] animate-aurora-1" />
      <div className="absolute top-[35%] -right-[10%] h-[600px] w-[600px] rounded-full bg-gradient-to-tl from-[var(--aurora-2)] to-[var(--aurora-3)] blur-[140px] animate-aurora-2" />
      <div className="absolute -bottom-[20%] left-[30%] h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-[var(--aurora-3)] to-[var(--aurora-1)] blur-[130px] opacity-70" />

      {/* Layer 2: Subtle Micro-Grid Pattern */}
      <div className="absolute inset-0 bg-grid-mesh opacity-80 [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_85%)]" />

      {/* Layer 3: Interactive Constellation Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full opacity-60 dark:opacity-80"
      />
    </div>
  );
}
