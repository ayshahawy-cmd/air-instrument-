import type { AirString } from './geometry';

// A lightweight Canvas layer gives every synthesized voice a different motion.
// All coordinates here are screen pixels; the interaction layer keeps normalized points.
export function drawVoiceVisual(ctx: CanvasRenderingContext2D, string: AirString, now: number, width: number, height: number) {
  const ax = string.a.x * width;
  const ay = string.a.y * height;
  const bx = string.b.x * width;
  const by = string.b.y * height;
  const length = Math.hypot(bx - ax, by - ay);
  if (length < 2) return;
  const pulse = string.pulse;
  const phase = now * 0.002;
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(Math.atan2(by - ay, bx - ax));
  ctx.lineCap = 'round';

  if (string.voice === 'clean') {
    for (let j = -3; j <= 3; j++) {
      ctx.beginPath();
      for (let i = 0; i <= 32; i++) {
        const x = length * i / 32;
        const y = j * 2.5 + Math.sin(i * 0.6 - phase * 5 + j) * (1.3 + pulse * 5) * Math.sin(Math.PI * i / 32);
        if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `hsla(${string.hue + j * 5},95%,78%,${0.11 + pulse * 0.09})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  } else if (string.voice === 'rock') {
    const bars = Math.max(8, Math.floor(length / 16));
    for (let i = 1; i < bars; i++) {
      const x = length * i / bars;
      const envelope = Math.sin(Math.PI * i / bars);
      const h = (5 + pulse * 21 + 2 * Math.sin(i * 1.7 + phase * 9)) * envelope;
      ctx.fillStyle = `hsla(${string.hue + i % 3 * 25},100%,72%,${0.18 + pulse * 0.25})`;
      ctx.fillRect(x, -h, 2.5, h * 2);
    }
  } else if (string.voice === 'bass') {
    for (let j = -1; j <= 1; j++) {
      ctx.beginPath();
      for (let i = 0; i <= 28; i++) {
        const x = length * i / 28;
        const y = j * 4 + Math.sin(i * 0.37 - phase * 4) * (3 + pulse * 10) * Math.sin(Math.PI * i / 28);
        if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `hsla(${string.hue + j * 12},100%,66%,${0.19 + pulse * 0.15})`;
      ctx.lineWidth = 3 + pulse * 3;
      ctx.shadowBlur = 18;
      ctx.shadowColor = `hsl(${string.hue},100%,68%)`;
      ctx.stroke();
    }
  } else if (string.voice === 'sitar') {
    const x = length * 0.5;
    ctx.translate(x, 0);
    ctx.rotate(phase * 0.18);
    for (let i = 0; i < 16; i++) {
      const angle = Math.PI * 2 * i / 16;
      const radius = 11 + pulse * 23;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 5, Math.sin(angle) * 5);
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      ctx.strokeStyle = `hsla(${string.hue + i * 9},100%,78%,${0.12 + pulse * 0.26})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  } else if (string.voice === 'harp') {
    for (let j = -3; j <= 3; j++) {
      ctx.beginPath();
      ctx.moveTo(0, j * 1.5);
      ctx.bezierCurveTo(length * 0.26, j * (5 + pulse * 4), length * 0.7, -j * (5 + pulse * 4), length, j * 1.5);
      ctx.strokeStyle = `hsla(${string.hue + j * 11},100%,80%,${0.1 + pulse * 0.11})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  } else if (string.voice === 'glass') {
    for (const [offset, hue] of [[-3, 190], [-1, 245], [2, 32], [4, 300]] as const) {
      ctx.beginPath();
      ctx.moveTo(0, offset);
      ctx.lineTo(length, -offset);
      ctx.strokeStyle = `hsla(${hue},100%,80%,${0.13 + pulse * 0.23})`;
      ctx.lineWidth = 1.3;
      ctx.shadowBlur = 9;
      ctx.shadowColor = `hsl(${hue},100%,75%)`;
      ctx.stroke();
    }
  } else {
    const gradient = ctx.createLinearGradient(0, -17, 0, 17);
    gradient.addColorStop(0, `hsla(${string.hue + 35},100%,75%,0)`);
    gradient.addColorStop(0.5, `hsla(${string.hue},100%,72%,${0.15 + pulse * 0.22})`);
    gradient.addColorStop(1, `hsla(${string.hue - 40},100%,75%,0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, -12 - pulse * 8);
    ctx.quadraticCurveTo(length * 0.45, -22 - pulse * 14, length, -9);
    ctx.lineTo(length, 11);
    ctx.quadraticCurveTo(length * 0.45, 22 + pulse * 14, 0, 12 + pulse * 8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
