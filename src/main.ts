import './style.css';
import './site.css';
import { SoundEngine, voices, type Voice } from './audio';
import { clamp, crossing, distance, type AirString, type Point } from './geometry';
import { midiForLength, noteName, type ScaleMode, type TuningMode } from './pitch';
import { drawVoiceVisual } from './visuals';
import { Vision, type Hand } from './vision';
import { PinchIntent } from './pinch';

const gestureIntro = new URL('./assets/gesture-intro.jpg', import.meta.url).href;
const gestureShape = new URL('./assets/gesture-shape.jpg', import.meta.url).href;
const gesturePlay = new URL('./assets/gesture-play.jpg', import.meta.url).href;

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
          <div class="stage-corner corner-a">A / 001</div><div class="stage-corner corner-b" id="active-note">LIVE CANVAS</div>
          <div class="stage-help" id="stage-help"></div>
          <div class="intro" id="intro">
            <div class="intro-symbol"><img src="${gestureIntro}" alt="" /></div>
            <div class="intro-kicker">YOUR AIR. YOUR INSTRUMENT.</div>
            <h2>Ready to play?</h2>
            <p>Pinch thumb and index finger, move your hand, then release.<br class="desktop-break" /> Or pinch with both hands and pull apart. Mouse works too.</p>
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
            <button id="undo" class="control-button" title="Remove the last string">UNDO</button>
            <button id="clear" class="control-button" title="Clear all strings">CLEAR</button>
            <button id="save-favorite" class="control-button" title="Save your favorite strings and sounds">SAVE FAVORITE</button>
            <button id="sound" class="control-button" title="Mute or unmute sound">SOUND ON</button>
            <button id="fullscreen" class="control-button" title="Toggle full screen">FULL SCREEN ⤢</button>
          </div>
          <span class="note-count"><span id="note-count">00</span> NOTES PLAYED</span>
        </div>
        <div class="play-settings" id="play-settings" hidden>
          <div class="setting-group"><span>TUNING</span><button id="tune-length" class="setting-button selected">Length</button><button id="tune-tension" class="setting-button">Tension</button></div>
          <div class="setting-group"><span>SCALE</span><button id="scale-major" class="setting-button selected">Major</button><button id="scale-minor" class="setting-button">Minor</button></div>
          <div class="setting-group"><span>MAKE A CHORD</span><button id="chord-1" class="setting-button">1</button><button id="chord-3" class="setting-button">3</button><button id="chord-6" class="setting-button">6</button></div>
          <span class="setting-hint">Optional presets · Clear leaves the canvas empty</span>
        </div>
        <div class="fullscreen-sounds" id="fullscreen-sounds" aria-label="Sounds in full screen"></div>
      </section>
      <div class="play-links"><button id="fullscreen-launch" type="button">Open full screen ↗</button><span>Play larger, with your camera or mouse.</span></div>
      <section class="strings-panel" id="strings-panel" hidden><div class="strings-heading"><strong>YOUR STRINGS</strong><span>Move an end to shorten it, or delete one below.</span></div><div class="strings-list" id="strings-list"></div></section>
      <section class="soundbar" aria-label="Choose a sound"><div class="soundbar-label">SOUND FOR NEW STRINGS <span>↘</span></div><div class="sound-options" id="sound-options"></div></section>
      <section class="favorites" id="favorites" hidden><div class="favorites-heading"><strong>YOUR FAVORITES</strong><span>Saved in this browser</span></div><div class="favorites-list" id="favorites-list"></div></section>
      <section class="how" id="how"><h2>Get going with Airloom</h2><p class="how-lead">A little movement is all it takes. Make a string, shape its sound, and see where the music goes.</p><div class="how-grid">
        <article><div class="step-copy"><div class="step-num">01 / MAKE</div><h3>Draw a string.</h3><p>Pinch your thumb and index finger, move your hand, then release. With a mouse, click and drag.</p></div><div class="step-art art-draw"><img src="${gestureIntro}" alt="A hand pinching a glowing turquoise string" loading="lazy" /></div></article>
        <article><div class="step-copy"><div class="step-num">02 / SHAPE</div><h3>Give it a note.</h3><p>Pinch or drag either end to tune the string. Shorter strings make brighter, higher notes.</p></div><div class="step-art art-shape"><img src="${gestureShape}" alt="A hand moving a glowing lavender string endpoint" loading="lazy" /></div></article>
        <article><div class="step-copy"><div class="step-num">03 / PLAY</div><h3>Let it sing.</h3><p>Swipe an index finger across a string to pluck it. Faster gestures make louder notes.</p></div><div class="step-art art-play"><img src="${gesturePlay}" alt="An index finger plucking a glowing string" loading="lazy" /></div></article>
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
const pinchIntents = new Map<string, PinchIntent>();
const handLastSeen = new Map<string, number>();
const endpointGestures = new Map<string, { string: AirString; end: 'a' | 'b' }>();
let cameraDraft: { handId: string; partnerId?: string; a: Point; b: Point } | null = null;
let draft: { a: Point; b: Point } | null = null;
let mouseGesture: { kind: 'draw' | 'end'; start?: Point; string?: AirString; end?: 'a' | 'b' } | null = null;
let previousMouse: Point | null = null;
let mode: 'intro' | 'mouse' | 'camera' = 'intro';
let selectedVoice: Voice | 'mix' = 'clean';
let tuningMode: TuningMode = 'length';
let scaleMode: ScaleMode = 'major';
let activeStringId: number | null = null;
let notePop: { text: string; x: number; y: number; at: number; hue: number } | null = null;
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

function pitchOf(string: AirString): number {
  return midiForLength(distance(string.a, string.b), string.voice, tuningMode, scaleMode) + (string.interval ?? 0);
}

function refreshNotes() {
  const active = strings.find(string => string.id === activeStringId);
  get<HTMLDivElement>('active-note').textContent = active ? `${noteName(pitchOf(active))} · ${voices.find(voice => voice.id === active.voice)?.name}` : 'LIVE CANVAS';
  for (const string of strings) sound.retune(string.id, pitchOf(string));
  renderStrings();
}

function addString(a: Point, b: Point) {
  if (distance(a, b) < 0.075) { toast('Move a little farther before releasing to make a string'); return; }
  const stringVoice = selectedVoice === 'mix' ? voices[(nextId - 1) % voices.length].id : selectedVoice;
  const created = { id: nextId++, a: { ...a }, b: { ...b }, voice: stringVoice, hue: voices.find(v => v.id === stringVoice)!.hue, pulse: 0, created: performance.now() };
  strings.push(created);
  if (strings.length > 6) strings.shift();
  activeStringId = created.id;
  refreshNotes();
  toast(`${voices.find(v => v.id === stringVoice)!.name} string created — swipe to play`);
}

function clearStrings() {
  strings.length = 0;
  activeStringId = null;
  notePop = null;
  get<HTMLDivElement>('active-note').textContent = 'LIVE CANVAS';
  draft = null;
  lastPluck.clear();
  noteCount = 0;
  get<HTMLSpanElement>('note-count').textContent = '00';
  clearCameraGestures();
  renderStrings();
}

function clearCameraGestures() {
  cameraDraft = null;
  endpointGestures.clear();
  pinchIntents.clear();
  handLastSeen.clear();
  previousTips.clear();
}

function nearestEndpoint(p: Point) {
  let found: { string: AirString; end: 'a' | 'b'; distance: number } | null = null;
  for (const string of strings) for (const end of ['a', 'b'] as const) {
    const d = distance(p, string[end]);
    if (d < 0.065 && (!found || d < found.distance)) found = { string, end, distance: d };
  }
  return found;
}

function pluck(from: Point, to: Point, now: number) {
  const speed = distance(from, to);
  if (speed < (mode === 'camera' ? 0.03 : 0.018) || speed > (mode === 'camera' ? 0.18 : 0.28)) return;
  for (const string of strings) {
    if (now - (lastPluck.get(string.id) ?? 0) < (mode === 'camera' ? 320 : 115)) continue;
    const hit = crossing(from, to, string.a, string.b);
    if (!hit) continue;
    lastPluck.set(string.id, now);
    string.pulse = 1;
    noteCount++;
    get<HTMLSpanElement>('note-count').textContent = `${noteCount}`.padStart(2, '0');
    const midi = pitchOf(string);
    activeStringId = string.id;
    get<HTMLDivElement>('active-note').textContent = `${noteName(midi)} · ${voices.find(voice => voice.id === string.voice)?.name}`;
    notePop = { text: noteName(midi), x: string.a.x + (string.b.x - string.a.x) * hit.position, y: string.a.y + (string.b.y - string.a.y) * hit.position, at: now, hue: string.hue };
    sound.play(string.id, midi, hit.position, speed, string.voice, (hit.position - 0.5) * 1.2);
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
  if (mouseGesture?.kind === 'end' && mouseGesture.string && mouseGesture.end) {
    const selectedString = mouseGesture.string;
    selectedString[mouseGesture.end] = p;
    activeStringId = selectedString.id;
    sound.retune(selectedString.id, pitchOf(selectedString));
    get<HTMLDivElement>('active-note').textContent = `${noteName(pitchOf(selectedString))} · ${voices.find(voice => voice.id === selectedString.voice)?.name}`;
  }
  else if (mouseGesture?.kind === 'draw' && draft) draft.b = p;
  else if (previousMouse) pluck(previousMouse, p, performance.now());
  previousMouse = p;
});
function endMouse(event: PointerEvent) {
  if (mode !== 'mouse' || !mouseGesture) return;
  if (mouseGesture.kind === 'draw' && mouseGesture.start) addString(mouseGesture.start, pointerPoint(event));
  if (mouseGesture.kind === 'end') refreshNotes();
  mouseGesture = null;
  draft = null;
}
stage.addEventListener('pointerup', endMouse);
stage.addEventListener('pointercancel', () => { mouseGesture = null; draft = null; });
stage.addEventListener('pointerleave', () => { previousMouse = null; });

function videoPoint(p: Point): Point {
  const vw = vision.video.videoWidth || 1;
  const vh = vision.video.videoHeight || 1;
  const scale = Math.max(width / vw, height / vh);
  const scaledW = vw * scale;
  const scaledH = vh * scale;
  return { x: ((p.x * scaledW - (scaledW - width) / 2) / width), y: ((p.y * scaledH - (scaledH - height) / 2) / height) };
}

function withinStage(p: Point) {
  return p.x >= 0.04 && p.x <= 0.96 && p.y >= 0.04 && p.y <= 0.96;
}

function smoothPoint(from: Point, to: Point): Point {
  return { x: from.x * 0.35 + to.x * 0.65, y: from.y * 0.35 + to.y * 0.65 };
}

function updateHands(now: number) {
  const detected = vision.detect(now);
  if (!detected) return;
  hands = detected.map(hand => ({ ...hand, points: hand.points.map(videoPoint), tip: videoPoint(hand.tip), pinch: videoPoint(hand.pinch) }));
  const seen = new Set<string>();
  for (const hand of hands) {
    seen.add(hand.id);
    handLastSeen.set(hand.id, now);
    let intent = pinchIntents.get(hand.id);
    if (!intent) {
      intent = new PinchIntent();
      pinchIntents.set(hand.id, intent);
    }
    const change = intent.update(hand.pinchRatio, hand.pinch, now);
    hand.pinching = intent.active;
    if (change.canceled) {
      endpointGestures.delete(hand.id);
      if (cameraDraft?.handId === hand.id || cameraDraft?.partnerId === hand.id) cameraDraft = null;
    }
    if (change.started) {
      const endpoint = nearestEndpoint(change.started);
      if (endpoint) endpointGestures.set(hand.id, { string: endpoint.string, end: endpoint.end });
      else if (withinStage(change.started)) {
        if (cameraDraft && cameraDraft.handId !== hand.id && !cameraDraft.partnerId) {
          cameraDraft.partnerId = hand.id;
          cameraDraft.b = { ...change.started };
        } else if (!cameraDraft) cameraDraft = { handId: hand.id, a: { ...change.started }, b: { ...change.started } };
      }
    }
    if (change.moved) {
      const endpoint = endpointGestures.get(hand.id);
      if (endpoint && withinStage(change.moved)) {
        endpoint.string[endpoint.end] = smoothPoint(endpoint.string[endpoint.end], change.moved);
        activeStringId = endpoint.string.id;
        sound.retune(endpoint.string.id, pitchOf(endpoint.string));
        get<HTMLDivElement>('active-note').textContent = `${noteName(pitchOf(endpoint.string))} · ${voices.find(voice => voice.id === endpoint.string.voice)?.name}`;
      }
      else if (cameraDraft && withinStage(change.moved)) {
        if (cameraDraft.partnerId === hand.id) cameraDraft.b = smoothPoint(cameraDraft.b, change.moved);
        else if (cameraDraft.handId === hand.id) {
          if (cameraDraft.partnerId) cameraDraft.a = smoothPoint(cameraDraft.a, change.moved);
          else cameraDraft.b = smoothPoint(cameraDraft.b, change.moved);
        }
      }
    }
    if (change.released) {
      if (cameraDraft?.handId === hand.id || cameraDraft?.partnerId === hand.id) {
        const { a, b } = cameraDraft;
        cameraDraft = null;
        addString(a, b);
      }
      if (endpointGestures.has(hand.id)) refreshNotes();
      endpointGestures.delete(hand.id);
    }
    if (!hand.pinching && !change.released && !change.canceled) {
      const previous = previousTips.get(hand.id);
      if (previous) pluck(previous, hand.tip, now);
      previousTips.set(hand.id, hand.tip);
    } else previousTips.delete(hand.id);
  }
  for (const id of pinchIntents.keys()) if (!seen.has(id)) {
    previousTips.delete(id);
    if (now - (handLastSeen.get(id) ?? 0) < 180) continue;
    pinchIntents.delete(id);
    handLastSeen.delete(id);
    endpointGestures.delete(id);
    if (cameraDraft?.handId === id || cameraDraft?.partnerId === id) cameraDraft = null;
  }
  get<HTMLSpanElement>('mode-status').textContent = cameraDraft
    ? cameraDraft.partnerId ? 'Drawing · pull both hands apart, then release' : 'Drawing · move your pinched hand, then release'
    : endpointGestures.size ? 'Shaping · move the endpoint to shorten or stretch'
    : hands.length ? 'Hand detected · pinch, move, and release to draw' : 'Show one hand · open, then pinch to draw';
}

function setMode(next: 'mouse' | 'camera') {
  mode = next;
  stage.style.cursor = next === 'mouse' ? 'crosshair' : 'default';
  stage.classList.toggle('camera-mode', next === 'camera');
  get<HTMLDivElement>('intro').hidden = true;
  get<HTMLDivElement>('controls').hidden = false;
  get<HTMLDivElement>('play-settings').hidden = false;
  get<HTMLSpanElement>('signal-label').textContent = next === 'camera' ? 'CAMERA LIVE' : 'MOUSE MODE';
  get<HTMLSpanElement>('mode-status').textContent = next === 'camera' ? 'Show one hand · open, then pinch to draw' : 'Drag to draw · move across a string to play';
  get<HTMLDivElement>('stage-help').textContent = next === 'camera' ? 'PINCH + MOVE + RELEASE TO DRAW  /  PINCH AN END TO SHORTEN' : 'DRAG TO DRAW  /  DRAG AN END TO TUNE';
  get<HTMLButtonElement>('switch-camera').classList.toggle('active', next === 'camera');
  get<HTMLButtonElement>('switch-mouse').classList.toggle('active', next === 'mouse');
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
    hands = [];
    clearCameraGestures();
    setMode('camera');
    toast('Camera ready — open one hand, pinch, move, then release');
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
get<HTMLButtonElement>('start-mouse').addEventListener('click', async () => { ++cameraRequest; await sound.ready(); setMode('mouse'); toast('Drag to draw your first string'); });
get<HTMLButtonElement>('switch-camera').addEventListener('click', startCamera);
get<HTMLButtonElement>('switch-mouse').addEventListener('click', () => { ++cameraRequest; vision.stop(); hands = []; clearCameraGestures(); setMode('mouse'); });
get<HTMLButtonElement>('undo').addEventListener('click', () => {
  const removed = strings.pop();
  if (!removed) { toast('No strings to undo'); return; }
  lastPluck.delete(removed.id);
  for (const [handId, gesture] of endpointGestures) if (gesture.string.id === removed.id) endpointGestures.delete(handId);
  activeStringId = strings.at(-1)?.id ?? null;
  refreshNotes();
  toast('Last string removed');
});
get<HTMLButtonElement>('clear').addEventListener('click', () => { clearStrings(); toast('Canvas cleared — draw your own strings'); });
get<HTMLButtonElement>('sound').addEventListener('click', event => { sound.muted = !sound.muted; (event.currentTarget as HTMLButtonElement).textContent = sound.muted ? 'SOUND OFF' : 'SOUND ON'; });

const soundOptions = get<HTMLDivElement>('sound-options');
const soundButtons = new Map<Voice | 'mix', HTMLButtonElement>();
const fullSoundButtons = new Map<Voice | 'mix', HTMLButtonElement>();
for (const item of [{ id: 'mix' as const, name: 'Mix', description: 'a new sound for each string', hue: 172 }, ...voices]) {
  const button = document.createElement('button');
  button.className = `sound-option ${item.id === selectedVoice ? 'selected' : ''}`;
  button.innerHTML = `<span class="sound-icon" style="--hue:${item.hue}">✳</span><span><strong>${item.name}</strong><small>${item.description}</small></span>`;
  button.addEventListener('click', () => {
    selectSound(item.id, true);
    toast(`${item.name} selected${item.id === 'mix' ? ' for new strings' : ' · active string updated'}`);
  });
  soundButtons.set(item.id, button);
  soundOptions.append(button);
  const fullButton = document.createElement('button');
  fullButton.className = `full-sound-button ${item.id === selectedVoice ? 'selected' : ''}`;
  fullButton.textContent = item.name;
  fullButton.addEventListener('click', () => selectSound(item.id, true));
  fullSoundButtons.set(item.id, fullButton);
  get<HTMLDivElement>('fullscreen-sounds').append(fullButton);
}

function selectSound(next: Voice | 'mix', applyToActive = false) {
  selectedVoice = next;
  for (const [id, button] of soundButtons) button.classList.toggle('selected', id === next);
  for (const [id, button] of fullSoundButtons) button.classList.toggle('selected', id === next);
  if (applyToActive && next !== 'mix') {
    const active = strings.find(string => string.id === activeStringId);
    if (active) {
      active.voice = next;
      active.hue = voices.find(voice => voice.id === next)!.hue;
      refreshNotes();
    }
  }
}

function setTuning(next: TuningMode) {
  tuningMode = next;
  get<HTMLButtonElement>('tune-length').classList.toggle('selected', next === 'length');
  get<HTMLButtonElement>('tune-tension').classList.toggle('selected', next === 'tension');
  refreshNotes();
  toast(next === 'length' ? 'Length mode · shorter strings play higher' : 'Tension mode · longer strings play higher');
}

function setScale(next: ScaleMode) {
  scaleMode = next;
  get<HTMLButtonElement>('scale-major').classList.toggle('selected', next === 'major');
  get<HTMLButtonElement>('scale-minor').classList.toggle('selected', next === 'minor');
  refreshNotes();
  toast(`${next === 'major' ? 'Major' : 'Minor'} pentatonic scale`);
}

function makeChord(count: 1 | 3 | 6) {
  if (mode === 'intro') { toast('Start camera or mouse first'); return; }
  clearCameraGestures();
  strings.length = 0;
  lastPluck.clear();
  const intervals = count === 1 ? [0] : count === 3 ? [0, 7, 12] : [0, 4, 7, 12, 16, 19];
  intervals.forEach((interval, index) => {
    const voice = selectedVoice === 'mix' ? voices[index % voices.length].id : selectedVoice;
    const spread = count === 1 ? 0 : count === 3 ? 0.16 : 0.115;
    const y = 0.5 + (index - (count - 1) / 2) * spread;
    strings.push({ id: nextId++, a: { x: 0.2, y }, b: { x: 0.8, y: y - 0.025 }, voice, hue: voices.find(item => item.id === voice)!.hue, pulse: 0, interval, created: performance.now() });
  });
  activeStringId = strings[0]?.id ?? null;
  refreshNotes();
  toast(`${count} string${count === 1 ? '' : 's'} ready · swipe to play`);
}

get<HTMLButtonElement>('tune-length').addEventListener('click', () => setTuning('length'));
get<HTMLButtonElement>('tune-tension').addEventListener('click', () => setTuning('tension'));
get<HTMLButtonElement>('scale-major').addEventListener('click', () => setScale('major'));
get<HTMLButtonElement>('scale-minor').addEventListener('click', () => setScale('minor'));
for (const count of [1, 3, 6] as const) get<HTMLButtonElement>(`chord-${count}`).addEventListener('click', () => makeChord(count));

const instrument = get<HTMLElement>('play');
function isFullScreen() { return document.fullscreenElement === instrument || instrument.classList.contains('fullscreen-fallback'); }
function useFullScreenFallback() {
  instrument.classList.add('fullscreen-fallback');
  document.body.classList.add('fullscreen-body');
  updateFullScreenButtons();
}
async function toggleFullScreen() {
  if (document.fullscreenElement === instrument) { await document.exitFullscreen(); return; }
  if (instrument.classList.contains('fullscreen-fallback')) { instrument.classList.remove('fullscreen-fallback'); document.body.classList.remove('fullscreen-body'); updateFullScreenButtons(); return; }
  try {
    if (instrument.requestFullscreen) await instrument.requestFullscreen();
    else useFullScreenFallback();
  } catch { useFullScreenFallback(); }
}
function updateFullScreenButtons() {
  const active = isFullScreen();
  get<HTMLButtonElement>('fullscreen').textContent = active ? 'EXIT FULL SCREEN ↙' : 'FULL SCREEN ⤢';
  get<HTMLButtonElement>('fullscreen-launch').textContent = active ? 'Exit full screen ↙' : 'Open full screen ↗';
}
document.addEventListener('fullscreenchange', updateFullScreenButtons);
get<HTMLButtonElement>('fullscreen').addEventListener('click', toggleFullScreen);
get<HTMLButtonElement>('fullscreen-launch').addEventListener('click', toggleFullScreen);

function strum() {
  strings.forEach((string, index) => window.setTimeout(() => {
    if (!strings.some(item => item.id === string.id)) return;
    const midi = pitchOf(string);
    string.pulse = 1;
    activeStringId = string.id;
    get<HTMLDivElement>('active-note').textContent = `${noteName(midi)} · ${voices.find(voice => voice.id === string.voice)?.name}`;
    notePop = { text: noteName(midi), x: (string.a.x + string.b.x) / 2, y: (string.a.y + string.b.y) / 2, at: performance.now(), hue: string.hue };
    sound.play(string.id, midi, 0.5, 0.12, string.voice, (index - (strings.length - 1) / 2) * 0.22);
    noteCount++;
    get<HTMLSpanElement>('note-count').textContent = `${noteCount}`.padStart(2, '0');
  }, index * 65));
}

window.addEventListener('keydown', event => {
  if (event.metaKey || event.ctrlKey || event.altKey || event.repeat || mode === 'intro') return;
  const element = event.target as HTMLElement;
  if (element.matches('input, textarea, select, [contenteditable="true"]')) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    const current = selectedVoice === 'mix' ? 0 : voices.findIndex(voice => voice.id === selectedVoice);
    selectSound(voices[(current + (event.key === 'ArrowRight' ? 1 : voices.length - 1)) % voices.length].id, true);
  } else if (event.key === '1' || event.key === '3' || event.key === '6') makeChord(Number(event.key) as 1 | 3 | 6);
  else if (event.key.toLowerCase() === 't') setTuning(tuningMode === 'length' ? 'tension' : 'length');
  else if (event.key.toLowerCase() === 'm') setScale(scaleMode === 'major' ? 'minor' : 'major');
  else if (event.key.toLowerCase() === 'c') { clearStrings(); toast('Canvas cleared'); }
  else if (event.key === 'Backspace') { event.preventDefault(); get<HTMLButtonElement>('undo').click(); }
  else if (event.key === ' ') { event.preventDefault(); strum(); }
  else if (event.key.toLowerCase() === 'f') toggleFullScreen();
});

function renderStrings() {
  const section = get<HTMLElement>('strings-panel');
  const list = get<HTMLDivElement>('strings-list');
  section.hidden = strings.length === 0;
  list.replaceChildren();
  strings.forEach((string, index) => {
    const row = document.createElement('div');
    row.className = 'string-row';
    const name = document.createElement('button');
    name.className = 'string-name';
    name.innerHTML = `<i style="--hue:${string.hue}"></i> String ${index + 1} · ${noteName(pitchOf(string))} · ${voices.find(item => item.id === string.voice)?.name ?? 'Sound'}`;
    name.title = 'Select this string to change its sound';
    name.classList.toggle('active', string.id === activeStringId);
    name.addEventListener('click', () => { activeStringId = string.id; refreshNotes(); });
    const remove = document.createElement('button');
    remove.className = 'string-remove';
    remove.textContent = 'Delete';
    remove.setAttribute('aria-label', `Delete string ${index + 1}`);
    remove.addEventListener('click', () => {
      const position = strings.findIndex(item => item.id === string.id);
      if (position < 0) return;
      strings.splice(position, 1);
      lastPluck.delete(string.id);
      for (const [handId, gesture] of endpointGestures) if (gesture.string.id === string.id) endpointGestures.delete(handId);
      if (activeStringId === string.id) activeStringId = strings.at(-1)?.id ?? null;
      refreshNotes();
      toast('String deleted');
    });
    row.append(name, remove);
    list.append(row);
  });
}
renderStrings();

type SavedString = Pick<AirString, 'a' | 'b' | 'voice' | 'interval'>;
type Favorite = { id: string; savedAt: number; selectedVoice: Voice | 'mix'; tuningMode?: TuningMode; scaleMode?: ScaleMode; strings: SavedString[] };
const favoriteKey = 'airloom.favorites.v1';
const isVoice = (value: unknown): value is Voice => voices.some(item => item.id === value);
const normalizeVoice = (value: unknown): Voice | null => value === 'silk' ? 'clean' : value === 'starlight' ? 'synth' : isVoice(value) ? value : null;
const isPoint = (value: unknown): value is Point =>
  !!value && typeof value === 'object' &&
  Number.isFinite((value as Point).x) && Number.isFinite((value as Point).y) &&
  (value as Point).x >= 0 && (value as Point).x <= 1 &&
  (value as Point).y >= 0 && (value as Point).y <= 1;
function readFavorites(): Favorite[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(favoriteKey) ?? '[]');
    if (!Array.isArray(data)) return [];
    const parsed: Favorite[] = [];
    for (const item of data) {
      if (!item || typeof item.id !== 'string' || !Number.isFinite(item.savedAt) || !Array.isArray(item.strings) || item.strings.length > 6) continue;
      const selected = item.selectedVoice === 'mix' ? 'mix' : normalizeVoice(item.selectedVoice);
      if (!selected) continue;
      const saved: SavedString[] = [];
      for (const string of item.strings) {
        const voice = normalizeVoice(string?.voice);
        if (!voice || !isPoint(string?.a) || !isPoint(string?.b)) break;
        saved.push({ a: string.a, b: string.b, voice, interval: Number.isFinite(string.interval) && Math.abs(string.interval) <= 24 ? string.interval : undefined });
      }
      if (saved.length !== item.strings.length) continue;
      parsed.push({ id: item.id, savedAt: item.savedAt, selectedVoice: selected, strings: saved,
        tuningMode: item.tuningMode === 'tension' ? 'tension' : 'length', scaleMode: item.scaleMode === 'minor' ? 'minor' : 'major' });
      if (parsed.length === 8) break;
    }
    return parsed;
  } catch { return []; }
}
let favorites = readFavorites();
function persistFavorites() {
  try { localStorage.setItem(favoriteKey, JSON.stringify(favorites)); return true; }
  catch { toast('This browser could not save favorites'); return false; }
}
function renderFavorites() {
  const section = get<HTMLElement>('favorites');
  const list = get<HTMLDivElement>('favorites-list');
  section.hidden = favorites.length === 0;
  list.replaceChildren();
  for (const favorite of favorites) {
    const row = document.createElement('div');
    row.className = 'favorite-row';
    const load = document.createElement('button');
    load.className = 'favorite-load';
    const names = [...new Set(favorite.strings.map(string => voices.find(item => item.id === string.voice)!.name))];
    const title = favorite.strings.length ? `${favorite.strings.length} string${favorite.strings.length === 1 ? '' : 's'}` : `${voices.find(item => item.id === favorite.selectedVoice)?.name ?? 'Mix'} sound`;
    load.textContent = `${title} · ${names.join(', ') || 'Sound preset'}  ↗`;
    load.title = 'Load this favorite';
    load.addEventListener('click', async () => {
      try { await sound.ready(); } catch { toast('Sound could not start'); return; }
      if (mode === 'intro') setMode('mouse');
      clearCameraGestures();
      strings.length = 0;
      for (const saved of favorite.strings) {
        const item = voices.find(v => v.id === saved.voice)!;
        strings.push({ id: nextId++, a: { ...saved.a }, b: { ...saved.b }, voice: saved.voice, hue: item.hue, pulse: 0, interval: saved.interval, created: performance.now() });
      }
      activeStringId = strings[0]?.id ?? null;
      setTuning(favorite.tuningMode ?? 'length');
      setScale(favorite.scaleMode ?? 'major');
      selectSound(favorite.selectedVoice);
      refreshNotes();
      toast('Favorite loaded');
      stage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    const remove = document.createElement('button');
    remove.className = 'favorite-remove';
    remove.textContent = '×';
    remove.title = 'Remove this favorite';
    remove.setAttribute('aria-label', `Remove favorite: ${title}`);
    remove.addEventListener('click', () => {
      favorites = favorites.filter(item => item.id !== favorite.id);
      if (persistFavorites()) renderFavorites();
    });
    row.append(load, remove);
    list.append(row);
  }
}
get<HTMLButtonElement>('save-favorite').addEventListener('click', () => {
  if (!strings.length && selectedVoice === 'mix') { toast('Draw a string or choose a sound first'); return; }
  favorites.unshift({
    id: `${Date.now()}-${Math.random()}`,
    savedAt: Date.now(),
    selectedVoice,
    tuningMode,
    scaleMode,
    strings: strings.map(string => ({ a: { ...string.a }, b: { ...string.b }, voice: string.voice, interval: string.interval })),
  });
  favorites = favorites.slice(0, 8);
  if (persistFavorites()) { renderFavorites(); toast('Favorite saved on this device'); }
});
renderFavorites();

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
  if ('voice' in string && !dashed) drawVoiceVisual(ctx, string, now, width, height);
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
  if ('voice' in string && !dashed) {
    ctx.font = '600 13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    const labelX = (a.x + b.x) / 2 + nx * 23;
    const labelY = (a.y + b.y) / 2 + ny * 23;
    ctx.strokeStyle = 'rgba(4,8,10,.85)';
    ctx.fillStyle = 'rgba(255,255,255,.88)';
    const label = noteName(pitchOf(string));
    ctx.strokeText(label, labelX, labelY);
    ctx.fillText(label, labelX, labelY);
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
    ctx.strokeStyle = hand.pinching ? '#f5f9f4' : '#a9fff0'; ctx.lineWidth = 2; ctx.shadowBlur = 20; ctx.shadowColor = ctx.strokeStyle; ctx.stroke();
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
    const previewVoice = selectedVoice === 'mix' ? voices[(nextId - 1) % voices.length] : voices.find(v => v.id === selectedVoice)!;
    if (draft && distance(draft.a, draft.b) > 0.04) drawString({ ...draft, hue: previewVoice.hue, pulse: 0 }, now, true);
    if (cameraDraft && distance(cameraDraft.a, cameraDraft.b) > 0.025)
      drawString({ a: cameraDraft.a, b: cameraDraft.b, hue: previewVoice.hue, pulse: 0 }, now, true);
    if (notePop) {
      const remaining = 1 - (now - notePop.at) / 850;
      if (remaining <= 0) notePop = null;
      else {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = `700 ${20 + (1 - remaining) * 10}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        ctx.fillStyle = `hsla(${notePop.hue},100%,82%,${remaining})`;
        ctx.shadowColor = `hsl(${notePop.hue},100%,75%)`;
        ctx.shadowBlur = 17;
        ctx.fillText(notePop.text, notePop.x * width, notePop.y * height - 30 - (1 - remaining) * 20);
        ctx.restore();
      }
    }
    if (mode === 'camera') drawHands(now);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.addEventListener('pagehide', () => { ++cameraRequest; vision.stop(); });
