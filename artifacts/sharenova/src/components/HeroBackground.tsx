import { useEffect, useRef } from "react";

type Node = {
  x: number;
  y: number;
  r: number;
  pulse: number;
  pulseSpeed: number;
  role: "sender" | "receiver";
};

type Packet = {
  fromIdx: number;
  toIdx: number;
  t: number;
  speed: number;
  size: number;
  hue: number;
};

type Glyph = {
  x: number;
  y: number;
  vy: number;
  rot: number;
  vrot: number;
  alpha: number;
  scale: number;
  char: string;
};

const GLYPHS = ["{ }", "</>", "<>", "404", "200", "PNG", "MP4", "PDF", "ZIP", "TXT", "ƒ()", "→"];

export function HeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    let nodes: Node[] = [];
    let packets: Packet[] = [];
    let glyphs: Glyph[] = [];
    let lastSpawn = 0;

    const isDark = () => document.documentElement.classList.contains("dark");

    const layout = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Build a sender at center-ish and receivers around the edges
      const cx = width * 0.5;
      const cy = height * 0.5;
      const ringRadius = Math.min(width, height) * 0.36;
      const receiverCount = 7;
      const senders: Node[] = [
        {
          x: cx,
          y: cy,
          r: 6,
          pulse: 0,
          pulseSpeed: 0.018,
          role: "sender",
        },
      ];
      const receivers: Node[] = Array.from({ length: receiverCount }, (_, i) => {
        const a = (i / receiverCount) * Math.PI * 2 + Math.PI / 2;
        return {
          x: cx + Math.cos(a) * ringRadius,
          y: cy + Math.sin(a) * ringRadius * 0.85,
          r: 4,
          pulse: Math.random(),
          pulseSpeed: 0.014 + Math.random() * 0.012,
          role: "receiver" as const,
        };
      });
      nodes = [...senders, ...receivers];

      // Reset glyphs to scatter
      glyphs = Array.from({ length: 14 }, () => spawnGlyph(true));
    };

    const spawnGlyph = (initial = false): Glyph => ({
      x: Math.random() * width,
      y: initial ? Math.random() * height : height + 20,
      vy: -(0.15 + Math.random() * 0.4),
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.01,
      alpha: 0.04 + Math.random() * 0.08,
      scale: 0.7 + Math.random() * 1.4,
      char: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
    });

    const spawnPacket = () => {
      // sender is index 0, pick random receiver
      const toIdx = 1 + Math.floor(Math.random() * (nodes.length - 1));
      packets.push({
        fromIdx: 0,
        toIdx,
        t: 0,
        speed: 0.0035 + Math.random() * 0.004,
        size: 2.2 + Math.random() * 1.8,
        hue: 22 + Math.random() * 14, // orange spread
      });
    };

    const draw = (now: number) => {
      const dark = isDark();
      ctx.clearRect(0, 0, width, height);

      // Subtle grid
      ctx.save();
      ctx.strokeStyle = dark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.04)";
      ctx.lineWidth = 1;
      const grid = 48;
      for (let x = 0; x < width; x += grid) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += grid) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
        ctx.stroke();
      }
      ctx.restore();

      // Floating glyphs (background-most)
      for (const g of glyphs) {
        g.y += g.vy;
        g.rot += g.vrot;
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.rotate(g.rot);
        ctx.scale(g.scale, g.scale);
        ctx.fillStyle = dark
          ? `rgba(249,115,22,${g.alpha * 1.4})`
          : `rgba(234,88,12,${g.alpha})`;
        ctx.font = "600 14px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(g.char, 0, 0);
        ctx.restore();
        if (g.y < -30) {
          Object.assign(g, spawnGlyph(false));
        }
      }

      // Connection lines (sender → receiver), pulse alpha based on receiver pulse
      const sender = nodes[0];
      for (let i = 1; i < nodes.length; i++) {
        const r = nodes[i];
        r.pulse += r.pulseSpeed;
        const a = 0.06 + (Math.sin(r.pulse) * 0.5 + 0.5) * 0.18;
        const grad = ctx.createLinearGradient(sender.x, sender.y, r.x, r.y);
        grad.addColorStop(0, `rgba(249,115,22,${a * 1.2})`);
        grad.addColorStop(1, `rgba(249,115,22,${a * 0.2})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sender.x, sender.y);
        ctx.lineTo(r.x, r.y);
        ctx.stroke();
      }

      // Spawn packets continuously
      if (now - lastSpawn > 280) {
        lastSpawn = now;
        spawnPacket();
      }

      // Animate packets along their lines
      const remaining: Packet[] = [];
      for (const p of packets) {
        p.t += p.speed;
        if (p.t >= 1) {
          // Burst at receiver
          const r = nodes[p.toIdx];
          ctx.save();
          ctx.fillStyle = `rgba(249,115,22,0.35)`;
          ctx.beginPath();
          ctx.arc(r.x, r.y, p.size * 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          continue;
        }
        const f = nodes[p.fromIdx];
        const t = nodes[p.toIdx];
        const x = f.x + (t.x - f.x) * p.t;
        const y = f.y + (t.y - f.y) * p.t;

        // Comet trail
        ctx.save();
        const trailLen = 22;
        const tx = f.x + (t.x - f.x) * Math.max(0, p.t - 0.04);
        const ty = f.y + (t.y - f.y) * Math.max(0, p.t - 0.04);
        const tg = ctx.createLinearGradient(tx, ty, x, y);
        tg.addColorStop(0, "rgba(249,115,22,0)");
        tg.addColorStop(1, `hsla(${p.hue}, 95%, 55%, 0.85)`);
        ctx.strokeStyle = tg;
        ctx.lineWidth = p.size;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(x, y);
        ctx.stroke();

        // Head glow
        const glow = ctx.createRadialGradient(x, y, 0, x, y, p.size * 4);
        glow.addColorStop(0, `hsla(${p.hue}, 95%, 60%, 0.9)`);
        glow.addColorStop(1, `hsla(${p.hue}, 95%, 60%, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, p.size * 4, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = `hsl(${p.hue}, 95%, 65%)`;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Use trailLen to silence unused-var lint
        void trailLen;

        remaining.push(p);
      }
      packets = remaining;

      // Receiver nodes
      for (let i = 1; i < nodes.length; i++) {
        const r = nodes[i];
        const ringT = (Math.sin(r.pulse) * 0.5 + 0.5);
        // Pulse ring
        ctx.save();
        ctx.strokeStyle = `rgba(249,115,22,${0.18 * (1 - ringT)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r + 4 + ringT * 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Core node
        const coreGlow = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.r * 4);
        coreGlow.addColorStop(0, "rgba(249,115,22,0.55)");
        coreGlow.addColorStop(1, "rgba(249,115,22,0)");
        ctx.fillStyle = coreGlow;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = dark ? "#fb923c" : "#ea580c";
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Sender (center) — bigger, with strong pulse
      sender.pulse += sender.pulseSpeed;
      const sT = (Math.sin(sender.pulse) * 0.5 + 0.5);
      ctx.save();
      const sGlow = ctx.createRadialGradient(
        sender.x,
        sender.y,
        0,
        sender.x,
        sender.y,
        sender.r * 10,
      );
      sGlow.addColorStop(0, `rgba(249,115,22,${0.45 + sT * 0.25})`);
      sGlow.addColorStop(1, "rgba(249,115,22,0)");
      ctx.fillStyle = sGlow;
      ctx.beginPath();
      ctx.arc(sender.x, sender.y, sender.r * 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(249,115,22,${0.35 * (1 - sT)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sender.x, sender.y, sender.r + 8 + sT * 22, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = dark ? "#fb923c" : "#ea580c";
      ctx.beginPath();
      ctx.arc(sender.x, sender.y, sender.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      rafRef.current = requestAnimationFrame(draw);
    };

    layout();
    rafRef.current = requestAnimationFrame(draw);

    const onResize = () => {
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      layout();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
