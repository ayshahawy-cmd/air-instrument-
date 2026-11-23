import './style.css';
import './dots.css';
import { SoundEngine, voices, type Voice } from './audio';
import { clamp, crossing, distance, type AirString, type Point } from './geometry';
import { Vision, type Hand } from './vision';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="site-shell">
    <header class="topbar">
      <a class="brand" href="#top" aria-label="Airloom home">airloom<span class="brand-dot">.</span></a>
      <nav class="topnav" aria-label="Main navigation"><a href="#play">Play</a><a href="#how">How it works</a><a href="#about">About</a><a id="github-link" href="https://github.com/ayshahawy-cmd/air-instrument-" target="_blank" rel="noreferrer">GitHub ↗</a></nav>
    </header>
    <main id="top">
      <section class="hero">
        <div class="hero-object" aria-hidden="true"><svg viewBox="0 0 160 160" fill="none"><defs><linearGradient id="ribbon" x1="20" y1="20" x2="140" y2="140"><stop stop-color="#fff"/><stop offset="1" stop-color="#a9e3dc"/></linearGradient></defs><circle cx="80" cy="80" r="64" fill="#fff" opacity=".045"/><path d="M26 49c35-22 72 21 108-2M20 80c38-27 81 28 120-2M27 111c36-22 73 20 107-2" stroke="url(#ribbon)" stroke-width="5" stroke-linecap="round"/><circle cx="26" cy="49" r="5" fill="#fff"/><circle cx="140" cy="78" r="5" fill="#fff"/><circle cx="134" cy="109" r="5" fill="#fff"/></svg></div>
        <h1>Introducing Airloom</h1>
        <p class="hero-copy">An instrument you draw in the air<br class="desktop-break" /> and play with your hands.</p>
        <div class="hero-actions"><a class="hero-cta" href="#play">Start playing</a><a class="hero-secondary" href="https://github.com/ayshahawy-cmd/air-instrument-" target="_blank" rel="noreferrer">Explore the code</a></div>
      </section>
      <section class="instrument" id="play" aria-label="Interactive instrument">
        <div class="instrument-top"><div class="instrument-title"><span class="tiny-orbit">✺</span> THE PLAYGROUND <span class="instrument-version">/ v1.0</span></div><div class="signal"><span id="signal-dot"></span><span id="signal-label">STANDBY</span></div></div>
        <div class="stage" id="stage">
          <div class="stage-grid"></div><div class="stage-vignette"></div>
          <canvas id="canvas" aria-label="Interactive strings"></canvas>
          <div class="stage-corner corner-a">A / 001</div><div class="stage-corner corner-b">LIVE CANVAS</div>
          <div class="stage-help" id="stage-help"></div>
          <div class="intro" id="intro">
            <div class="intro-symbol"><span>✳</span></div>
            <div class="intro-kicker">YOUR AIR. YOUR INSTRUMENT.</div>
            <h2>Ready to play?</h2>
            <p>Turn on your camera to make music with your hands,<br class="desktop-break" /> or explore with your mouse.</p>
            <div class="intro-actions"><button id="start-camera" class="button button-primary">✺ &nbsp; Start camera</button><button id="start-mouse" class="button button-secondary">Try with mouse <span>→</span></button></div>
            <small>Camera stays on your device. No account needed.</small>
          </div>
          <div class="toast" id="toast" role="status" aria-live="polite"></div>
        </div>
        <div class="instrument-bottom">
          <div class="mode-status"><span class="status-pulse"></span><span id="mode-status">Choose how to play</span></div>
          <div class="controls" id="controls" hidden>
            <button id="switch-camera" class="control-button" title="Use camera">CAMERA</button>
            <button id="switch-mouse" class="control-button" title="Use mouse">MOUSE</button>
            <button id="clear" class="control-button" title="Reset strings">RESET</button>
            <button id="sound" class="control-button" title="Mute or unmute sound">SOUND ON</button>
          </div>
          <span class="note-count"><span id="note-count">00</span> NOTES PLAYED</span>
        </div>
      </section>
      <section class="soundbar" aria-label="Choose a sound"><div class="soundbar-label">PICK A SOUND <span>↘</span></div><div class="sound-options" id="sound-options"></div></section>
      <section class="how" id="how"><h2>Get going with Airloom</h2><p class="how-lead">A little movement is all it takes. Make a string, shape its sound, and see where the music goes.</p><div class="how-grid">
        <article><div class="step-copy"><div class="step-num">01 / MAKE</div><h3>Draw a string.</h3><p>Pinch your fingers together and move your hand to pull a string through the air. With a mouse, click and drag.</p></div><div class="step-art art-draw" aria-hidden="true"><div class="art-line"></div><span class="art-point left"></span><span class="art-point right"></span></div></article>
        <article><div class="step-copy"><div class="step-num">02 / SHAPE</div><h3>Give it a note.</h3><p>Pinch or drag either end to tune the string. Shorter strings make brighter, higher notes.</p></div><div class="step-art art-shape" aria-hidden="true"><div class="art-line"></div><span class="art-point left"></span><span class="art-point right"></span><span class="art-orbit"></span></div></article>
        <article><div class="step-copy"><div class="step-num">03 / PLAY</div><h3>Let it sing.</h3><p>Swipe an index finger across a string to pluck it. Faster gestures make louder notes.</p></div><div class="step-art art-play" aria-hidden="true"><div class="art-line"></div><span class="art-point left"></span><span class="art-point right"></span><div class="art-wave">∿∿∿</div></div></article>
      </div></section>
      <section class="about" id="about"><div class="about-orb">✳</div><div><h2>Made to be played.<br />Made to be shared.</h2><p>Airloom uses on-device hand tracking and browser audio to turn everyday movements into a playful instrument. Camera frames stay in your browser. The code is open for anyone to explore and remix.</p><a href="https://github.com/ayshahawy-cmd/air-instrument-" target="_blank" rel="noreferrer">Explore on GitHub ↗</a></div></section>
    </main>
    <footer><span>airloom.</span><span>Make music out of thin air.</span><a href="#top">Back to top ↑</a></footer>
  </div>`;

const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const stage = get<HTMLDivElement>('stage');
const canvas = get<HTMLCanvasElement>('canvas');
const ctx = canvas.getContext('2d')!;
const vision = new Vision();
const sound = new SoundEngine();
const strings: AirString[] = [];
const lastPluck = new Map<number, number>();
const previousTips = new Map<string, Point>();
const handGestures = new Map<string, { kind: 'draw' | 'end'; start?: Point; string?: AirString; end?: 'a' | 'b' }>();
let draft: { a: Point; b: Point } | null = null;
let mouseGesture: { kind: 'draw' | 'end'; start?: Point; string?: AirString; end?: 'a' | 'b' } | null = null;
let previousMouse: Point | null = null;
let mode: 'intro' | 'mouse' | 'camera' = 'intro';
let voice: Voice = 'silk';
let width = 1;
let height = 1;
let nextId = 1;
let noteCount = 0;
let lastToastTimeout = 0;
let hands: Hand[] = [];
let cameraRequest = 0;

const handConnections = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];

function resize() {
  const rect = stage.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
new ResizeObserver(resize).observe(stage);
resize();

function toast(message: string) {
  const el = get<HTMLDivElement>('toast');
  el.textContent = message;
  el.classList.add('visible');
  window.clearTimeout(lastToastTimeout);
  lastToastTimeout = window.setTimeout(() => el.classList.remove('visible'), 3200);
}

function addString(a: Point, b: Point) {
  if (distance(a, b) < 0.1) return;
  strings.push({ id: nextId++, a: { ...a }, b: { ...b }, hue: voices.find(v => v.id === voice)!.hue + Math.random() * 24 - 12, pulse: 0, created: performance.now() });
  if (strings.length > 8) strings.shift();
  toast('String created — swipe through it to play');
}

function resetStrings() {
  strings.length = 0;
  addString({ x: 0.2, y: 0.38 }, { x: 0.78, y: 0.35 });
  addString({ x: 0.25, y: 0.53 }, { x: 0.73, y: 0.57 });
  addString({ x: 0.3, y: 0.7 }, { x: 0.67, y: 0.73 });
}

function nearestEndpoint(p: Point) {
  let found: { string: AirString; end: 'a' | 'b'; distance: number } | null = null;
  for (const string of strings) for (const end of ['a', 'b'] as const) {
    const d = distance(p, string[end]);
    if (d < 0.052 && (!found || d < found.distance)) found = { string, end, distance: d };
  }
  return found;
}

function pluck(from: Point, to: Point, now: number) {
  const speed = distance(from, to);
  if (speed < 0.018 || speed > 0.28) return;
  for (const string of strings) {
    if (now - (lastPluck.get(string.id) ?? 0) < 115) continue;
    const hit = crossing(from, to, string.a, string.b);
    if (!hit) continue;
    lastPluck.set(string.id, now);
    string.pulse = 1;
    noteCount++;
    get<HTMLSpanElement>('note-count').textContent = `${noteCount}`.padStart(2, '0');
    sound.play(distance(string.a, string.b), hit.position, speed, voice, (hit.position - 0.5) * 1.2);
  }
}

function pointerPoint(event: PointerEvent): Point {
  const rect = stage.getBoundingClientRect();
  return { x: clamp((event.clientX - rect.left) / rect.width, 0, 1), y: clamp((event.clientY - rect.top) / rect.height, 0, 1) };
}

stage.addEventListener('pointerdown', event => {
  if (mode !== 'mouse' || (event.target as HTMLElement).closest('button')) return;
  sound.ready().catch(() => toast('Sound could not start. Try tapping the page again.'));
  stage.setPointerCapture(event.pointerId);
  const p = pointerPoint(event);
  const endpoint = nearestEndpoint(p);
  mouseGesture = endpoint ? { kind: 'end', string: endpoint.string, end: endpoint.end } : { kind: 'draw', start: p };
  if (!endpoint) draft = { a: p, b: p };
  previousMouse = p;
});
stage.addEventListener('pointermove', event => {
  if (mode !== 'mouse') return;
  const p = pointerPoint(event);
  stage.style.cursor = mouseGesture ? 'grabbing' : nearestEndpoint(p) ? 'grab' : 'crosshair';
  if (mouseGesture?.kind === 'end' && mouseGesture.string && mouseGesture.end) mouseGesture.string[mouseGesture.end] = p;
  else if (mouseGesture?.kind === 'draw' && draft) draft.b = p;
  else if (previousMouse) pluck(previousMouse, p, performance.now());
  previousMouse = p;
});
function endMouse(event: PointerEvent) {
  if (mode !== 'mouse' || !mouseGesture) return;
  if (mouseGesture.kind === 'draw' && mouseGesture.start) addString(mouseGesture.start, pointerPoint(event));
  mouseGesture = null;
  draft = null;
}
stage.addEventListener('pointerup', endMouse);
stage.addEventListener('pointercancel', endMouse);
stage.addEventListener('pointerleave', () => { previousMouse = null; });

function videoPoint(p: Point): Point {
  const vw = vision.video.videoWidth || 1;
  const vh = vision.video.videoHeight || 1;
  const scale = Math.max(width / vw, height / vh);
  const scaledW = vw * scale;
  const scaledH = vh * scale;
  return { x: ((p.x * scaledW - (scaledW - width) / 2) / width), y: ((p.y * scaledH - (scaledH - height) / 2) / height) };
}

function updateHands(now: number) {
  const detected = vision.detect(now);
  if (!detected) return;
  hands = detected.map(hand => ({ ...hand, points: hand.points.map(videoPoint), tip: videoPoint(hand.tip), pinch: videoPoint(hand.pinch) }));
  const seen = new Set<string>();
  for (const hand of hands) {
    seen.add(hand.id);
    const gesture = handGestures.get(hand.id);
    if (hand.pinching) {
      if (!gesture) {
        const endpoint = nearestEndpoint(hand.pinch);
        handGestures.set(hand.id, endpoint ? { kind: 'end', string: endpoint.string, end: endpoint.end } : { kind: 'draw', start: { ...hand.pinch } });
      } else if (gesture.kind === 'end' && gesture.string && gesture.end) {
        gesture.string[gesture.end] = { ...hand.pinch };
      } else if (gesture.kind === 'draw' && gesture.start) {
        draft = { a: gesture.start, b: hand.pinch };
      }
    } else {
      if (gesture?.kind === 'draw' && gesture.start) addString(gesture.start, hand.pinch);
      handGestures.delete(hand.id);
      const previous = previousTips.get(hand.id);
      if (previous) pluck(previous, hand.tip, now);
    }
    previousTips.set(hand.id, hand.tip);
  }
  for (const [id, gesture] of handGestures) if (!seen.has(id)) {
    if (gesture.kind === 'draw' && gesture.start && draft) addString(gesture.start, draft.b);
    handGestures.delete(id);
  }
  for (const id of previousTips.keys()) if (!seen.has(id)) previousTips.delete(id);
  if (!hands.some(hand => hand.pinching)) draft = null;
  get<HTMLSpanElement>('mode-status').textContent = `${hands.length} hand${hands.length === 1 ? '' : 's'} detected · pinch to draw, swipe to play`;
}

function setMode(next: 'mouse' | 'camera') {
  mode = next;
  stage.style.cursor = next === 'mouse' ? 'crosshair' : 'default';
  stage.classList.toggle('camera-mode', next === 'camera');
  get<HTMLDivElement>('intro').hidden = true;
  get<HTMLDivElement>('controls').hidden = false;
  get<HTMLSpanElement>('signal-label').textContent = next === 'camera' ? 'CAMERA LIVE' : 'MOUSE MODE';
  get<HTMLSpanElement>('mode-status').textContent = next === 'camera' ? 'Show your hands · pinch to draw, swipe to play' : 'Drag to draw · move across a string to play';
  get<HTMLDivElement>('stage-help').textContent = next === 'camera' ? 'PINCH + DRAG TO DRAW  /  SWIPE TO PLAY' : 'DRAG TO DRAW  /  DRAG AN END TO TUNE';
  get<HTMLButtonElement>('switch-camera').classList.toggle('active', next === 'camera');
  get<HTMLButtonElement>('switch-mouse').classList.toggle('active', next === 'mouse');
  if (!strings.length) resetStrings();
}

async function startCamera() {
  const request = ++cameraRequest;
  const button = get<HTMLButtonElement>('start-camera');
  const switchButton = get<HTMLButtonElement>('switch-camera');
  button.disabled = true;
  switchButton.disabled = true;
  button.textContent = 'Loading camera…';
  try {
    await sound.ready();
    await vision.start();
    if (request !== cameraRequest) { vision.stop(); return; }
    if (!vision.video.parentElement) stage.prepend(vision.video);
    setMode('camera');
    toast('Camera ready — try pinching your fingers together');
  } catch (error) {
    if (request !== cameraRequest) return;
    const message = error instanceof Error ? error.message : 'Camera could not start.';
    toast(message.includes('Permission') || message.includes('NotAllowed') ? 'Camera access was denied. You can still play with your mouse.' : `${message} Try mouse mode.`);
  } finally {
    button.disabled = false;
    switchButton.disabled = false;
    button.innerHTML = '✺ &nbsp; Start camera';
  }
}

get<HTMLButtonElement>('start-camera').addEventListener('click', startCamera);
get<HTMLButtonElement>('start-mouse').addEventListener('click', async () => { ++cameraRequest; await sound.ready(); setMode('mouse'); toast('Move across a string to hear it sing'); });
get<HTMLButtonElement>('switch-camera').addEventListener('click', startCamera);
get<HTMLButtonElement>('switch-mouse').addEventListener('click', () => { ++cameraRequest; vision.stop(); hands = []; handGestures.clear(); setMode('mouse'); });
get<HTMLButtonElement>('clear').addEventListener('click', () => { strings.length = 0; draft = null; resetStrings(); toast('Starter strings restored'); });
get<HTMLButtonElement>('sound').addEventListener('click', event => { sound.muted = !sound.muted; (event.currentTarget as HTMLButtonElement).textContent = sound.muted ? 'SOUND OFF' : 'SOUND ON'; });

const soundOptions = get<HTMLDivElement>('sound-options');
for (const item of voices) {
  const button = document.createElement('button');
  button.className = `sound-option ${item.id === voice ? 'selected' : ''}`;
  button.innerHTML = `<span class="sound-icon" style="--hue:${item.hue}">✳</span><span><strong>${item.name}</strong><small>${item.description}</small></span>`;
  button.addEventListener('click', () => {
    voice = item.id;
    document.querySelectorAll('.sound-option').forEach(el => el.classList.remove('selected'));
    button.classList.add('selected');
    strings.forEach(string => { string.hue = item.hue; });
    toast(`${item.name} selected`);
  });
  soundOptions.append(button);
}

function drawString(string: AirString | { a: Point; b: Point; hue: number; pulse: number }, now: number, dashed = false) {
  const a = { x: string.a.x * width, y: string.a.y * height };
  const b = { x: string.b.x * width, y: string.b.y * height };
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const pulse = string.pulse;
  const hue = string.hue;
  const wobble = pulse * 12;
  ctx.save();
  ctx.lineCap = 'round';
  if (dashed) ctx.setLineDash([7, 9]);
  for (const [lineWidth, alpha, blur] of [[15, 0.09, 26], [5, 0.25, 13], [1.8, 0.92, 0]] as const) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    for (let i = 1; i <= 30; i++) {
      const t = i / 30;
      const offset = Math.sin(t * Math.PI) * Math.sin(t * Math.PI * 4 - now * 0.025) * wobble;
      ctx.lineTo(a.x + dx * t + nx * offset, a.y + dy * t + ny * offset);
    }
    ctx.strokeStyle = `hsla(${hue}, 100%, ${lineWidth < 2 ? 82 : 62}%, ${alpha})`;
    ctx.lineWidth = lineWidth;
    ctx.shadowColor = `hsl(${hue},100%,70%)`;
    ctx.shadowBlur = blur;
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const p of [a, b]) {
    ctx.beginPath(); ctx.arc(p.x, p.y, 11 + pulse * 5, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${hue},100%,80%,0.42)`; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(p.x, p.y, 4.1, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.shadowBlur = 17; ctx.shadowColor = `hsl(${hue},100%,75%)`; ctx.fill();
  }
  ctx.restore();
  string.pulse = Math.max(0, pulse - 0.022);
}

function drawHands(now: number) {
  for (const hand of hands) {
    ctx.save();
    ctx.strokeStyle = 'rgba(177,255,218,.5)';
    ctx.lineWidth = 1.4;
    for (const [a,b] of handConnections) {
      ctx.beginPath(); ctx.moveTo(hand.points[a].x * width, hand.points[a].y * height);
      ctx.lineTo(hand.points[b].x * width, hand.points[b].y * height); ctx.stroke();
    }
    for (const point of hand.points) {
      ctx.beginPath(); ctx.arc(point.x * width, point.y * height, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(210,255,235,.78)'; ctx.fill();
    }
    const p = hand.pinching ? hand.pinch : hand.tip;
    ctx.beginPath(); ctx.arc(p.x * width, p.y * height, hand.pinching ? 18 + Math.sin(now * .012) * 2 : 11, 0, Math.PI * 2);
    ctx.strokeStyle = hand.pinching ? '#d5ff8a' : '#a9fff0'; ctx.lineWidth = 2; ctx.shadowBlur = 20; ctx.shadowColor = ctx.strokeStyle; ctx.stroke();
    ctx.restore();
  }
}

function frame(now: number) {
  ctx.clearRect(0, 0, width, height);
  if (mode === 'camera') {
    try { updateHands(now); } catch { toast('Hand tracking paused. Try restarting the camera.'); vision.stop(); setMode('mouse'); }
  }
  if (mode !== 'intro') {
    const halo = ctx.createRadialGradient(width * .5, height * .5, 40, width * .5, height * .5, width * .65);
    halo.addColorStop(0, 'rgba(105,227,200,.055)'); halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo; ctx.fillRect(0, 0, width, height);
    for (const string of strings) drawString(string, now);
    if (draft) drawString({ ...draft, hue: voices.find(v => v.id === voice)!.hue, pulse: 0 }, now, true);
    if (mode === 'camera') drawHands(now);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.addEventListener('pagehide', () => { ++cameraRequest; vision.stop(); });
