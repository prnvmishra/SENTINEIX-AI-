import { useEffect, useRef } from "react";

type Vec3 = { x: number; y: number; z: number };

interface Node3 {
  pos: Vec3;
  base: Vec3;
  vx: number;
  vy: number;
  vz: number;
  pulse: number;
  kind: "hub" | "signal" | "relay";
}

interface Arc {
  a: number;
  b: number;
  life: number;
  max: number;
}

function project(p: Vec3, rotY: number, rotX: number, cx: number, cy: number, scale: number) {
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);

  let x = p.x * cosY - p.z * sinY;
  let z = p.x * sinY + p.z * cosY;
  let y = p.y * cosX - z * sinX;
  z = p.y * sinX + z * cosX;

  const perspective = 2.8 / (2.8 + z);
  return {
    x: cx + x * scale * perspective,
    y: cy + y * scale * perspective,
    z,
    s: perspective,
  };
}

function fibSphere(count: number, radius: number): Vec3[] {
  const pts: Vec3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    pts.push({
      x: Math.cos(theta) * r * radius,
      y: y * radius,
      z: Math.sin(theta) * r * radius,
    });
  }
  return pts;
}

/**
 * Full-bleed interactive hero canvas: rotating wireframe globe,
 * constellation network, mouse parallax, radar sweep — no WebGL libs.
 */
export function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 });
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduceMotionRef.current = mq.matches;
    const onMq = () => {
      reduceMotionRef.current = mq.matches;
    };
    mq.addEventListener("change", onMq);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let t = 0;
    let rotY = 0.35;
    let rotX = -0.22;

    const globeR = 1;
    const latLines = 7;
    const lonLines = 12;
    const surface = fibSphere(72, globeR * 0.98);

    const nodes: Node3[] = Array.from({ length: 48 }, (_, i) => {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.35 + Math.random() * 0.85;
      const base = {
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta) * 0.7,
        z: r * Math.cos(phi),
      };
      return {
        pos: { ...base },
        base,
        vx: (Math.random() - 0.5) * 0.002,
        vy: (Math.random() - 0.5) * 0.002,
        vz: (Math.random() - 0.5) * 0.002,
        pulse: Math.random() * Math.PI * 2,
        kind: i % 9 === 0 ? "hub" : i % 4 === 0 ? "relay" : "signal",
      };
    });

    const arcs: Arc[] = [];
    let arcTimer = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function onMove(e: PointerEvent) {
      mouseRef.current.tx = e.clientX / w;
      mouseRef.current.ty = e.clientY / h;
    }

    function onLeave() {
      mouseRef.current.tx = 0.5;
      mouseRef.current.ty = 0.42;
    }

    const bursts: { x: number; y: number; life: number }[] = [];

    function onClick(e: PointerEvent) {
      bursts.push({ x: e.clientX, y: e.clientY, life: 0 });
      // Force a few fresh arcs toward the click neighborhood
      for (let k = 0; k < 3; k++) {
        const a = Math.floor(Math.random() * nodes.length);
        let b = Math.floor(Math.random() * nodes.length);
        if (b === a) b = (b + 1) % nodes.length;
        arcs.push({ a, b, life: 0, max: 50 + Math.random() * 40 });
      }
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onClick);

    function drawGlobe(cx: number, cy: number, scale: number, ry: number, rx: number) {
      // Meridians
      for (let i = 0; i < lonLines; i++) {
        const lon = (i / lonLines) * Math.PI * 2;
        ctx!.beginPath();
        let started = false;
        for (let j = 0; j <= 48; j++) {
          const lat = (j / 48) * Math.PI - Math.PI / 2;
          const p = {
            x: Math.cos(lat) * Math.cos(lon) * globeR,
            y: Math.sin(lat) * globeR,
            z: Math.cos(lat) * Math.sin(lon) * globeR,
          };
          const q = project(p, ry, rx, cx, cy, scale);
          if (q.z > 0.15) continue;
          if (!started) {
            ctx!.moveTo(q.x, q.y);
            started = true;
          } else {
            ctx!.lineTo(q.x, q.y);
          }
        }
        ctx!.strokeStyle = "rgba(45, 212, 191, 0.11)";
        ctx!.lineWidth = 1;
        ctx!.stroke();
      }

      // Latitudes
      for (let i = 1; i < latLines; i++) {
        const lat = (i / latLines) * Math.PI - Math.PI / 2;
        const r = Math.cos(lat) * globeR;
        const y = Math.sin(lat) * globeR;
        ctx!.beginPath();
        let started = false;
        for (let j = 0; j <= 64; j++) {
          const lon = (j / 64) * Math.PI * 2;
          const p = { x: r * Math.cos(lon), y, z: r * Math.sin(lon) };
          const q = project(p, ry, rx, cx, cy, scale);
          if (q.z > 0.2) {
            started = false;
            continue;
          }
          if (!started) {
            ctx!.moveTo(q.x, q.y);
            started = true;
          } else {
            ctx!.lineTo(q.x, q.y);
          }
        }
        ctx!.strokeStyle = "rgba(45, 212, 191, 0.09)";
        ctx!.lineWidth = 1;
        ctx!.stroke();
      }

      // Surface dots
      for (const p of surface) {
        const q = project(p, ry, rx, cx, cy, scale);
        if (q.z > 0.05) continue;
        const alpha = 0.15 + (1 - (q.z + 1) / 2) * 0.35;
        ctx!.fillStyle = `rgba(94, 234, 212, ${alpha})`;
        ctx!.beginPath();
        ctx!.arc(q.x, q.y, 1.1 * q.s, 0, Math.PI * 2);
        ctx!.fill();
      }

      // Atmosphere rim
      const rim = project({ x: 0, y: 0, z: 0 }, ry, rx, cx, cy, scale);
      const grad = ctx!.createRadialGradient(rim.x, rim.y, scale * 0.55, rim.x, rim.y, scale * 1.15);
      grad.addColorStop(0, "rgba(45, 212, 191, 0)");
      grad.addColorStop(0.72, "rgba(45, 212, 191, 0.03)");
      grad.addColorStop(0.92, "rgba(56, 189, 248, 0.08)");
      grad.addColorStop(1, "rgba(7, 11, 20, 0)");
      ctx!.fillStyle = grad;
      ctx!.beginPath();
      ctx!.arc(rim.x, rim.y, scale * 1.15, 0, Math.PI * 2);
      ctx!.fill();

      // Outer ring
      ctx!.beginPath();
      ctx!.arc(rim.x, rim.y, scale * 1.02, 0, Math.PI * 2);
      ctx!.strokeStyle = "rgba(45, 212, 191, 0.22)";
      ctx!.lineWidth = 1.25;
      ctx!.stroke();

      // Inner dashed orbit
      ctx!.save();
      ctx!.setLineDash([3, 7]);
      ctx!.beginPath();
      ctx!.arc(rim.x, rim.y, scale * 1.18, 0, Math.PI * 2);
      ctx!.strokeStyle = "rgba(148, 163, 184, 0.18)";
      ctx!.lineWidth = 1;
      ctx!.stroke();
      ctx!.restore();
    }

    function drawRadarSweep(cx: number, cy: number, scale: number, angle: number) {
      const sweep = Math.PI * 0.55;
      const grad = ctx!.createConicGradient(angle - sweep, cx, cy);
      grad.addColorStop(0, "rgba(45, 212, 191, 0)");
      grad.addColorStop(0.55, "rgba(45, 212, 191, 0)");
      grad.addColorStop(0.85, "rgba(45, 212, 191, 0.07)");
      grad.addColorStop(1, "rgba(94, 234, 212, 0.16)");
      ctx!.fillStyle = grad;
      ctx!.beginPath();
      ctx!.moveTo(cx, cy);
      ctx!.arc(cx, cy, scale * 1.45, angle - sweep, angle);
      ctx!.closePath();
      ctx!.fill();

      ctx!.beginPath();
      ctx!.moveTo(cx, cy);
      ctx!.lineTo(cx + Math.cos(angle) * scale * 1.45, cy + Math.sin(angle) * scale * 1.45);
      ctx!.strokeStyle = "rgba(94, 234, 212, 0.45)";
      ctx!.lineWidth = 1.5;
      ctx!.stroke();
    }

    function frame() {
      const m = mouseRef.current;
      m.x += (m.tx - m.x) * 0.06;
      m.y += (m.ty - m.y) * 0.06;

      const reduced = reduceMotionRef.current;
      t += reduced ? 0.004 : 0.016;

      const cx = w * 0.58 + (m.x - 0.5) * 36;
      const cy = h * 0.46 + (m.y - 0.5) * 28;
      const scale = Math.min(w, h) * (w < 768 ? 0.28 : 0.34);

      if (!reduced) {
        rotY += 0.0022 + (m.x - 0.5) * 0.004;
        rotX = -0.22 + (m.y - 0.5) * 0.35;
      }

      ctx!.clearRect(0, 0, w, h);

      // Soft vignette field
      const bg = ctx!.createRadialGradient(cx, cy, 20, cx, cy, Math.max(w, h) * 0.7);
      bg.addColorStop(0, "rgba(13, 28, 42, 0.55)");
      bg.addColorStop(0.45, "rgba(7, 11, 20, 0.15)");
      bg.addColorStop(1, "rgba(7, 11, 20, 0)");
      ctx!.fillStyle = bg;
      ctx!.fillRect(0, 0, w, h);

      // Starfield depth
      for (let i = 0; i < 60; i++) {
        const sx = ((i * 97) % w) + Math.sin(t * 0.2 + i) * 2;
        const sy = ((i * 53) % h) + Math.cos(t * 0.15 + i) * 2;
        const a = 0.08 + (i % 5) * 0.04;
        ctx!.fillStyle = `rgba(241, 245, 249, ${a})`;
        ctx!.fillRect(sx, sy, 1.2, 1.2);
      }

      drawRadarSweep(cx, cy, scale, t * 0.9);
      drawGlobe(cx, cy, scale, rotY, rotX);

      // Update free nodes
      for (const n of nodes) {
        n.pos.x = n.base.x + Math.sin(t * 0.7 + n.pulse) * 0.06 + n.vx * 40;
        n.pos.y = n.base.y + Math.cos(t * 0.55 + n.pulse) * 0.05;
        n.pos.z = n.base.z + Math.sin(t * 0.4 + n.pulse * 1.3) * 0.06;
        n.base.x += n.vx;
        n.base.y += n.vy;
        n.base.z += n.vz;
        // soft bounds
        const dist = Math.hypot(n.base.x, n.base.y, n.base.z);
        if (dist < 1.2 || dist > 2.4) {
          n.vx *= -1;
          n.vy *= -1;
          n.vz *= -1;
        }
      }

      // Spawn connection arcs
      arcTimer -= 1;
      if (arcTimer <= 0 && arcs.length < 14) {
        const a = Math.floor(Math.random() * nodes.length);
        let b = Math.floor(Math.random() * nodes.length);
        if (b === a) b = (b + 1) % nodes.length;
        arcs.push({ a, b, life: 0, max: 70 + Math.random() * 50 });
        arcTimer = 18 + Math.random() * 28;
      }

      // Draw arcs
      for (let i = arcs.length - 1; i >= 0; i--) {
        const arc = arcs[i]!;
        arc.life += 1;
        if (arc.life > arc.max) {
          arcs.splice(i, 1);
          continue;
        }
        const na = nodes[arc.a]!;
        const nb = nodes[arc.b]!;
        const pa = project(na.pos, rotY, rotX, cx, cy, scale);
        const pb = project(nb.pos, rotY, rotX, cx, cy, scale);
        const fade = Math.sin((arc.life / arc.max) * Math.PI);
        ctx!.beginPath();
        ctx!.moveTo(pa.x, pa.y);
        const mx = (pa.x + pb.x) / 2 + Math.sin(t + arc.a) * 18;
        const my = (pa.y + pb.y) / 2 - 24;
        ctx!.quadraticCurveTo(mx, my, pb.x, pb.y);
        ctx!.strokeStyle = `rgba(45, 212, 191, ${0.12 + fade * 0.35})`;
        ctx!.lineWidth = 1 + fade;
        ctx!.stroke();

        // traveling packet
        const u = (arc.life / arc.max) % 1;
        const px = (1 - u) * (1 - u) * pa.x + 2 * (1 - u) * u * mx + u * u * pb.x;
        const py = (1 - u) * (1 - u) * pa.y + 2 * (1 - u) * u * my + u * u * pb.y;
        ctx!.fillStyle = `rgba(94, 234, 212, ${0.4 + fade * 0.5})`;
        ctx!.beginPath();
        ctx!.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx!.fill();
      }

      // Nearby node links (constellation)
      const projected = nodes.map((n) => ({ n, p: project(n.pos, rotY, rotX, cx, cy, scale) }));
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const a = projected[i]!;
          const b = projected[j]!;
          const dx = a.p.x - b.p.x;
          const dy = a.p.y - b.p.y;
          const d = Math.hypot(dx, dy);
          if (d < 110) {
            const alpha = (1 - d / 110) * 0.18;
            ctx!.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
            ctx!.lineWidth = 0.8;
            ctx!.beginPath();
            ctx!.moveTo(a.p.x, a.p.y);
            ctx!.lineTo(b.p.x, b.p.y);
            ctx!.stroke();
          }
        }
      }

      // Mouse proximity highlight
      const mx = m.x * w;
      const my = m.y * h;

      for (const { n, p } of projected) {
        const distMouse = Math.hypot(p.x - mx, p.y - my);
        const hot = Math.max(0, 1 - distMouse / 160);
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + n.pulse);
        const r =
          (n.kind === "hub" ? 3.6 : n.kind === "relay" ? 2.6 : 1.8) * p.s * (1 + hot * 0.8 + pulse * 0.15);

        if (n.kind === "hub" || hot > 0.15) {
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, r * 3.2, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(45, 212, 191, ${0.04 + hot * 0.12})`;
          ctx!.fill();
        }

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, r, 0, Math.PI * 2);
        if (n.kind === "hub") {
          ctx!.fillStyle = `rgba(251, 191, 36, ${0.55 + hot * 0.35})`;
        } else if (n.kind === "relay") {
          ctx!.fillStyle = `rgba(56, 189, 248, ${0.5 + hot * 0.35})`;
        } else {
          ctx!.fillStyle = `rgba(45, 212, 191, ${0.45 + hot * 0.4})`;
        }
        ctx!.fill();
      }

      // Signal ping rings on globe surface
      const pingIdx = Math.floor(t * 0.4) % surface.length;
      const ping = project(surface[pingIdx]!, rotY, rotX, cx, cy, scale);
      if (ping.z < 0.1) {
        const pingPhase = (t * 0.4) % 1;
        ctx!.beginPath();
        ctx!.arc(ping.x, ping.y, 4 + pingPhase * 28, 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(244, 63, 94, ${0.35 * (1 - pingPhase)})`;
        ctx!.lineWidth = 1.5;
        ctx!.stroke();
      }

      // Click ripples
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i]!;
        b.life += 1;
        const phase = b.life / 42;
        if (phase >= 1) {
          bursts.splice(i, 1);
          continue;
        }
        ctx!.beginPath();
        ctx!.arc(b.x, b.y, 12 + phase * 90, 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(45, 212, 191, ${(1 - phase) * 0.45})`;
        ctx!.lineWidth = 2;
        ctx!.stroke();
        ctx!.beginPath();
        ctx!.arc(b.x, b.y, 4 + phase * 36, 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(56, 189, 248, ${(1 - phase) * 0.3})`;
        ctx!.lineWidth = 1;
        ctx!.stroke();
      }

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onClick);
      mq.removeEventListener("change", onMq);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />;
}
